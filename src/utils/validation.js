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

// ==========================================
//  AUTHENTICATION VALIDATION SCHEMA -- Sơ đồ xác thực
// ==========================================

/**
 * Register validation schema -- Sơ đồ xác thực đăng ký
 * Validates: email format, password strength, name length -- Xác thực: định dạng email, độ mạnh mật khẩu, độ dài tên
 *
 * Password requirements:
 * - Min 8 characters -- Tối thiểu 8 ký tự
 * - At least one lowercase letter -- Ít nhất một chữ cái viết thường
 * - At least one uppercase letter -- Ít nhất một chữ cái viết hoa
 * - At least one number -- Ít nhất một chữ số
 * - At least one special character -- Ít nhất một ký tự đặc biệt
 *
 * @example
 * Valid: { email: "user@example.com", password: "StrongP@ssw0rd", name: "John Doe" }
 * Invalid: { email: "user", password: "weak", name: "J" }
 */

export const registerSchema = [
  body("email")
    .trim() // Remove leading/trailing whitespace -- Xóa khoảng trắng đầu/cuối
    .notEmpty()
    .withMessage("Email là bắt buộc") // Email is required -- Email là bắt buộc
    .isEmail()
    .withMessage("Email không hợp lệ") // Invalid email format -- Định dạng email không hợp lệ
    .normalizeEmail() // Normalize email -- Chuẩn hóa email -- chuyển thành chữ thường, loại bỏ dấu chấm thừa
    .isLength({ max: 255 })
    .withMessage("Email không được vượt quá 255 ký tự") // Email max length -- Độ dài tối đa của email
    .custom((email) => {
      // Additional check: email must not contain spaces after normalization -- Kiểm tra bổ sung: email không được chứa khoảng trắng sau khi chuẩn hóa

      if (email.includes(" ")) {
        throw new Error("Email không được chứa khoảng trắng");
      }
      return true;
    }),

  body("password")
    .notEmpty()
    .withMessage("Mật khẩu là bắt buộc") // Password is required -- Mật khẩu là bắt buộc
    .isLength({ min: 8, max: 128 })
    .withMessage("Mật khẩu phải từ 8 đến 128 ký tự") // Password length -- Độ dài mật khẩu
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    )
    .withMessage(
      "Mật khẩu phải chứa ít nhất một chữ cái viết thường, một chữ cái viết hoa, một số và một ký tự đặc biệt"
    ) // Password complexity -- Độ phức tạp mật khẩu --
    // ?=.* là lookahead assertion để kiểm tra sự tồn tại của các ký tự mà không tiêu thụ chúng,
    // không tiêu thụ nghĩa là không di chuyển con trỏ trong chuỗi ví dụ: (?=.*[a-z])
    // kiểm tra ít nhất một chữ cái viết thường mà không di chuyển con trỏ-
    // di chuyển con trỏ là hành động đọc ký tự trong chuỗi
    // [A-Za-z\d@$!%*?&]{8,} tiêu thụ ký tự, nghĩa là con trỏ di chuyển qua từng ký tự để xác nhận toàn bộ chuỗi đáp ứng yêu cầu
    // Ví dụ chạy trên "StrongP@ssw0rd":
    // - (?=.*[a-z]) tìm thấy 't' (con trỏ không di chuyển)
    // - (?=.*[A-Z]) tìm thấy 'S' (con trỏ không di chuyển)
    // - (?=.*\d) tìm thấy '0' (con trỏ không di chuyển)
    // - (?=.*[@$!%*?&]) tìm thấy '@' (con trỏ không di chuyển)
    // - [A-Za-z\d@$!%*?&]{8,} bây giờ con trỏ di chuyển qua từng ký tự để xác nhận toàn bộ chuỗi đáp ứng yêu cầu
    // Kết quả: Mật khẩu hợp lệ
    .custom((password) => {
      // Check for common weak passwords -- Kiểm tra mật khẩu yếu phổ biến
      const weakPasswords = [
        "Password123",
        "12345678",
        "Qwerty123",
        "Admin123",
      ];
      if (weakPasswords.includes(password)) {
        throw new Error("Mật khẩu quá yếu, vui lòng chọn mật khẩu khác");
      }
      return true;
    }),

  body("name")
    .optional({ nullable: true, checkFalsy: true }) // Name is optional -- Tên là tùy chọn -- Allow null, undefined, empty string
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Tên phải từ 2 đến 50 ký tự") // Name length -- Độ dài tên
    .matches(/^[\p{L}\s'-]+$/u)
    .withMessage(
      "Tên chỉ được chứa chữ cái, khoảng trắng, dấu gạch ngang và dấu nháy đơn"
    )
    // Name character set -- Bộ ký tự tên -- +$ nghĩa là toàn bộ chuỗi phải tuân theo mẫu này
    // /^[\p{L}\s'-]+$/u chi tiết:
    // ^ bắt đầu chuỗi
    // [\p{L}\s'-]+ một hoặc nhiều ký tự thuộc các loại sau:
    // \p{L}: bất kỳ ký tự chữ nào từ bất kỳ ngôn ngữ nào (Unicode property escape) -- nghĩa là tất cả chữ cái từ mọi ngôn ngữ
    // \s: ký tự khoảng trắng (space, tab, newline)
    // ': dấu nháy đơn
    // -: dấu gạch ngang
    // $ kết thúc chuỗi
    // /u: cờ Unicode để hỗ trợ các ký tự Unicode
    .custom((name) => {
      // Check for multiple consecutive spaces
      if (/\s{2,}/.test(name)) {
        throw new Error("Tên không được chứa khoảng trắng liên tiếp");
      }
      return true;
    }),
];

/**
 * Login validation schema -- Sơ đồ xác thực đăng nhập
 * Validates: email format, password presence -- Xác thực: định dạng email, sự tồn tại của mật khẩu
 * 
 * Note: No password strength check here -- Lưu ý: Không kiểm tra độ mạnh mật khẩu ở đây
 * 
 * @example
 * Valid: { email: "user@example.com", password: "AnyPassword" }
 * Invalid: { email: "user", password: "" }
 */

export const loginSchema = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email là bắt buộc') // Email is required -- Email là bắt buộc
        .isEmail().withMessage('Email không hợp lệ') // Invalid email format -- Định dạng email không hợp lệ
        .normalizeEmail(), // Normalize email -- Chuẩn hóa email
    body('password')
        .notEmpty().withMessage('Mật khẩu là bắt buộc') // Password is required -- Mật khẩu là bắt buộc.
        .isString().withMessage('Mật khẩu phải là chuỗi ký tự'), // Password must be a string -- Mật khẩu phải là chuỗi ký tự
];

