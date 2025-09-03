/* eslint-disable @typescript-eslint/no-explicit-any */
// http://localhost:3000/api/DOA-RAG

import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { Document } from "langchain/document";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { createClient } from "@/lib/supabase/server";
import { OpenAIEmbeddings } from "@langchain/openai";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const xlsxPath = "/Users/senee_p/Documents/Ui-ai/ui-ai/data/excel/DOA_CUSTOME_TEST.xlsx";
        console.log("Reading Excel file from:", xlsxPath);

        // เพิ่มการตรวจสอบ permissions อย่างละเอียด
        if (!fs.existsSync(xlsxPath)) {
            throw new Error(`Excel file not found at: ${xlsxPath}`);
        }

        // ตรวจสอบ file permissions
        try {
            fs.accessSync(xlsxPath, fs.constants.R_OK);
        } catch (permError: unknown) {
            const errorMessage = permError instanceof Error ? permError.message : String(permError);
            throw new Error(
                `Cannot read file: ${xlsxPath}. Permission denied: ${errorMessage}`
            );
        }

        // อ่านไฟล์เป็น buffer ก่อน แล้วค่อยส่งให้ XLSX
        let workbook;
        try {
            const fileBuffer = fs.readFileSync(xlsxPath);
            console.log("File buffer size:", fileBuffer.length);

            workbook = XLSX.read(fileBuffer, { type: "buffer" });
        } catch (xlsxError: unknown) {
            console.error("XLSX read error:", xlsxError);

            // ลองใช้ readFile method
            try {
                workbook = XLSX.readFile(xlsxPath);
            } catch (fallbackError: unknown) {
                const errorMessage =
                    fallbackError instanceof Error
                        ? fallbackError.message
                        : String(fallbackError);
                throw new Error(`Cannot read Excel file: ${errorMessage}`);
            }
        }

        console.log("Available sheets:", workbook.SheetNames);

        if (workbook.SheetNames.length === 0) {
            throw new Error("No sheets found in Excel file");
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
            throw new Error(`Sheet "${sheetName}" not found`);
        }

        console.log("Using sheet:", sheetName);

        // แปลง sheet เป็น JSON
        const sheetData = XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            raw: false, // เพิ่ม option นี้เพื่อให้ได้ string values
        });

        console.log("Total rows:", sheetData.length);

        if (sheetData.length === 0) {
            throw new Error("No data found in Excel sheet");
        }

        // ดู column names ที่ได้จริง
        const sampleRow = sheetData[0] as Record<string, any>;
        const columnNames = Object.keys(sampleRow);
        console.log("Available columns:", columnNames);
        console.log("Sample row:", sampleRow);

        // แปลงข้อมูลเป็น Document objects โดยใช้ column names ที่ได้จริง
        // แยกฟังก์ชันช่วยหาค่าโดยไม่แคร์ case และ space
        // ฟังก์ชันช่วย (วางไว้ก่อน .map())
        function getValueInsensitive(row: any, keyVariants: string[]): string {
            for (const key of Object.keys(row)) {
                for (const variant of keyVariants) {
                    if (key.trim().toLowerCase() === variant.trim().toLowerCase()) {
                        return row[key];
                    }
                }
            }
            return "";
        }

        function isSubGroupPresent(value: string): boolean {
            return value.trim() !== "" && value.trim() !== "-";
        }

        // เริ่ม .map()
        const docs: Document<Record<string, any>>[] = sheetData
            .map((row: any, index: number) => {
                try {
                    const no = getValueInsensitive(row, ["No.", "No"]);
                    const category = getValueInsensitive(row, ["category"]);
                    const group = getValueInsensitive(row, ["group"]);
                    const subGroup = getValueInsensitive(row, ["sub group"]);
                    const description = getValueInsensitive(row, ["Description"]);
                    

                    let businessActivity = "";
                    let groupLine = "";

                    if (isSubGroupPresent(subGroup)) {
                        businessActivity = subGroup;
                        groupLine = `group: ${group}`;
                    } else {
                        businessActivity = group;
                        groupLine = ""; // ซ่อนไม่ให้แสดง group ซ้ำ
                    }

                    const pageContent = `
                        No.: ${no || "-"}
                        Category: ${category || "-"}
                        Business Activity: ${businessActivity || "-"}
                        ${groupLine}
                        ${description || ""}

                        รายละเอียดการอนุมัติ:
                        - BoD: ${getValueInsensitive(row, ["BoD"]) || "ไม่ระบุ"}
                        - EX COM: ${getValueInsensitive(row, ["EX COM"]) || "ไม่ระบุ"}
                        - CEO: ${getValueInsensitive(row, ["CEO"]) || "ไม่ระบุ"}
                        - EVP: ${getValueInsensitive(row, ["EVP"]) || "ไม่ระบุ"}
                        - SVP: ${getValueInsensitive(row, ["SVP"]) || "ไม่ระบุ"}
                        - Div. Head: ${getValueInsensitive(row, ["Div. Head"]) || "ไม่ระบุ"}
                        - SGH (Sales only): ${getValueInsensitive(row, ["SGH\r\n(Sales only)"]) || "ไม่ระบุ"}
                        - Dept. Head: ${getValueInsensitive(row, ["Dept. Head"]) || "ไม่ระบุ"}

                        การอนุมัติร่วม: ${getValueInsensitive(row, ["Co Approval"]) || "ไม่มี"}
                        หมายเหตุ: ${getValueInsensitive(row, ["Remarks"]) || "ไม่มี"}
                        ลิงก์แบบฟอร์ม: ${getValueInsensitive(row, ["Form URL"]) || "-"}
                        หมายเหตุเพิ่มเติม: ${getValueInsensitive(row, ["Note"]) || "-"}
                        `.trim();

                    //metadata 
                    const metadata: Record<string, any> = {
                        source: "DOA_CUSTOME_TEST.xlsx",
                        sheet: sheetName,
                        row: index + 1,
                        "No.": no,
                        "Business Activity": businessActivity,
                        group: group,
                        "sub group": subGroup,
                        "Category": category,
                    
                    };

                    return new Document<Record<string, any>>({
                        pageContent,
                        metadata,
                    });
                } catch (error: unknown) {
                    console.error(`Error processing row ${index + 1}:`, error);
                    console.error("Row data:", row);
                    return null;
                }
            })
            .filter((doc): doc is Document<Record<string, any>> => doc !== null);

        console.log(`Successfully processed ${docs.length} documents`);

        // สร้างโฟลเดอร์ json ถ้ายังไม่มี
        const jsonDir = path.resolve("./data/json");
        if (!fs.existsSync(jsonDir)) {
            fs.mkdirSync(jsonDir, { recursive: true });
        }

        // บันทึกเป็น JSON เพื่อดู structure
        const outputPath = path.resolve("./data/json/doa_processed.json");
        fs.writeFileSync(
            outputPath,
            JSON.stringify(
                {
                    columnNames,
                    sampleRow,
                    totalRows: docs.length,
                    documents: docs.slice(0, 3), // เอาแค่ 3 documents แรกเพื่อดู
                },
                null,
                2
            ),
            "utf8"
        );
        console.log(`Saved processed data to: ${outputPath}`);

        // เพิ่มข้อมูลลง Vector Store
        const supabase = await createClient();

        const vectorStore = new SupabaseVectorStore(
            new OpenAIEmbeddings({ model: "text-embedding-3-large" }),
            {
                client: supabase,
                tableName: "documents_doa",
            }
        );

        console.log("Adding documents to vector store...");
        await vectorStore.addDocuments(docs);

        return NextResponse.json({
            message: `Successfully indexed ${docs.length} documents from Excel file.`,
            details: {
                sourceFile: "DOA_CUSTOME_TEST.xlsx",
                sheetName: sheetName,
                columnNames: columnNames,
                totalDocuments: docs.length,
                sampleDocument: docs[0]
                    ? {
                        pageContent: docs[0].pageContent.substring(0, 300) + "...",
                        metadata: docs[0].metadata,
                    }
                    : null,
            },
        });
    } catch (error: unknown) {
        console.error("Error processing Excel file:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            {
                error: "Failed to process Excel file",
                details: errorMessage,
            },
            { status: 500 }
        );
    }
}