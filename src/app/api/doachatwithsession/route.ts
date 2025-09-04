
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ChatOpenAI } from "@langchain/openai";
import { NextRequest, NextResponse } from "next/server";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import pg from "pg";
import { createClient } from "@/lib/supabase/server";
import { getDOARetriever } from "@/lib/doa_retriever";

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
    
    let sessionId: string = 'widget_anonymous';
    let isNewSession = false;

    if (userId) {
        // ถ้ามี userId ใช้เป็น sessionId (ไม่หมดอายุ)
        sessionId = userId;
        console.log('Using userId as sessionId:', userId);
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
                    }
                } else {
                    console.log('Invalid sessionId format, creating new one');
                    isNewSession = true;
                }
            } catch (error) {
                console.log('Error parsing sessionId, creating new one:', error);
                isNewSession = true;
            }
        } else {
            console.log('No sessionId provided, creating new one');
            isNewSession = true;
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
            console.log('✨ Created new anonymous sessionId:', sessionId);
        }
    }

    console.log('Final sessionId:', sessionId);

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
            isNewSession: isNewSession
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
            isNewSession: isNewSession
        });
    } catch (error) {
        console.error('LLM Error:', error);

        return NextResponse.json({
            content: "เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง",
            type: "error",
            timestamp: new Date().toISOString(),
            sessionId: sessionId
        }, { status: 500 });
    }
}