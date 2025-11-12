import { body, param, query, validationResult } from "express-validator";

// ==========================================
//  VALIDATION MIDDLEWARE -- Middleware xác thực
// ==========================================

/**
 * Validation middleware factory -- Nhà máy tạo middleware xác thực
 * Chạy tất cả validation chains và return errors nếu có -- Chạy tất cả chuỗi xác thực và trả về lỗi nếu có
 *
 * @param {Array} validations - Array of express-validator validation chains -- Mảng các chuỗi xác thực express-validator
 * @return {Function} Express middleware function -- Hàm middleware Express
 *
 * @example
 * route.post('/register',
 *  validate(registerSchema),
 *  async (req,res) => {
 *    // Core here chỉ chạy nếu validation pass -- chỉ chạy nếu xác thực thành công
 *  }
 * );
 */

export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations chains parallelly -- Chạy tất cả chuỗi xác thực song song
    await Promise.all(validations.map((validation) => validation.run(req))); // run() là phương thức của express-validator để chạy chuỗi xác thực trên req

    // Collect all validation errors -- Thu thập tất cả lỗi xác thực
    const errors = validationResult(req);

    // If no errors, continue to next middleware/handler -- Nếu không có lỗi, tiếp tục đến middleware/handler tiếp theo
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors -- Định dạng lỗi and return 400 response -- và trả về phản hồi 400
    return res.status(400).json({
      error: "Validation Error", // Thông báo lỗi chung
      details: errors.array().map((err) => ({
        field: err.path || err.param, // Trường bị lỗi
        message: err.msg, // Thông điệp lỗi
        value: err.value, // Giá trị không hợp lệ
        location: err.location || "body", // Vị trí của trường (body, query, params)
      })),
    });
  };
};
