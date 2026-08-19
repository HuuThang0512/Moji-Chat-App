import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { env } from "../config/env.js";

export const notFoundHandler = (req, res) => {
  return res.status(404).json({ message: `Không tìm thấy route ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars -- Express nhận diện error handler qua đủ 4 tham số
export const errorHandler = (error, req, res, next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Dữ liệu gửi lên không hợp lệ",
      errors: error.issues.map((issue) => ({
        field: issue.path.join(".") || "_",
        message: issue.message,
      })),
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  // Vi phạm unique index của Mongo
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern ?? {})[0] ?? "giá trị";
    return res.status(409).json({ message: `${field} đã tồn tại` });
  }

  if (error?.name === "CastError") {
    return res.status(400).json({ message: `${error.path} không hợp lệ` });
  }

  if (error?.name === "MulterError") {
    const message =
      error.code === "LIMIT_FILE_SIZE" ? "File vượt quá dung lượng cho phép" : error.message;
    return res.status(400).json({ message });
  }

  console.error(`[${req.method} ${req.originalUrl}]`, error);
  return res.status(500).json({
    message: "Internal server error",
    ...(env.isProduction ? {} : { error: error?.message }),
  });
};
