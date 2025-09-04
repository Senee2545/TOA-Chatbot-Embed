import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getDOARetriever } from "./doa_retriever";
import { getDOA_Main_Retriever } from "./doa_main_retriever";

// กำหนด interface สำหรับ results
interface DOASearchResults {
    searchQuery: string;
    searchType: string;
    overview: {
        found: boolean;
        totalCategories: number;
        categories: Array<{
            category: string;
            content: string;
            totalItems: number | string;
        }>;
    } | null;
    details: {
        found: boolean;
        totalDetails: number;
        items: Array<{
            no: string;
            category: string;
            businessActivity: string;
            content: string;
        }>;
    } | null;
}

const doaDualSearchSchema = z.object({
    query: z.string().describe("คำค้นหาเกี่ยวกับ DOA"),
    searchType: z.enum(["overview", "detail", "both"]).default("both").describe("ประเภทการค้นหา: overview=หัวข้อรวม, detail=รายละเอียด, both=ทั้งสอง"),
    category: z.string().optional().describe("หมวดหมู่เฉพาะ"),
    businessActivityNo: z.string().optional().describe("เลขที่กิจกรรม")
});

// const doaDualSearchTool = tool(
//     async ({ query, searchType, category, businessActivityNo }): Promise<string> => {
//         try {
//             console.log('🔍 DOA Dual Search called with:', { query, searchType, category, businessActivityNo });

//             let searchQuery = query;
//             if (category) searchQuery += ` category:${category}`;
//             if (businessActivityNo) searchQuery += ` No.:${businessActivityNo}`;

//             const results: DOASearchResults = {
//                 searchQuery,
//                 searchType,
//                 overview: null,
//                 details: null
//             };

//             // Step 1: ค้นหา Overview (Summary Table) - ใช้ getDOA_Main_Retriever
//             if (searchType === "overview" || searchType === "both") {
//                 try {
//                     const summaryRetriever = await getDOA_Main_Retriever(); // Main table (Summary)
//                     const summaryDocs = await summaryRetriever.invoke(searchQuery);
                    
//                     if (summaryDocs.length > 0) {
//                         results.overview = {
//                             found: true,
//                             totalCategories: summaryDocs.length,
//                             categories: summaryDocs.slice(0, 3).map(doc => ({
//                                 category: doc.metadata.Category || "ไม่ระบุ",
//                                 content: doc.pageContent,
//                                 totalItems: doc.metadata.totalItems || "ไม่ระบุ"
//                             }))
//                         };
//                         console.log('📊 Found overview data:', results.overview.totalCategories, 'categories');
//                     }
//                 } catch (error) {
//                     console.error('Overview search error:', error);
//                 }
//             }

//             // Step 2: ค้นหา Details (Detail Table) - ใช้ getDOARetriever
//             if (searchType === "detail" || searchType === "both") {
//                 try {
//                     const detailRetriever = await getDOARetriever(); // Detail table
//                     const detailDocs = await detailRetriever.invoke(searchQuery);
                    
//                     if (detailDocs.length > 0) {
//                         results.details = {
//                             found: true,
//                             totalDetails: detailDocs.length,
//                             items: detailDocs.slice(0, 5).map(doc => ({
//                                 no: doc.metadata["No."] || "ไม่ระบุ",
//                                 category: doc.metadata.Category || "ไม่ระบุ",
//                                 businessActivity: doc.metadata["Business Activity"] || "ไม่ระบุ",
//                                 content: doc.pageContent.substring(0, 800) + (doc.pageContent.length > 800 ? "..." : "")
//                             }))
//                         };
//                         console.log('📋 Found detail data:', results.details.totalDetails, 'items');
//                     }
//                 } catch (error) {
//                     console.error('Detail search error:', error);
//                 }
//             }

//             // Step 3: ตัดสินใจว่าควรแสดงอะไร
//             if (!results.overview?.found && !results.details?.found) {
//                 return JSON.stringify({
//                     message: "ไม่พบข้อมูลที่ตรงกับคำค้นหา",
//                     searchQuery: searchQuery,
//                     suggestions: [
//                         "ลองใช้คำค้นหาที่กว้างขึ้น เช่น 'employee', 'training', 'payroll'",
//                         "ตรวจสอบการสะกดคำ",
//                         "ลองค้นหาเป็นภาษาอังกฤษหรือไทย"
//                     ]
//                 });
//             }

//             return JSON.stringify(results, null, 2);

//         } catch (error: unknown) {
//             console.error('DOA Dual Search Error:', error);
//             return JSON.stringify({
//                 error: "เกิดข้อผิดพลาดในการค้นหา",
//                 message: error instanceof Error ? error.message : "Unknown error",
//                 searchQuery: query
//             });
//         }
//     },
//     {
//         name: "doaDualSearch",
//         description: `ค้นหาข้อมูล DOA ทั้งระดับ overview และ detail:
//         - overview: ดูหัวข้อรวมในแต่ละหมวดหมู่
//         - detail: ดูรายละเอียดแต่ละรายการ
//         - both: ค้นหาทั้งสองระดับ`,
//         schema: doaDualSearchSchema
//     }
// );


