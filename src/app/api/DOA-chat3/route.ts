// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import pg from "pg";
import { createClient } from "@/lib/supabase/server";

import { getDOA_Main_Retriever } from "@/lib/doa_main_retriever";
import { getDOARetrieverNew } from "@/lib/doa_new_retriever";
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
  temperature: 0.3,
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
    triggers: ["การเบิกและเคลียร์เงินทดรองจ่าย","เงินทดลองจ่าย","เบิกเงินล่วงหน้า","เบิกเงินทดรองจ่าย","เบิกทดลองจ่าย","การเบิกและเคลียร์เงินทดลองจ่าย"],
    expand: [ 
      "Advance payment and clearing",
      "Overseas trip",
      "Domestic activity",
      "Sales & Marketing activity"


    ],
    
  },
  {
    triggers: ["การอนุมัติเงินทดรองจ่ายค่าภาษีอากรนำเข้าและส่งออกสินค้า","อนุมัติเงินทดรองจ่ายค่าภาษีอากรนำเข้าและส่งออกสินค้า","เงินทดรองจ่ายค่าภาษีอากรนำเข้า","เงินทดรองจ่ายค่าภาษีอากรส่งออกสินค้า","ทดรองจ่ายค่าภาษีอากรนำเข้า","ทดรองจ่ายค่าภาษีอากรส่งออกสินค้า"],
    expand: [ 
      "Advance payment for import and export taxes",
    ],
    
  },
  {
    triggers: ['บริจาคสี',"สีบริจาค","การบริจาคสินค้าของบริษัท เพื่อการกุศล","การบริจาคสินค้าของบริษัท"],
    expand: [ 
      "Company's Finished Goods (FG) Donation",
      "FG (Re-Condition)",
      "Normal FG",
    ],
    
  },
  {
    triggers: ['ค่าบริจาค',"ค่าสนับสนุน","ค่าใช้จ่ายด้าน CSR","ค่าใช้จ่ายCSR"],
    expand: [ 
      "Donation",
      "Sponsorship",
      "CSR Expenses",
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
    const [ doaMainRetriever, doaRetrieverNew] = await Promise.all([
      getDOA_Main_Retriever(),
      getDOARetrieverNew()
    ]);


    // เรียก parallel
    const [ mainDocs, docsNew] = await Promise.all([
      doaMainRetriever.invoke(expandedQuestion),
      doaRetrieverNew.invoke(expandedQuestion),
    ]);
    console.log("🔍 Retrieved docs:", docsNew);
 
    

    
    const ctxDetail = docsNew
    .map((d) => {
      
      return [
        d.pageContent,
        // `META: ${JSON.stringify({
        //   no: meta?.no,
        //   topic: meta?.topic,
        //   group: meta?.group,
        //   sub_group: meta?.sub_group,
        //   co_approval: meta?.co_approval,
        //   approval_details: meta?.approval_details,
        //   remarks: meta?.remarks,
        //   sheet: meta?.sheet,
        //   source: meta?.source,
        //   form_url: meta?.form_url,
        // })}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");

    // 🔧 สร้าง detailed context ที่ content + metadata อยู่ด้วยกัน
  

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
คุณคือ AI Chatbot ผู้เชี่ยวชาญด้าน **นโยบายและขั้นตอนการอนุมัติ (DOA Cash)**  
## Context
- ชุดที่ 1 = ข้อมูลภาพรวม/หัวข้อหลัก: """${ctxMain}"""
- ชุดที่ 2 = ข้อมูลรายละเอียดของหัวข้อ: """${finalCtxDetail}"""  
## กติกาการตอบ:
1. หากคำถามเป็นเชิงภาพรวม → ใช้เฉพาะข้อมูลจากชุดที่ 1  
2. หากคำถามเจาะจงถึงหัวข้อย่อย → ใช้ข้อมูลจากชุดที่ 2  
3. หากชุดที่ 2 ไม่มีรายละเอียดของหัวข้อที่ถาม → ตอบว่า **"ไม่มีรายละเอียดเพิ่มเติม"**  
## รูปแบบคำตอบ (Output Format):
- อ้างอิง DOA หัวข้อ **"no"** เสมอ
- ใช้ภาษาไทยเท่านั้น  
- หากมีอำนาจอนุมัติซ้ำกันหรือเหมือนกันในหลายตำแหน่ง → รวมเป็นหัวข้อเดียว เช่น:**"BoD, EXCOM: มีอำนาจอนุมัติไม่จำกัด หรือ อื่นๆ"**  
- แบ่งหัวข้อชัดเจน  
- ใช้เลขลำดับ (1., 2., 3.) สำหรับหัวข้อหลัก  
- ใช้ bullet points (-) สำหรับรายละเอียดภายใต้แต่ละหัวข้อ  
- หากชุดที่ 2 มีหลายหัวข้อที่เกี่ยวข้อง → ตอบเป็นข้อ ๆ โดยแสดงชื่อหัวข้อ แต่ยังไม่ต้องลงรายละเอียดการอนุมัติ  ให้ต่อ "หากต้องการรายละเอียดเพิ่มเติม ให้พิมพ์ หัวข้อที่ต้องการ"
- ไม่ควรแนะนำหรือข้อมูลที่ไม่อยู่ใน <docs>
`.trim();

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", SYSTEM_PROMPT],
      ["user", "{input}"],
    ]);

    const chain = prompt.pipe(model);

    // const chainWithHistory = new RunnableWithMessageHistory({
    //   runnable: chain,
    //   getMessageHistory: (sid) => getHistory(sid),
    //   inputMessagesKey: "input",
    //   historyMessagesKey: "history",
    // });

    /** 3.6 Invoke LLM */
    const response = await chain.invoke(
      { input: expandedQuestion },
      { configurable: { sessionId } }
    );

    // 🔧 แยกเอา USED_DOC ออกจาก response
   
   
    
   
    
   


    return NextResponse.json({
      content: response.content,
      type: "text",
      timestamp: new Date().toISOString(),
      sessionId,
      isNewSession: isNew,
      sessionUpdated: updated,
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