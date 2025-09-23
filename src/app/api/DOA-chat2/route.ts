// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import pg from "pg";
import { createClient } from "@/lib/supabase/server";
import { getDOARetriever } from "@/lib/doa_retriever";
import { getDOA_Main_Retriever } from "@/lib/doa_main_retriever";
import { z } from "zod";
import crypto from "crypto";

/** =========================
 *  1) Config & Singletons
 *  ========================= */
// ป้องกันการสร้าง pg.Pool ต่อ request → ใช้ module-scope singleton
const pool = new pg.Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  // ไล่ timeout ให้เหมาะกับ serverless (ถ้าใช้)
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});

// สร้าง ChatOpenAI ไว้ระดับโมดูล (ปลอดภัย/ไม่มี per-user state)
const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
  maxTokens: 1500,
  cache: true,
});

// Zod schema สำหรับ body
const BodySchema = z.object({
  messages: z
    .array(
      z.object({


        role: z.enum(["user", "assistant", "system"]).optional(),
        content: z.string(),
      })
    )
    .default([]),
  sessionId: z.string().optional(),
});

// type message ที่ใช้จริง
type ChatMessage = z.infer<typeof BodySchema>["messages"][number];

/** =========================
 *  2) Utilities
 *  ========================= */

// จำกัดความยาว context แบบง่าย (ป้องกัน prompt ยาวเกิน/ token ระเบิด)
function clampText(input: string, maxChars: number) {
  if (input.length <= maxChars) return input;
  // รักษาต้นท้ายบางส่วนเพื่อคงความหมาย
  const head = Math.floor(maxChars * 0.6);
  const tail = Math.floor(maxChars * 0.3);
  return `${input.slice(0, head)}\n...\n${input.slice(-tail)}`;
}

function sanitizeCurlyBraces(input: string) {
  return input.replace(/[{}]/g, "");
}

// สร้าง/บังคับใช้ sessionId ที่เสถียร
function resolveSessionId(opts: {
  userId?: string;
  current?: string;
}): { sessionId: string; isNew: boolean; updated: boolean } {
  const { userId, current } = opts;

  // มี user → ผูกกับ userId (ยืนยาว)
  if (userId) {
    const updated = current !== userId;
    return { sessionId: userId, isNew: false, updated };
  }

  // anonymous → ใช้ widget_* + อายุ 1 วัน
  const ONE_DAY = 86_400_000;
  if (current && current.startsWith("widget_")) {
    const [, tsBase36] = current.split("_");
    const ts = parseInt(tsBase36 || "0", 36);
    if (Number.isFinite(ts) && Date.now() - ts < ONE_DAY) {
      return { sessionId: current, isNew: false, updated: false };
    }
  }

  // สร้างใหม่
  const timestamp = Date.now().toString(36);
  const rand = crypto.randomBytes(8).toString("base64url");
  const sessionId = `widget_${timestamp}_${rand}`;
  return { sessionId, isNew: true, updated: true };
}

// ห่อ history ด้วย singleton pool
function getHistory(sessionId: string) {
  return new PostgresChatMessageHistory({
    sessionId,
    tableName: "langchain_chat_history",
    pool,
  });
}

// เพิ่มชุดคำพ้อง (synonyms) ที่ต้องการ
const SYNONYM_SETS = [
  {
    triggers: ["อบรม", "ฝึกอบรม", "การอบรม", "การฝึกอบรม", "training", "l&d"],
    expand: [
      "training",
      "training expenses",
    ],
  },
   {
    triggers: ["เบี้ยเลี้ยง","ค่าที่พัก","ค่าเดินทาง","per diem","reimbursement"],
    expand: [
      "Reimbursement for Per Diem",
      "Lodging and Travelling expenses",
    ],
  },
];

// ฟังก์ชันขยายคำถามด้วย synonyms
function expandWithSynonyms(q: string) {
  const lc = (q ?? "").toLowerCase();
  const bag = new Set<string>();
  for (const set of SYNONYM_SETS) {
    if (set.triggers.some((t) => lc.includes(t))) {
      set.expand.forEach((e) => bag.add(e));
    }
  }
  if (bag.size === 0) return q;
  return `${q} ${Array.from(bag).join(" ")}`;
}

/** =========================
 *  3) Route Handler
 *  ========================= */

