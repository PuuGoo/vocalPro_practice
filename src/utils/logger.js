import dotenv from "dotenv";
import winston from "winston";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { log, time } from "console";
import { platform } from "os";

// Lấy __dirname trong ES module
// // Dấu "__" trong "__filename" để nhận biết đây là biến hệ thống
const __filename = fileURLToPath(import.meta.url); // import.meta.url: trả về URL dạng file:/// --- fileURLToPath: chuyển URL thành đường dẫn hệ thống(chuỗi)
console.log("Đường dẫn file hiện tại: ", __filename);
const __dirname = path.dirname(__filename); // Lấy thư mục chứa file hiện tại
console.log("Thư mục hiện tại: ", __dirname);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Detect Deployment Environment - Phát hiện môi trường triển khai
const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";
console.log(process.env.NODE_ENV);
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

// ==========================================
//  Winston Logger Configuration - Cấu hình Winston Logger
// ==========================================

// Base format for all logs - Định dạng cơ bản cho tất cả logs
const baseFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss", // Định dạng dấu thời gian
  }), // Thêm dấu thời gian
  winston.format.errors({ stack: true }), // Ghi nhận stack trace cho lỗi -- Stack trace: thông tin về ngăn xếp cuộc gọi khi lỗi xảy ra
  winston.format.splat(), // Cho phép sử dụng định dạng chuỗi giống printf(printf-style string formatting)
  winston.format.json() // Ghi log dưới dạng JSON
);

// Console format (colorized for development) - Định dạng cho console (có màu cho môi trường phát triển)
const consoleFormat = winston.format.combine(
  winston.format.colorize(), // Màu sắc cho console
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : "";
    return `${timestamp} [${level}] ${
      service ? `[${service}]` : ""
    } : ${message} ${metaStr}`;
  })
);

// Create logger instance - Khởi tạo đối tượng ghi log
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || isProduction ? "info" : "debug", // Mức log: debug cho dev, info cho production // Ngưỡng level: chỉ ghi log từ mức này trở lên -- Mức độ log: error < warn < info < http < verbose < debug < silly
  format: baseFormat,
  defaultMeta: {
    service: "vocalpro-backend",
    environment: process.env.NODE_ENV || "development",
    platform: isVercel
      ? "vercel"
      : isRender
      ? "render"
      : isHeroku
      ? "heroku"
      : isNetlify
      ? "netlify"
      : isAWS
      ? "aws"
      : "local",
  },
  transports: [
    new winston.transports.Console({
      format: isProduction ? winston.format.json() : consoleFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
  ], // transports là mảng các phương tiện ghi log
  exitOnError: isProduction, // true: thoát ứng dụng khi gặp lỗi không xử lý
});

// File transports (Only for non-serverless) - Phương tiện ghi log vào file (Chỉ cho môi trường không phải serverless)
if (canWriteToFile && logsDir) {
  logger.info("File logging is enabled. Logs directory:", { logsDir });

  // Error log file -- Ghi log lỗi
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      handleExceptions: true,
    })
  );

  // Combined log file -- Ghi tất cả log
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );

  // Warning log file (Only for production) -- Ghi log cảnh báo (Chỉ cho môi trường production)
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, "warn.log"),
      level: "warn",
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    })
  );
} else {
  // Log platform info if file logging is disabled -- Ghi nhận thông tin nền tảng nếu không ghi log vào file
  const reason = isServerless
    ? "serverless platform (read-only filesystem)"
    : isTest
    ? "test environment"
    : "cannot create logs directory";
  logger.info(`File logging is disabled: ${reason}`);
}

// ==========================================
//  Platform - Specific Integrations - Tích hợp đặc thù nền tảng
// ==========================================

// Render.com: Use their logging service -- Ghi log qua dịch vụ của họ
if (isRender) {
  logger.info("🔧 Running on Render.com - logs will be captured by Render");
}

// Heroku: Use their logging service -- Ghi log qua dịch vụ của họ
if (isHeroku) {
  logger.info("🔧 Running on Heroku - logs will be captured by Logplex");
}

// Vercel: Logs automatically captured -- Ghi log tự động được thu thập
if (isVercel) {
  logger.info("🔧 Running on Vercel - logs will be captured automatically");
}

// AWS Lambda: Use CloudWatch -- Ghi log qua CloudWatch
if (isAWS) {
  logger.info("🔧 Running on AWS - logs will be sent to CloudWatch");
}

// ==========================================
// Graceful Shutdown -- Tắt logger một cách nhẹ nhàng
// ==========================================
const gracefulShutdown = async () => {
  // Đảm bảo log được ghi nốt trước khi server tắt
  logger.info("Shutting down logger...");

  return new Promise((resolve) => {
    logger.on("finish", () => {
      console.log("✅ Logger closed successfully");
      resolve();
    });

    logger.end();
  });
};

// Handle process termination signals - Xử lý tín hiệu kết thúc tiến trình -- Hãy handle trong ứng dụng của bạn, chứ không phải trong file logger
// process.on("SIGINT", gracefulShutdown);
// process.on("SIGTERM", gracefulShutdown);

// ==========================================
//  Export Logger & Utilities
// ==========================================
export default logger;
export const loggerConfig = {
  canWriteToFile,
  logsDir,
  isProduction,
  isServerless,
  isTest,
  platform: isVercel
    ? "vercel"
    : isRender
    ? "render"
    : isHeroku
    ? "heroku"
    : isNetlify
    ? "netlify"
    : isAWS
    ? "aws"
    : "local",
};

// ==========================================
//  Helper Methods -- Các phương thức hỗ trợ
// ==========================================

/**
 * Create a child logger with additional default metadata -- Tạo logger con với metadata mặc định bổ sung
 * @param {Object} defaultMeta - Additional default metadata -- Metadata mặc định bổ sung
 * @return {Object} child logger instance -- Đối tượng logger con
 */
export const createChildLogger = (defaultMeta) => {
  return logger.child(defaultMeta);
};

/**
 * Log HTTP requests -- Ghi log các yêu cầu HTTP
 * @param {Object} req - Express request object -- Đối tượng yêu cầu Express
 */
export const logHttpRequest = (req) => {
  logger.http("HTTP Request", {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
};

/**
 * Log Database queries -- Ghi log các truy vấn cơ sở dữ liệu
 * @param {string} query - The database query -- Truy vấn cơ sở dữ liệu
 * @param {number} duration - Duration of the query in milliseconds -- Thời gian thực hiện truy vấn (ms)
 */
export const logDbQuery = (query, duration) => {
  logger.debug("DB Query", {
    query: query.substring(0, 100), // Log only first 100 characters -- Chỉ ghi log 100 ký tự đầu
    durationMs: ` ${duration} ms`,
  });
};

/**
 * Log with custom context -- Ghi log với ngữ cảnh tùy chỉnh
 * @param {string} level - Log level (e.g., 'info', 'error') -- Mức độ log (ví dụ: 'info', 'error')
 * @param {string} message - Log message -- Thông điệp log
 * @param {Object} context - Additional context metadata -- Metadata ngữ cảnh bổ sung
 */
export const logWithContext = (level, message, context = {}) => {
  logger.log(level, message, {
    ...context,
    timestamp: new Date().toISOString(),
  });
};
