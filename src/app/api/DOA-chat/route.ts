
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ChatOpenAI } from "@langchain/openai";
import { NextRequest, NextResponse } from "next/server";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import pg from "pg";
import { createClient } from "@/lib/supabase/server";
import { getDOARetriever } from "@/lib/doa_retriever";

// คำสั่งของ system prompt ที่ถูกส่งทุกครั้ง
const SYSTEM_PROMPT = `
บทบาท (Role): 
คุณคือ AI Chatbot ผู้ช่วยตอบคำถามเชิงนโยบายและข้อมูลภายในองค์กร ที่มีความ friendly และเป็นมิตร
คุณทำหน้าที่เป็นผู้ช่วยตอบคำถามเกี่ยวกับ "นโยบายการอนุมัติค่าใช้จ่าย" และ "ข้อมูลภายในองค์กร" โดยอ้างอิงจาก **เอกสารภายในที่กำหนดไว้เท่านั้น** 
คุณจะต้องตอบคำถามตามเอกสารที่กำหนดไว้เท่านั้น โดยไม่ใช้ความรู้ภายนอกหรือคาดเดา
คุณจะต้องตอบเป็นภาษาไทยชัดเจน กระชับ และตรงประเด็น

ขอบเขตหน้าที่ (Scope): 
- ตอบเฉพาะข้อมูลจากเอกสารที่จัดเตรียมไว้ 
- หากข้อมูลไม่อยู่ในเอกสาร ให้ตอบว่า **"ไม่พบข้อมูลในเอกสารที่กำหนด"** [แล้วแสดงรายการหัวข้อเดิม]
- ห้ามสรุปจากสามัญสำนึก 
- ตอบเป็นภาษาไทยชัดเจน กระชับ และตรงประเด็นเท่านั้น 

วัตถุประสงค์ (Purpose): 
- เพื่อช่วยผู้ใช้งานในองค์กรเข้าใจนโยบายการอนุมัติ 
- เข้าใจเงื่อนไขการอนุมัติและผู้อนุมัติแต่ละระดับ และเข้าใจข้อมูลแต่ละหัวข้อการอนุมัติ DOA 
- ปกป้องข้อมูลส่วนบุคคลและข้อมูลลับ 

การจัดการคำถามกว้าง/ไม่ชัดเจน (Ambiguity Handling): 
- **หากผู้ใช้ถามคำถามเงื่อนไขการอนุมัติ เช่น "วงเงิน X ใครอนุมัติ", "อนุมัติยังไง", "ผู้อนุมัติคือใคร" โดยไม่ได้ระบุหัวข้อหรือ category เฉพาะเจาะจง** ให้ตอบ: "คำถามนี้เกี่ยวข้องกับหลายหัวข้อ กรุณาระบุหัวข้อที่ต้องการสอบถามเป็นพิเศษ"
หัวข้อที่สามารถสอบถามได้:
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
"แต่ละหัวข้อมีกฎการอนุมัติที่แตกต่างกัน กรุณาเลือกหัวข้อที่สนใจ"

- **หากผู้ใช้ถามหัวข้อใหญ่** ให้ตรวจสอบในเอกสารว่ามีหัวข้อย่อยหรือไม่:
  * ถ้ามีหัวข้อย่อย → แสดงรายการหัวข้อย่อยทั้งหมด
  * ถ้าไม่มีหัวข้อย่อย → ตอบรายละเอียดโดยตรง
  * หากหัวข้อย่อยมีหลายระดับ ให้แสดงหัวข้อย่อยทั้งหมดในลำดับที่ถูกต้อง
- **หากผู้ใช้ถามหัวข้อย่อยที่เจาะจงแล้ว** ให้ตอบตรงตามข้อมูลในเอกสารโดยแสดงรายละเอียดครบถ้วน
- **สำคัญ: ห้ามตอบคำถามเกี่ยวกับการอนุมัติหรือวงเงินโดยไม่ได้ระบุหัวข้อที่ชัดเจน เพราะแต่ละหัวข้อมีกฎการอนุมัติที่แตกต่างกัน**

การตอบคำถามเฉพาะเจาะจง (Specific Question Handling): 
- หากผู้ใช้ถามตรง เช่น "ใครอนุมัติ?", "มีเงื่อนไขอะไร?", "ต้องผ่านใครบ้าง?" ให้ตอบตรงตามข้อมูลในเอกสารเท่านั้น ห้ามขยายความเกิน 
- หากถามอยู่หัวข้อไหน ให้ไล่ตอบตั้งแต่ Category (ลำดับ + ชื่อ) , ถ้ามี Group ก็บอก Group (ลำดับ + ชื่อ) อย่างเช่น มีกี่ข้อ >>> ไล่ทุกข้อในหัวข้อ Category นั้นๆ 

รูปแบบการตอบ (Output Format): 
- ใช้ข้อความธรรมดา (plain text) - เน้นหัวข้อสำคัญด้วยตัวหนา (bold)
- กรณี Approval ให้แสดงรายละเอียดครบถ้วน 
เช่น 
รายการผู้อนุมัติ 
- หากไม่มีค่า Co-approve, Remark, URL, Note ไม่ต้องแสดง

**กรณีคำถามไม่เจาะจง**: เมื่อผู้ใช้ถามคำถามทั่วไป เช่น "สวัสดี", "มีอะไรบ้าง", "ช่วยได้อะไรบ้าง" ให้ตอบ:
"สวัสดีครับ! คุณต้องการสอบถามหัวข้ออะไรเป็นพิเศษ?

หัวข้อที่สามารถสอบถามได้:
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
กรุณาเลือกหัวข้อที่สนใจ หรือถามคำถามเฉพาะเจาะจง

`;



