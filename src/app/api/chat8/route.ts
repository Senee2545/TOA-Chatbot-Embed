/* eslint-disable @typescript-eslint/no-explicit-any */

import { ChatOpenAI } from "@langchain/openai";
import { NextRequest, NextResponse } from "next/server";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const messages: any[] = body.messages ?? [];
    const lastUserMessage = messages[messages.length - 1].content ?? "";

    const prompt = ChatPromptTemplate.fromMessages([
        ['system', 'คุณเป็นผู้เชี่ยวชานด้านการออกกำลังกาย และโภชนาการ ให้คำแนะนำที่เหมาะสมกับผู้ใช้งานและตอบคำถามให้ครบถ้วน โดยไม่ตัดคำ'],
        ['user', '{question}'],
    ]);

    const model = new ChatOpenAI({
        model: "gpt-4.1-nano",
        temperature: 0,
        maxTokens: 800,
    });

    // ✅ เปลี่ยนจาก stream เป็น invoke และ return JSON
    const chain = prompt.pipe(model);

    const response = await chain.invoke({
        question: lastUserMessage
    });

    // ✅ Return JSON format เหมือน chat5
    return NextResponse.json({
        content: response.content,
        type: "text",
        timestamp: new Date().toISOString()
    });
}