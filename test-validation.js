import { body } from "express-validator";
import {
  validate,
  registerSchema,
} from "../vocalpro-backend/src/utils/validation.js";

// const validations = [
//   body("email").isEmail().withMessage("Email không hợp lệ"),
//   body("password")
//     .isLength({ min: 6 })
//     .withMessage("Mật khẩu phải có ít nhất 6 ký tự"),
// ];

const mockReq = {
  body: {
    email: "phund@gmail.com",
    password: "Abc@12356789",
    name: "puugoo",
  },
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
  const middleware = validate(registerSchema);
  await middleware(mockReq, mockRes, mockNext);
})();