// สร้าง ChatOpenAI แบบธรรมดา (ไม่มี tools)
function getModel() {
    return new ChatOpenAI({
        model: 'gpt-4o-mini',
        temperature: 0,
        maxTokens: 1500,
        cache: true,
    });
}

// สร้างตัวจัดการ chat history
function getHistory(sessionId: string) {
    return new PostgresChatMessageHistory({
        sessionId,
        tableName: "langchain_chat_history",
        pool: new pg.Pool({
            host: process.env.PG_HOST,
            port: Number(process.env.PG_PORT),
            user: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
            database: process.env.PG_DATABASE,
        }),
    });
}

export async function POST(req: NextRequest) {
    // get current login user
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;

    const sessionId = userId || 'widget_anonymous';
    
    console.log('🔑 Using sessionId:', sessionId);

    const body = await req.json();
    const messages: any[] = body.messages ?? [];

    // ถ้าเพิ่งเริ่ม (ไม่มีข้อความเลย) → ส่ง greeting กลับทันที
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
        });
    }

    const lastUserMessage = messages[messages.length - 1].content ?? "";

    // RAG: Retrieve context
    console.log('Search Query:', lastUserMessage);
    const docs = (await getDOARetriever()).invoke(lastUserMessage);

    console.log("Retrieved documents:", await docs);
    (await docs).forEach((doc, index) => {
        console.log(`${index + 1}. Document preview:`, doc.pageContent.substring(0, 100) + '...');
        console.log(`   Metadata:`, doc.metadata);
    });
    const ragContextRaw = (await docs).map((document) => document.pageContent).join("\n\n");

    // ป้องกัน { } ใน context
    const safeContext = ragContextRaw.replace(/[{}]/g, '');

    console.log('📝 Final context length:', safeContext.length);
    console.log('📝 Context preview:', safeContext.substring(0, 200) + '...');

    // Prompt template - ลดความซับซ้อน
    // const prompt = ChatPromptTemplate.fromMessages([
    //     ['system', SYSTEM_PROMPT],
    //     ['system', `เอกสารอ้างอิง:\n${safeContext}`],
    //     new MessagesPlaceholder("history"),
    //     ['user', '{input}'],
    // ]);

    const prompt = ChatPromptTemplate.fromMessages([

  [

    "system",

    `คุณคือผู้ช่วยตอบคำถาม โดยต้องใช้ข้อมูลที่อยู่ใน <docs> เท่านั้น
<docs>

${safeContext}
</docs>
 
ข้อกำหนดการตอบ:

- ถ้าพบคำตอบใน <docs> ให้ตอบตามข้อมูลนั้นโดยตรง ห้ามแต่งเติมหรือคาดเดา

- ถ้าคำถามของผู้ใช้ตรงกับ หรือมีความหมายพ้องกับหัวข้อ/เนื้อหาใน <docs> ให้ตอบตามข้อมูลนั้นโดยตรง ห้ามแต่งเติมหรือคาดเดา

- ถ้าคำถามกว้าง และใน <docs> มีหลายข้อย่อย ⇒ ถามกลับ โดยยกหัวข้อย่อยให้เลือก การเรียงลำดับตามใน <docs> ห้ามแต่งเติมหรือคาดเดา

- ถ้าไม่พบคำตอบใน <docs> ให้ตอบว่า "กรุณาถามคำถามจากหัวข้อที่กำหนด" 

- ห้ามดัดแปลงข้อความดั้งเดิมใน <docs>

- การตอบคำถามควรเอามาทั้งหมด ตามข้อมูลนั้นโดยตรง ห้ามตัดทอน หรือสรุปความ

- ถ้ามีฟิลด์ 'Form URL' ให้แสดงเป็น URL ดิบรูปแบบ https://... โดยไม่ล้อมด้วย < > และไม่ทำเป็นลิงก์ markdown

`,

  ],

  new MessagesPlaceholder("history"),

  ["user", "{input}"],

]);
 

    const chain = prompt.pipe(getModel());

    const chainWithHistory = new RunnableWithMessageHistory({
        runnable: chain,
        getMessageHistory: (sessionId) => getHistory(sessionId),
        inputMessagesKey: "input",
        historyMessagesKey: "history",
    });

    // เรียก LLM แค่ครั้งเดียว (ไม่มี tool calls)
    // const response = await chainWithHistory.invoke(
    //     { input: lastUserMessage },
    //     { configurable: { sessionId: userId } }
    // );

    // // Return JSON format สำหรับ ResponseStream
    // return NextResponse.json({
    //     content: response.content,
    //     type: "text",
    //     timestamp: new Date().toISOString()
    // });

    try {
        const response = await chainWithHistory.invoke(
            { input: lastUserMessage },
            { configurable: { sessionId: sessionId } }
        );

        return NextResponse.json({
            content: response.content,
            type: "text",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ LLM Error:', error);
        
        return NextResponse.json({
            content: "เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง",
            type: "error",
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}