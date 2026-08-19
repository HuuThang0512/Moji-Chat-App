/**
 * Lỗi có chủ đích của ứng dụng - error handler tập trung sẽ trả đúng status
 * và message này về client. Mọi lỗi khác được coi là lỗi 500 không lường trước.
 */
export class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

export const badRequest = (message, details) => new AppError(400, message, details);
export const unauthorized = (message = "Unauthorized") => new AppError(401, message);
export const forbidden = (message = "Forbidden") => new AppError(403, message);
export const notFound = (message = "Not found") => new AppError(404, message);
export const conflict = (message) => new AppError(409, message);

/**
 * Bọc một async route handler để lỗi ném ra được đẩy sang error handler,
 * thay vì phải try/catch lặp lại trong từng controller.
 */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
