/* eslint-disable @typescript-eslint/no-explicit-any */

import { ChatOpenAI } from "@langchain/openai";
import { NextRequest, NextResponse } from "next/server";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import { SystemMessage, ToolMessage } from "@langchain/core/messages";
import pg from "pg";
import { createClient } from "@/lib/supabase/server";
import { doaDualSearchTool } from "@/lib/llm-tool";

// System prompt
const SYSTEM_PROMPT = `คุณคือผู้ช่วยตอบคำถาม DOA (Delegation of Authority) ที่ฉลาดและเป็นประโยชน์

เมื่อผู้ใช้ถามคำถาม ให้ใช้ doaDualSearchTool ตามขั้นตอนนี้:

🔍 STEP 1: วิเคราะห์คำถาม
- ถ้าคำถามกว้างๆ (เช่น "การตลาด", "พนักงาน", "การเงิน") → ใช้ searchType: "overview" 
- ถ้าคำถามเฉพาะ (เช่น "งานเลี้ยงปีใหม่", "เงินเดือน", "การฝึกอบรม") → ใช้ searchType: "both"

📋 STEP 2: การตอบคำถาม
A) ถ้าได้ผลลัพธ์ overview อย่างเดียว:
   - แสดงรายการหัวข้อย่อยที่พบ
   - ถามว่า "ต้องการรายละเอียดของหัวข้อไหน?"
   - แนะนำให้ระบุเฉพาะเจาะจงมากขึ้น

B) ถ้าได้ผลลัพธ์ detail หรือ both:
   - ตอบรายละเอียดเต็มรูปแบบ
   - แสดงขั้นตอนการอนุมัติ
   - แสดง Form URL ถ้ามี

หลักการตอบคำถาม:
- ใช้ข้อมูลจาก doaDualSearchTool เท่านั้น ห้ามแต่งเติมหรือคาดเดา
- ตอบเป็นภาษาไทยที่เข้าใจง่าย
- ถ้ามีฟิลด์ 'Form URL' ให้แสดงเป็น URL ดิบรูปแบบ https://...

📂 หัวข้อหลักที่มีข้อมูล:
1. EMPLOYEE BENEFITS ผลประโยชน์พนักงาน
2. GENERAL ADMIN EXPENSES ค่าใช้จ่ายธุรการทั่วไป
3. FINANCE & ACCOUNTING การเงินและบัญชี
4. SALES & MARKETING EXPENSES ค่าใช้จ่ายทางการขายและการตลาด
5. CAPEX INVESTMENT การลงทุนโครงการต่างๆ
6. PROCUREMENT การจัดซื้อจัดจ้าง
7. SUPPLY & FG REQUISITION (LOGISTICS) การเบิกจ่ายพัสดุและสินค้าสำเร็จรูป
8. IMPORT & EXPORT (SHIPPING) การนำเข้าและส่งออกสินค้า
9. LOAN TO OR BETWEEN SUBSIDIARY COMPANY การให้เงินกู้ยืม
10. CORPORATE DOCUMENTS การเผยแพร่เอกสารของบริษัท`;

// Tools ที่จะให้ LLM ใช้งาน
const toolsByName = { doaDualSearch: doaDualSearchTool } as const;
const toolArray = Object.values(toolsByName);

// สร้าง ChatOpenAI แล้ว bind tools เข้าไป
function getBoundModel() {
    return new ChatOpenAI({
        model: 'gpt-4o-mini',
        temperature: 0,
        maxTokens: 1500,
        cache: true,
    }).bindTools(toolArray);
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

    const prompt = ChatPromptTemplate.fromMessages([
        ['system', SYSTEM_PROMPT],
        new MessagesPlaceholder("history"),
        ['human', `{question}`]
    ]);

    const chain = prompt.pipe(getBoundModel());
    const chainWithHistory = new RunnableWithMessageHistory({
        runnable: chain,
        getMessageHistory: (sessionId) => getHistory(sessionId),
        inputMessagesKey: "question",
        historyMessagesKey: "history",
    });

    try {
        // เรียก LLM ครั้งแรก (อาจมีการเรียก tool_calls)
        const firstResponse = await chainWithHistory.invoke(
            { question: lastUserMessage },
            { configurable: { sessionId: sessionId } }
        );

        // ถ้า LLM ไม่ขอใช้ Tool ก็จบเลย (คุยปกติ)
        if (!Array.isArray(firstResponse.tool_calls) || firstResponse.tool_calls.length === 0) {
            return NextResponse.json({
                content: firstResponse.content,
                type: "text",
                timestamp: new Date().toISOString()
            });
        }

        // LLM ขอใช้ Tool -> loop -> เรียกใช้ตามรายการ tools
        const toolMessages: ToolMessage[] = [];
        for (const call of firstResponse.tool_calls) {
            // ตรวจสอบว่ามี tool อยู่จริง
            if (!(call.name in toolsByName)) {
                throw new Error(`Tool ${call.name} not found`);
            }
            
            // เรียกใช้ tool ตามชื่อ
            const tool = toolsByName[call.name as keyof typeof toolsByName];
            const toolResult = await tool.invoke(call, { metadata: { sessionId } });

            toolMessages.push(
                new ToolMessage({
                    tool_call_id: call.id!,
                    content: toolResult.content,
                    name: call.name
                })
            );
        }

        // บันทึก toolMessages ลงฐานข้อมูล
        const historyStore = getHistory(sessionId);
        for (const tm of toolMessages) {
            await historyStore.addMessage(tm);
        }

        // ดึง history มาจาก database และ invoke (second call)
        const fullHistory = await historyStore.getMessages();

        // เรียก LLM ครั้งที่ 2 เพื่อให้ได้คำตอบสุดท้าย
        const secondResponse = await getBoundModel().invoke([
            new SystemMessage(SYSTEM_PROMPT),
            ...fullHistory
        ]);

        // บันทึกคำตอบสุดท้ายที่ AI ตอบลงในฐานข้อมูลด้วย (chat history)
        await historyStore.addMessage(secondResponse);

        return NextResponse.json({
            content: secondResponse.content,
            type: "text",
            timestamp: new Date().toISOString()
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