export async function POST(req: NextRequest) {
  try {
    // 3.1 ตรวจ auth
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    // 3.2 parse body (validate)
    const raw = await req.json();
    const body = BodySchema.parse(raw);
    const messages: ChatMessage[] = body.messages;

    // 3.3 resolve session
    const { sessionId, isNew, updated } = resolveSessionId({
      userId,
      current: body.sessionId,
    });

    // Greeting (ไม่มีข้อความเลย)
    if (messages.length === 0) {
      return NextResponse.json({
        content: `DOA Chatbot ช่วยให้ข้อมูลเกี่ยวกับนโยบายและขั้นตอนการอนุมัติ (DOA Cash)
คุณสามารถเลือกหัวข้อที่สนใจ หรือถามคำถามเฉพาะเจาะจงเพิ่มเติมได้

1. EMPLOYEE BENEFITS ผลประโยชน์พนักงาน
2. GENERAL ADMIN EXPENSES ค่าใช้จ่ายธุรการทั่วไป
3. FINANCE & ACCOUNTING การเงินและบัญชี
4. SALES & MARKETING EXPENSES ค่าใช้จ่ายทางการขายและการตลาด
5. CAPEX INVESTMENT (Purchase/Rent/Lease) การลงทุนโครงการต่างๆ (ซื้อ/เช่า/เช่าซื้อ)
6. PROCUREMENT การจัดซื้อจัดจ้าง
7. SUPPLY & FG REQUISITION (LOGISTICS) การเบิกจ่ายพัสดุและสินค้าสำเร็จรูป (Logistics)
8. IMPORT & EXPORT (SHIPPING) การนำเข้าและส่งออกสินค้า (Shipping)
9. LOAN TO OR BETWEEN SUBSIDIARY COMPANY การให้เงินกู้ยืมแก่หรือระหว่างบริษัทย่อย
10. CORPORATE DOCUMENTS COMMUNICATED TO OUTSIDERS การเผยแพร่เอกสารของบริษัทให้กับบุคคลภายนอก

รายละเอียดเพิ่มเติม: https://doa.toagroup.com/doa`,
        type: "text",
        timestamp: new Date().toISOString(),
        sessionId,
        isNewSession: isNew,
        sessionUpdated: updated,
      });
    }

    const lastUserMessage = messages[messages.length - 1]?.content ?? "";

    const expandedQuestion = expandWithSynonyms(lastUserMessage);
    if (expandedQuestion !== lastUserMessage) {
      console.log("Expanded with synonyms:", expandedQuestion);
    }
    console.log("Expanded with synonyms:", expandedQuestion);

    /** 3.4 RAG: ดึง context (ลด await ซ้ำ ๆ, ทำงานขนาน) */
    const [doaRetriever, doaMainRetriever] = await Promise.all([
      getDOARetriever(),
      getDOA_Main_Retriever(),
    ]);


    // เรียก parallel
    const [docs, mainDocs] = await Promise.all([
      doaRetriever.invoke(expandedQuestion),
      doaMainRetriever.invoke(expandedQuestion),
    ]);
    console.log("🔍 Retrieved docs:", docs);
    console.log("🔍 Retrieved main docs:", mainDocs);
    

    // 🔧 สร้าง context ที่รวม content + metadata แต่ละ doc
    const processedDocs = docs.slice(0, 5).map(doc => ({
      content: sanitizeCurlyBraces(clampText(doc.pageContent, 2000)),
      metadata: {
        no: doc.metadata["No."] || "",
        category: doc.metadata["Category"] || "",
        businessActivity: doc.metadata["Business Activity"] || "",
        group: doc.metadata["group"] || "",
        remarks: doc.metadata["remarks"] || "",
        formUrl: doc.metadata["form_url"] || "",
        coApproval: doc.metadata["co_approval"] || "",
        approvalDetails: doc.metadata["approval_details"] || {},
        subGroup: doc.metadata["sub group"] || "",
        note: doc.metadata["note"] || ""
      }
    }));


    // 🔧 สร้าง detailed context ที่ content + metadata อยู่ด้วยกัน
    const ctxDetail = processedDocs.map(doc => {
      let contextText = `--- เอกสารที่ ${doc.metadata.no} ---\n`;
      contextText += `หมวด: ${doc.metadata.category}\n`;
      contextText += `กิจกรรม: ${doc.metadata.businessActivity}\n`;
      contextText += `กลุ่ม: ${doc.metadata.group}\n`;
      
      // แสดงสิทธิการอนุมัติ
      if (doc.metadata.approvalDetails && Object.keys(doc.metadata.approvalDetails).length > 0) {
        contextText += `\nสิทธิการอนุมัติ:\n`;
        Object.entries(doc.metadata.approvalDetails).forEach(([position, authority]) => {
          if (authority && authority !== "ไม่ระบุ" && authority.toString().trim() !== "") {
            contextText += `• ${position}: ${authority}\n`;
          }
        });
      }
      
      // ข้อมูลเพิ่มเติม
      if (doc.metadata.coApproval && doc.metadata.coApproval !== "ไม่มี") {
        contextText += `Co Approval: ${doc.metadata.coApproval}\n`;
      }
      if (doc.metadata.remarks && doc.metadata.remarks !== "ไม่มี" && doc.metadata.remarks !== "-") {
        contextText += `หมายเหตุ: ${doc.metadata.remarks}\n`;
      }
      if (doc.metadata.formUrl && doc.metadata.formUrl !== "-" && doc.metadata.formUrl !== "ไม่มี") {
        contextText += `Form URL: ${doc.metadata.formUrl}\n`;
      }
      if (doc.metadata.note && doc.metadata.note !== "-" && doc.metadata.note !== "ไม่มี") {
        contextText += `Note: ${doc.metadata.note}\n`;
      }
      
      contextText += `\nรายละเอียด: ${doc.content}\n`;
      return contextText;
    }).join("\n\n");

    // Main context (ภาพรวม)
    const ctxMain = sanitizeCurlyBraces(
      clampText(mainDocs.map(d => d.pageContent).join("\n\n"), 8_000)
    );

    // Sanitize final context
    const finalCtxDetail = sanitizeCurlyBraces(clampText(ctxDetail, 12_000));

    // ลด noisy log + ไม่ log เนื้อหา (ป้องกันข้อมูลอ่อนไหว)
    // if (process.env.NODE_ENV !== "production") {
    //   console.log("🔑 sessionId:", sessionId);
    //   console.log("🔎 query:", lastUserMessage.slice(0, 200));
    //   console.log("📄 ctxDetailLen:", finalCtxDetail.length, "ctxMainLen:", ctxMain.length);
    //   console.log("📋 processedDocs count:", processedDocs.length);
    //   console.log("🔍 sample doc metadata:", processedDocs[0]?.metadata?.no ? {
    //     no: processedDocs[0].metadata.no,
    //     category: processedDocs[0].metadata.category.substring(0, 50)
    //   } : "No metadata");
    // }

    /** 3.5 Prompt */
    const SYSTEM_PROMPT = `
คุณคือ AI Chatbot ผู้เชี่ยวชาญด้านนโยบายและขั้นตอนการอนุมัติ (DOA Cash)  

คุณมีข้อมูล 2 ชุดเพื่อใช้ในการตอบคำถาม:  
- ชุดที่ 1 = ข้อมูลหัวข้อหลัก/ภาพรวม: ${ctxMain}  
- ชุดที่ 2 = ข้อมูลรายละเอียด (รวม metadata ในแต่ละเอกสาร): ${finalCtxDetail}  

## กติกาการตอบ:
1. ใช้ข้อมูลจากชุดที่ 2 เป็นหลัก เพราะมี metadata ครบถ้วน
2. แสดงหมายเลขเอกสาร (No.) เสมอ เช่น "หัวข้อ 1.1 การตรวจสอบเพื่อเสนออนุมัติ..."
3. แสดงสิทธิการอนุมัติตามที่ระบุใน metadata แต่ละเอกสาร

จัดรูปแบบคำตอบ:
- หัวข้อหลัก พร้อมเลข No.
- สิทธิการอนุมัติ (ใช้จาก metadata)
- หมายเหตุ (ถ้ามี)
- co_approval (ถ้ามี)  
- Form URL (ถ้ามี)
- Note (ถ้ามี)


`.trim();

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", SYSTEM_PROMPT],
      new MessagesPlaceholder("history"),
      ["user", "{input}"],
    ]);

    const chain = prompt.pipe(model);

    const chainWithHistory = new RunnableWithMessageHistory({
      runnable: chain,
      getMessageHistory: (sid) => getHistory(sid),
      inputMessagesKey: "input",
      historyMessagesKey: "history",
    });

    /** 3.6 Invoke LLM */
    const response = await chainWithHistory.invoke(
      { input: lastUserMessage },
      { configurable: { sessionId } }
    );

    // 🔧 แยกเอา USED_DOC ออกจาก response
    const responseContent = response.content.toString();
    const usedDocMatch = responseContent.match(/\[USED_DOC:\s*([^\]]+)\]/);
    const usedDocNo = usedDocMatch ? usedDocMatch[1].trim() : null;
    
    // ลบ [USED_DOC: ...] ออกจากคำตอบที่แสดงให้ผู้ใช้
    const cleanContent = responseContent.replace(/\[USED_DOC:[^\]]+\]/g, '').trim();
    
    // หาเอกสารที่ใช้จาก usedDocNo
    const usedDoc = usedDocNo ? 
      processedDocs.find(doc => doc.metadata.no === usedDocNo) : 
      processedDocs[0];

    console.log("🎯 AI used document:", usedDocNo || "ไม่ระบุ");

    return NextResponse.json({
      content: cleanContent,
      type: "text",
      timestamp: new Date().toISOString(),
      sessionId,
      isNewSession: isNew,
      sessionUpdated: updated,
      // 🔧 ส่ง metadata เฉพาะเอกสารที่ AI ใช้ตอบจริง
      metadata: {
        usedDocument: usedDoc ? {
          no: usedDoc.metadata.no,
          category: usedDoc.metadata.category,
          businessActivity: usedDoc.metadata.businessActivity,
          group: usedDoc.metadata.group,
          remarks: usedDoc.metadata.remarks,
          formUrl: usedDoc.metadata.formUrl,
          coApproval: usedDoc.metadata.coApproval,
          approvalDetails: usedDoc.metadata.approvalDetails,
          subGroup: usedDoc.metadata.subGroup,
          note: usedDoc.metadata.note
        } : null,
        searchQuery: lastUserMessage,
        totalDocuments: docs.length,
        usedDocNo: usedDocNo
      }
    });

  } catch (err) {
    console.error("LLM/Route Error:", err);
    return NextResponse.json(
      {
        content: "เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง",
        type: "error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}