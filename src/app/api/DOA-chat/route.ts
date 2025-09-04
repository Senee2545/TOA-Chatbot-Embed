
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ChatOpenAI } from "@langchain/openai";
import { NextRequest, NextResponse } from "next/server";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import pg from "pg";
import { createClient } from "@/lib/supabase/server";
import { getDOARetriever } from "@/lib/doa_retriever";
import { getDOA_Main_Retriever } from "@/lib/doa_main_retriever";


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

    const body = await req.json();
    const messages: any[] = body.messages ?? [];
    
    let sessionId = userId || 'widget_anonymous';
    let isNewSession = false;
    let sessionUpdated = false;

    if (userId) {
        // ถ้ามี userId ใช้เป็น sessionId (ไม่หมดอายุ)
        sessionId = userId;
        console.log('Using userId as sessionId:', userId);

        const currentSessionId = body.sessionId;
        if (currentSessionId !== userId) {
            sessionUpdated = true;
            console.log('Client sessionId mismatch, needs update');
        }
    } else {
        // ถ้าไม่มี userId (anonymous) จัดการ widget session ที่หมดอายุ
        const currentSessionId = body.sessionId;
        
        if (currentSessionId && currentSessionId !== 'widget_anonymous') {
            // ตรวจสอบว่า sessionId เป็นรูปแบบที่เราสร้าง และยังไม่หมดอายุ
            try {
                const parts = currentSessionId.split('_');
                if (parts.length >= 3 && parts[0] === 'widget') {
                    const timestampStr = parts[1];
                    const timestamp = parseInt(timestampStr, 36);
                    const now = Date.now();
                    const oneDay = 24 * 60 * 60 * 1000; // 1 วัน
                    
                    if (now - timestamp < oneDay) {
                        console.log('Using existing valid sessionId:', currentSessionId);
                        sessionId = currentSessionId;
                    } else {
                        console.log('SessionId expired, creating new one');
                        isNewSession = true;
                        sessionUpdated = true;
                    }
                } else {
                    console.log('Invalid sessionId format, creating new one');
                    isNewSession = true;
                    sessionUpdated = true;
                }
            } catch (error) {
                console.log('Error parsing sessionId, creating new one:', error);
                isNewSession = true;
                sessionUpdated = true;
            }
        } else {
            console.log('No sessionId provided, creating new one');
            isNewSession = true;
            sessionUpdated = true;
        }

        // สร้าง sessionId ใหม่สำหรับ anonymous widget
        if (isNewSession) {
            let newSessionId;
            let attempts = 0;
            const maxAttempts = 10;
            
            do {
                const timestamp = Date.now().toString(36);
                const random = Math.random().toString(36).substring(2, 15);
                newSessionId = `widget_${timestamp}_${random}`;
                attempts++;
                
                if (newSessionId !== currentSessionId) {
                    break;
                }
            } while (attempts < maxAttempts);
            
            sessionId = newSessionId;
            console.log('Created new anonymous sessionId:', sessionId);
        }
    }

    console.log('🔑 Using sessionId:', sessionId);

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
            sessionId: sessionId,
            isNewSession: isNewSession,
            sessionUpdated: sessionUpdated
        });
    }

    const lastUserMessage = messages[messages.length - 1].content ?? "";

    // RAG: Retrieve context detail
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


    
    // RAG: Retrieve context detail
    console.log('Search Query Main:', lastUserMessage);
    const mainDocs = (await getDOA_Main_Retriever()).invoke(lastUserMessage);

    console.log("Retrieved documents:", await mainDocs);
    (await mainDocs).forEach((doc, index) => {
        console.log(`${index + 1}. Document preview:`, doc.pageContent.substring(0, 100) + '...');
        console.log(`   Metadata:`, doc.metadata);
    });
    const ragMainContextRaw = (await mainDocs).map((document) => document.pageContent).join("\n\n");

    // ป้องกัน { } ใน context
    const safeMainContext = ragMainContextRaw.replace(/[{}]/g, '');

    console.log('📝 Final context length:', safeMainContext.length);
    console.log('📝 Context preview:', safeMainContext.substring(0, 200) + '...');

    const SYSTEM_PROMPT =`
    คุณคือ AI Chatbot ที่มีข้อมูล 2 ชุด:
    - ชุดที่ 1 = หัวข้อหลัก/ภาพรวม : ${safeMainContext}
    - ชุดที่ 2 = รายละเอียดของหัวข้อ : ${safeContext}

    **กติกาการตอบ:**
    1. ถ้าผู้ใช้ถามเชิงภาพรวม เช่น "ผลประโยชน์มีอะไรบ้าง" → ให้ตอบโดยอ้างอิงเฉพาะข้อมูลจากชุดที่ 1
    2. ถ้าผู้ใช้ถามเจาะจงหัวข้อ เช่น "เบี้ยเลี้ยง", "โบนัส", หรือ "รายละเอียดข้อ 1.2" → ให้ตอบโดยใช้ข้อมูลจากชุดที่ 2
    3. ถ้าหัวข้อที่ถูกถามไม่มีรายละเอียดในชุดที่ 2 → ให้ตอบว่า "ไม่มีรายละเอียดเพิ่มเติม"
    4. ทุกคำตอบต้องแสดงในรูปแบบที่เป็นระเบียบ อ่านง่าย และคงโครงสร้างลำดับขั้น (hierarchy) ให้ชัดเจน`;

    const prompt = ChatPromptTemplate.fromMessages([
        ['system', SYSTEM_PROMPT],
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

    try {
        const response = await chainWithHistory.invoke(
            { input: lastUserMessage },
            { configurable: { sessionId: sessionId } }
        );

        return NextResponse.json({
            content: response.content,
            type: "text",
            timestamp: new Date().toISOString(),
            sessionId: sessionId,
            isNewSession: isNewSession,
            sessionUpdated: sessionUpdated
        });
    } catch (error) {
        console.error('LLM Error:', error);

        return NextResponse.json({
            content: "เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง",
            type: "error",
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}