/**
 * Password reset request validation schema -- Sơ đồ xác thực yêu cầu đặt lại mật khẩu
 * Validates: email format -- Xác thực: định dạng email
 * 
 * @example
 * Valid: { email: "example@gmail.com" }"
 * Invalid: { email: "invalid-email" }  
 */

export const passwordResetRequestSchema = [
    body('email')
        .trim() // Remove leading/trailing whitespace -- Xóa khoảng trắng đầu/cuối
        .notEmpty().withMessage('Email là bắt buộc') // Email is required -- Email là bắt buộc
        .isEmail().withMessage('Email không hợp lệ') // Invalid email format -- Định dạng email không hợp lệ
		.normalizeEmail(), // Normalize email -- Chuẩn hóa email
];

 /**
  * Password reset confirmation validation schema -- Sơ đồ xác thực xác nhận đặt lại mật khẩu
  * Validates: token presence, new password strength -- Xác thực: sự tồn tại của token, độ mạnh mật khẩu mới
  * 
  * @example
  * Valid: { token: "valid-token", newPassword: "NewStrongP@ss1" }
  * Invalid: { token: "", newPassword: "weak" }
  */

export const passwordResetConfirmationSchema = [
    body('token')
        .notEmpty().withMessage('Token là bắt buộc') // Token is required -- Token là bắt buộc
        .isLength({ min: 32, max: 64 }).withMessage('Token không hợp lệ'), // Token length check -- Kiểm tra độ dài token
    body('newPassword')
        .notEmpty().withMessage('Mật khẩu mới là bắt buộc') // New password is required -- Mật khẩu mới là bắt buộc
        .isLength({ min: 8, max: 128 }).withMessage('Mật khẩu mới phải từ 8 đến 128 ký tự') // New password length -- Độ dài mật khẩu mới
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/).withMessage('Mật khẩu mới phải chứa ít nhất một chữ cái viết thường, một chữ cái viết hoa, một số và một ký tự đặc biệt') // New password complexity -- Độ phức tạp mật khẩu mới)
        .custom((password) => {
            // Check for common weak passwords -- Kiểm tra mật khẩu yếu phổ biến
            const weakPasswords = [
                "Password123",
                "12345678",
                "Qwerty123",
                "Admin123",
            ];
            if (weakPasswords.includes(password)) {
                throw new Error("Mật khẩu quá yếu, vui lòng chọn mật khẩu khác");
            }
            return true;
        }),
];