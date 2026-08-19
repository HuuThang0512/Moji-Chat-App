/**
 * Parse một phần của request bằng schema zod và ghi đè bằng dữ liệu đã chuẩn hoá.
 * Lỗi ZodError được errorHandler dịch thành response 400 kèm danh sách field.
 */
const validate = (source) => (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req[source] ?? {});
    if (source === "query") {
      // Express 5 để req.query ở dạng getter chỉ đọc.
      req.validatedQuery = parsed;
    } else {
      req[source] = parsed;
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

export const validateBody = validate("body");
export const validateQuery = validate("query");
export const validateParams = validate("params");
