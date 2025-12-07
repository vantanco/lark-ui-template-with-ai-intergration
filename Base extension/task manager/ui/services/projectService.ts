
import { Project } from "../types";
import { parseCSV } from "../utils/csvHelper";
import { CSV_SOURCE_FILE } from "../data/projects";

/**
 * Interface cho nguồn dữ liệu. 
 * Sau này bạn có thể tạo APIProjectSource hoặc DatabaseProjectSource tuân thủ interface này.
 */
interface ProjectSource {
  fetchData(): Promise<string>;
}

/**
 * Giả lập việc đọc file từ server hoặc local.
 * Hiện tại đang lấy từ biến string, nhưng cấu trúc code giống như đang gọi network request.
 */
const getRawCsvData = async (): Promise<string> => {
  // Giả lập độ trễ mạng (Network latency)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(CSV_SOURCE_FILE);
    }, 800); 
  });
};

/**
 * Hàm lấy danh sách dự án.
 * TRONG TƯƠNG LAI: Chỉ cần sửa logic trong hàm này để gọi API thay vì getRawCsvData.
 */
export const fetchProjects = async (): Promise<Project[]> => {
  try {
    // 1. Lấy dữ liệu thô (từ CSV file, API, hoặc DB)
    const rawData = await getRawCsvData();
    
    // 2. Parse dữ liệu sang format của App
    const projects = parseCSV(rawData);
    
    return projects;
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    throw new Error("Could not load project data source.");
  }
};
