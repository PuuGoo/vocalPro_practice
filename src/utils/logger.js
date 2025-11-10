import winston from "winston";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log } from "console";

// Lấy __dirname trong ES module
// // Dấu "__" trong "__filename" để nhận biết đây là biến hệ thống
const __filename = fileURLToPath(import.meta.url); // import.meta.url: trả về URL dạng file:/// --- fileURLToPath: chuyển URL thành đường dẫn hệ thống(chuỗi)
console.log("Đường dẫn file hiện tại: ", __filename);
const __dirname = path.dirname(__filename); // Lấy thư mục chứa file hiện tại
console.log("Thư mục hiện tại: ", __dirname);

// Detect Deployment Environment - Phát hiện môi trường triển khai
const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

// Platform Detection - Phát hiện nền tảng
const isVercel = process.env.VERCEL === "1";
const isRender = process.env.RENDER === "true";
const isHeroku = !!process.env.DYNO;
const isNetlify = process.env.NETLIFY === "true";
const isAWS = !!process.env.AWS_EXECUTION_ENV;
const isLocal = !isVercel && !isRender && !isHeroku && !isNetlify && !isAWS;

// Serverless Platforms - Nền tảng không máy chủ --- Serverless = Chỉ viết logic, còn server (máy chủ, scale, hạ tầng, bảo trì) do nền tảng lo. --- Read-only filesystem
const isServerless = isVercel || isNetlify || isAWS;

// Log Directory Setup - Thiết lập thư mục lưu log
let logsDir = null;
let canWriteToFile = false;

if (!isServerless && !isTest) {
  // Chỉ tạo thư mục log nếu không phải môi trường serverless và test

  try {
    logsDir = path.join(__dirname, "../../logs"); // Đường dẫn thư mục logs

    // Tạo thư mục logs nếu chưa tồn tại
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true }); // { recursive: true } cho phép tạo thư mục kèm toàn bộ thư mục cha nếu chúng chưa tồn tại.
    }

    // Kiểm tra quyền ghi vào thư mục logs -- Test write permission
    const testFile = path.join(logsDir, ".write-test"); // Tạo file tạm để kiểm tra quyền ghi
    fs.writeFileSync(testFile, "test"); // Ghi file tạm
    fs.unlinkSync(testFile); // Xoá file tạm

    canWriteToFile = true; // Có thể ghi vào file
  } catch (error) {
    console.warn("Không thể tạo hoặc ghi vào thư mục logs:", error.message);
    console.warn("Sẽ chỉ ghi log ra console.");
    canWriteToFile = false;
  }
}