const doaDualSearchTool = tool(
    async ({ query, searchType, category, businessActivityNo }): Promise<string> => {
        try {
            console.log('🔍 DOA Dual Search called with:', { query, searchType, category, businessActivityNo });

            let searchQuery = query;
            if (category) searchQuery += ` category:${category}`;
            if (businessActivityNo) searchQuery += ` No.:${businessActivityNo}`;

            // 🧠 Smart Logic: ตัดสินใจ searchType ตามความเฉพาะของคำถาม
            let finalSearchType = searchType;
            
            // คำทั่วไป → เฉพาะ overview
            const broadKeywords = [
                'การตลาด', 'marketing', 'พนักงาน', 'employee', 'การเงิน', 'finance', 
                'ธุรการ', 'admin', 'จัดซื้อ', 'procurement', 'ลงทุน', 'investment',
                'logistics', 'shipping', 'มีอะไรบ้าง', 'ประเภท', 'หมวดหมู่'
            ];
            
            // คำเฉพาะ → detail หรือ both
            const specificKeywords = [
                'งานเลี้ยงปีใหม่', 'new year', 'เงินเดือน', 'payroll', 'ฝึกอบรม', 'training',
                'ค่าเดินทาง', 'travel', 'ประกันสุขภาพ', 'insurance', 'ลาป่วย', 'sick leave'
            ];

            const isGenericQuery = broadKeywords.some(keyword => 
                query.toLowerCase().includes(keyword.toLowerCase())
            );
            
            const isSpecificQuery = specificKeywords.some(keyword => 
                query.toLowerCase().includes(keyword.toLowerCase())
            );

            if (isGenericQuery && !isSpecificQuery) {
                finalSearchType = "overview";
                console.log('🎯 Detected generic query, using overview only');
            } else if (isSpecificQuery) {
                finalSearchType = "both";
                console.log('🎯 Detected specific query, using both');
            }

            const results: DOASearchResults = {
                searchQuery,
                searchType: finalSearchType,
                overview: null,
                details: null
            };

            // Step 1: ค้นหา Overview (ถ้าต้องการ)
            if (finalSearchType === "overview" || finalSearchType === "both") {
                try {
                    const summaryRetriever = await getDOA_Main_Retriever();
                    const summaryDocs = await summaryRetriever.invoke(searchQuery);
                    
                    if (summaryDocs.length > 0) {
                        results.overview = {
                            found: true,
                            totalCategories: summaryDocs.length,
                            categories: summaryDocs.map(doc => ({
                                category: doc.metadata.Category || "ไม่ระบุ",
                                content: doc.pageContent,
                                totalItems: doc.metadata.totalItems || "ไม่ระบุ"
                            }))
                        };
                        console.log('📊 Found overview data:', results.overview.totalCategories, 'categories');
                    }
                } catch (error) {
                    console.error('Overview search error:', error);
                }
            }

            // Step 2: ค้นหา Details (ถ้าต้องการ)
            if (finalSearchType === "detail" || finalSearchType === "both") {
                try {
                    const detailRetriever = await getDOARetriever();
                    const detailDocs = await detailRetriever.invoke(searchQuery);
                    
                    if (detailDocs.length > 0) {
                        results.details = {
                            found: true,
                            totalDetails: detailDocs.length,
                            items: detailDocs.map(doc => ({
                                no: doc.metadata["No."] || "ไม่ระบุ",
                                category: doc.metadata.Category || "ไม่ระบุ",
                                businessActivity: doc.metadata["Business Activity"] || "ไม่ระบุ",
                                content: doc.pageContent.substring(0, 800) + (doc.pageContent.length > 800 ? "..." : "")
                            }))
                        };
                        console.log('📋 Found detail data:', results.details.totalDetails, 'items');
                    }
                } catch (error) {
                    console.error('Detail search error:', error);
                }
            }

            // Step 3: เพิ่ม recommendation logic
            if (results.overview?.found && !results.details?.found) {
                return JSON.stringify({
                    ...results,
                    userGuidance: {
                        type: "category_selection",
                        message: "พบหัวข้อที่เกี่ยวข้อง กรุณาเลือกหัวข้อที่ต้องการรายละเอียด:",
                        nextAction: "โปรดระบุหัวข้อเฉพาะเจาะจงเพื่อดูรายละเอียดการอนุมัติ"
                    }
                }, null, 2);
            }

            // ไม่พบข้อมูล
            if (!results.overview?.found && !results.details?.found) {
                return JSON.stringify({
                    message: "ไม่พบข้อมูลที่ตรงกับคำค้นหา",
                    searchQuery: searchQuery,
                    suggestions: [
                        "ลองใช้คำค้นหาที่กว้างขึ้น เช่น 'employee', 'training', 'payroll'",
                        "ตรวจสอบการสะกดคำ",
                        "ลองค้นหาเป็นภาษาอังกฤษหรือไทย"
                    ]
                });
            }

            return JSON.stringify(results, null, 2);

        } catch (error: unknown) {
            console.error('DOA Dual Search Error:', error);
            return JSON.stringify({
                error: "เกิดข้อผิดพลาดในการค้นหา",
                message: error instanceof Error ? error.message : "Unknown error",
                searchQuery: query
            });
        }
    },
    {
        name: "doaDualSearch",
        description: `ค้นหาข้อมูล DOA อัจฉริยะ:
        - ตรวจจับคำถามกว้างๆ แล้วแสดงหัวข้อให้เลือก
        - ตรวจจับคำถามเฉพาะแล้วแสดงรายละเอียดเต็ม
        - รองรับทั้งภาษาไทยและอังกฤษ`,
        schema: doaDualSearchSchema
    }
);

export { doaDualSearchTool };