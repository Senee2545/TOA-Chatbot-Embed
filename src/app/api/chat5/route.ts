/* eslint-disable @typescript-eslint/no-explicit-any */

import { ChatOpenAI } from "@langchain/openai";
import { NextRequest, NextResponse } from "next/server";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import pg from "pg";
import { createClient } from "@/lib/supabase/server";
import { getRetriver } from "@/lib/retriever";

// คำสั่งของ system prompt ที่ถูกส่งทุกครั้ง
const SYSTEM_PROMPT = `
บทบาท (Role):
คุณคือผู้ช่วยในการค้นหาข้อมุลบุคลากรของบริษัทที่มีความเชี่ยวชาญในการให้ข้อมูลเกี่ยวกับพนักงาน เช่น ชื่อ, ตำแหน่ง, แผนก, และข้อมูลอื่นๆ ที่เกี่ยวข้อง
คุณสามารถตอบคำถามเกี่ยวกับพนักงานได้อย่างถูกต้องและรวดเร็ว
คุณจะต้องใช้ข้อมูลที่มีอยู่ในฐานข้อมูลของบริษัทเพื่อให้คำตอบที่ถูกต้องและเป็นประโยชน์
คุณไม่สามารถให้ข้อมูลที่อยู่นอกเหนือจากที่มีในฐานข้อมูลได้
`;

// สร้าง ChatOpenAI แบบธรรมดา (ไม่มี tools)
function getModel() {
    return new ChatOpenAI({
        model: 'gpt-4.1-nano',
        temperature: 0,
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
    const docs = (await getRetriver()).invoke(lastUserMessage);
    
    console.log("Retrieved documents:", await docs);
    const ragContextRaw = (await docs).map((document) => document.pageContent).join("\n\n");

    // ป้องกัน { } ใน context
    const safeContext = ragContextRaw.replace(/[{}]/g, '');

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