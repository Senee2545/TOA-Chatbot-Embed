/* eslint-disable @typescript-eslint/no-explicit-any */
// http://localhost:3000/api/Main-RAG

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

        // Step 1: จัดกลุ่มข้อมูลตาม Category
        const groupedByCategory: Record<string, any[]> = {};

        sheetData.forEach((row: any, index: number) => {
            try {
                const no = getValueInsensitive(row, ["No.", "No"]);
                const category = getValueInsensitive(row, ["category"]);
                const group = getValueInsensitive(row, ["group"]);
                const subGroup = getValueInsensitive(row, ["sub group"]);

                let businessActivity = "";
                if (isSubGroupPresent(subGroup)) {
                    businessActivity = subGroup;
                } else {
                    businessActivity = group;
                }

                const rowData = {
                    no,
                    category,
                    businessActivity,
                    group,
                    subGroup,
                };

                if (!groupedByCategory[category]) {
                    groupedByCategory[category] = [];
                }
                groupedByCategory[category].push(rowData);

            } catch (error: unknown) {
                console.error(`Error processing row ${index + 1}:`, error);
            }
        });

        // Step 2: สร้าง summary documents เฉพาะ
        const docs: Document<Record<string, any>>[] = Object.entries(groupedByCategory).map(([category, rows]) => {
            let pageContent = `Category: ${category}\n`;
            
            rows.forEach((rowData: any) => {
                const { no, businessActivity, group } = rowData;
                
                // เพิ่ม No. และ Business Activity
                pageContent += `No.: ${no} Business Activity: ${businessActivity}\n`;
                
                // เพิ่ม group ถ้ามี และไม่ใช่ "-" และไม่ซ้ำกับ businessActivity
                if (group && group !== "-" && group !== businessActivity) {
                    pageContent += `group: ${group}\n`;
                }
            });

            // หา category number สำหรับ metadata
            const categoryNumber = category.split('.')[0] || category.substring(0, 1);

            return new Document<Record<string, any>>({
                pageContent: pageContent.trim(),
                metadata: {
                    source: "DOA_CUSTOME_TEST.xlsx",
                    sheet: sheetName,
                    "No.": categoryNumber,
                    "Business Activity": `${category}`,
                    group: category,
                    "sub group": "-",
                    "Category": category,
                }
            });
        });

        console.log(`Successfully processed ${docs.length} summary documents`);

        // สร้างโฟลเดอร์ json ถ้ายังไม่มี
        const jsonDir = path.resolve("./data/json");
        if (!fs.existsSync(jsonDir)) {
            fs.mkdirSync(jsonDir, { recursive: true });
        }

        // บันทึก JSON file (optional)
        const summaryData = {
            sourceInfo: {
                sourceFile: "DOA_CUSTOME_TEST.xlsx",
                sheetName: sheetName,
                processedDate: new Date().toISOString(),
                totalCategories: docs.length,
                totalOriginalRows: sheetData.length
            },
            documents: docs.map((doc, index) => ({
                id: index + 1,
                pageContent: doc.pageContent,
                metadata: doc.metadata
            }))
        };

        const outputPath = path.resolve("./data/json/doa_summary_only.json");
        fs.writeFileSync(outputPath, JSON.stringify(summaryData, null, 2), "utf8");
        console.log(`Saved summary data to: ${outputPath}`);

        // เพิ่มข้อมูลลง Vector Store
        const supabase = await createClient();

        const vectorStore = new SupabaseVectorStore(
            new OpenAIEmbeddings({ model: "text-embedding-3-large" }),
            {
                client: supabase,
                tableName: "main",
            }
        );

        console.log("Adding summary documents to vector store...");
        await vectorStore.addDocuments(docs);

        return NextResponse.json({
            message: `Successfully indexed ${docs.length} summary documents from Excel file.`,
            details: {
                sourceFile: "DOA_CUSTOME_TEST.xlsx",
                sheetName: sheetName,
                columnNames: columnNames,
                totalDocuments: docs.length,
                totalOriginalRows: sheetData.length,
                outputFile: "./data/json/doa_summary_only.json",
                categories: docs.map(doc => ({
                    category: doc.metadata.Category,
                    itemCount: doc.metadata.totalItems,
                    categoryNo: doc.metadata["No."]
                })),
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