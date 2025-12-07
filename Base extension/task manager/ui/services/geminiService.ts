
import { GoogleGenAI } from "@google/genai";
import { Project } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeProjects = async (projects: Project[]): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }

  const projectData = JSON.stringify(projects);

  const prompt = `
    Bạn là Trợ lý Quản lý Dự án cấp cao (Senior Project Manager Assistant) cho một công ty tại Việt Nam. 
    Hãy phân tích dữ liệu dự án dưới đây (được cung cấp dạng JSON).

    Dữ liệu:
    ${projectData}

    Hãy cung cấp một bản báo cáo tóm tắt dành cho Ban Giám đốc (Executive Summary) bằng Tiếng Việt (Markdown format), bao gồm:
    1. **Tình hình chung (Overall Health)**: Đánh giá ngắn gọn về tiến độ danh mục dự án.
    2. **Rủi ro trọng yếu (Key Risks)**: Chỉ mặt đặt tên các dự án đang ở trạng thái "Blocked" (Bị tắc) hoặc "Critical" (Khẩn cấp) cần lưu ý gấp.
    3. **Phân tích ngân sách (Budget)**: Nhận xét về cách phân bổ dòng tiền.
    4. **Khuyến nghị hành động (Actions)**: 3 gạch đầu dòng cụ thể về việc Sếp cần làm ngay hôm nay.

    Giọng văn chuyên nghiệp, gãy gọn, quyết đoán (Executive style).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Không thể tạo phân tích.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Lỗi khi kết nối với AI. Vui lòng thử lại sau.";
  }
};
