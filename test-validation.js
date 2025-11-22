import { body } from "express-validator";
import {
  validate,
    registerSchema,
    loginSchema,
    passwordResetRequestSchema,
    passwordResetConfirmationSchema,
	changePasswordSchema
} from "../vocalpro-backend/src/utils/validation.js";


// const validations = [
//   body("email").isEmail().withMessage("Email không hợp lệ"),
//   body("password")
//     .isLength({ min: 6 })
//     .withMessage("Mật khẩu phải có ít nhất 6 ký tự"),
// ];

const mockReq = {
    body: {
        currentPassword: "oldpassword123",
        newPassword: "NewPassword@123",
        confirmNewPassword: "NewPassword@123"
  }
};

const mockRes = {
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    console.log("Response gửi về client");
    console.log(JSON.stringify(payload, null, 2));
  },
};

const mockNext = () => {
  console.log("Validation passed! next() được gọi");
};

(async () => {
    const middleware = validate(changePasswordSchema);
  await middleware(mockReq, mockRes, mockNext);
})();
