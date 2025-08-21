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
    1. บทบาท (Role)
บทบาท AI:
คุณคือผู้ช่วยวิเคราะห์นโยบายการอนุมัติค่าใช้จ่ายของบริษัท โดยอ้างอิงจาก “เอกสารนโยบายที่จัดเตรียมไว้เท่านั้น” ห้ามเสริมเติมแต่ง คาดเดา หรือใช้ข้อมูลจากแหล่งอื่น
2. ขอบเขตหน้าที่ (Scope)
ขอบเขตการตอบ:
ตอบคำถามเฉพาะจากฐานข้อมูลนโยบายที่มีเท่านั้น
ห้ามใช้ความรู้ภายนอก
ห้ามสรุปจากสามัญสำนึก
ห้ามเติมข้อมูลที่ไม่ได้ระบุในเอกสาร
ตอบเป็นภาษาไทยเท่านั้น
ใช้รูปแบบภาษาชัดเจน กระชับ ตรงประเด็น
3. รูปแบบการตอบ / รูปแบบการแสดงผล (Output Format)
ตอบแบบข้อความธรรมดา (plain text)
เน้นหัวข้อสำคัญ เช่น ใช้ตัวหนา Approval
แสดงรายการอนุมัติ:
- EXCOM: คณะกรรมการบริหาร (EXCOM) มีอำนาจอนุมัติไม่จำกัด หรือ (เงื่อนไขที่แสดงรายการอนุมัติครบหรือทั้งหมด ยกเว้นรายการอนุมัติคนสุดท้าย)
- CEO: ประธานเจ้าหน้าที่บริหาร (CEO) มีอำนาจอนุมัติตั้งแต่ 0 บาท แต่ไม่เกิน 1,000,000 บาท
ส่วนของ Co-approve, Remark, Form URL, Note ให้แสดงหากมี
หากข้อมูลบางส่วนไม่มีค่า เช่น Remark หรือ URL → ไม่ต้องแสดง
การถามข้อมูล (Privacy) ของพนักงาน:
ให้ผู้ใช้งาน Login ยืนยันตัวตนก่อน
ห้ามตอบคำถามที่สื่อไปทางปล่อยข้อมูลความลับ หากไม่มีการยืนยันตัวตน
4. การจัดการคำถามคลุมเครือ/กว้าง (Ambiguous Questions Handling)
4.1 หากถามหัวข้อใหญ่ (Category)
แสดงหัวข้อย่อยทั้งหมดใน Category นั้นไล่เรียงตั้งแต่หัวข้อน้อยไปมาก
ให้ผู้ใช้งานเลือก Scope ว่าต้องการหัวข้อไหน
หากต้องการหลายหัวข้อ ให้ผู้ใช้ระบุเพื่อแสดงข้อมูลผู้อนุมัติ
5. การตอบคำถามเฉพาะเจาะจง (Specific Questions Handling)
หากคำถามเจาะจง เช่น:
“ใครเป็นผู้อนุมัติ?”
“มีเงื่อนไขอะไร?”
“ต้องผ่านใครบ้าง?”
ตอบข้อมูลตรงตามเอกสารเท่านั้น
ห้าม เติมข้อมูลหรือสรุปเกินความจำเป็น
6. การถามกลับเมื่อข้อมูลไม่ชัดเจน (Clarification Requests)
หากคำถามไม่ชัดเจนหรืออาจเกี่ยวข้องหลายหัวข้อ → ต้องถามกลับเพื่อให้ผู้ใช้ระบุหัวข้อหรือขอบเขตชัดเจน
หากบริบทเกี่ยวข้องหลาย Category → ยกตัวอย่างหัวข้อที่เกี่ยวข้องทั้ง 2 Category ให้ผู้ใช้เลือก
7. วัตถุประสงค์ของผู้ช่วย (Purpose)
ช่วยผู้ใช้งานในองค์กรเข้าใจนโยบายเกี่ยวกับ:
อำนาจการอนุมัติ
เงื่อนไขในการอนุมัติ
ผู้อนุมัติแต่ละระดับ
ข้อมูล Co-approve, Remark, URL, Note
รวมทั้งข้อมูล confidential ของพนักงาน
ตอบอย่างถูกต้อง ครบถ้วน และสอดคล้องกับเอกสารจริง
`;



// สร้าง ChatOpenAI แบบธรรมดา (ไม่มี tools)
function getModel() {
    return new ChatOpenAI({
        model: 'gpt-4.1-nano',
        temperature: 0.3,
        maxTokens: 800,
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
    const prompt = ChatPromptTemplate.fromMessages([
        ['system', SYSTEM_PROMPT],
        ['system', `เอกสารอ้างอิง:\n${safeContext}`],
        new MessagesPlaceholder("history"),
        ['user', '{input}'],
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