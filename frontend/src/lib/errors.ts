import { AxiosError } from "axios";

interface ApiErrorBody {
  message?: string;
  errors?: { field: string; message: string }[];
}

/**
 * Lấy thông báo lỗi dễ hiểu nhất có thể từ một lỗi bất kỳ.
 * Backend trả về { message } cho lỗi thường và thêm { errors } cho lỗi
 * validate, nên ưu tiên hiển thị lỗi validate đầu tiên vì nó cụ thể nhất.
 */
export const getErrorMessage = (error: unknown, fallback = "Đã có lỗi xảy ra"): string => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorBody | undefined;
    const firstFieldError = data?.errors?.[0]?.message;
    if (firstFieldError) return firstFieldError;
    if (data?.message) return data.message;
    if (error.code === "ERR_NETWORK") return "Không kết nối được tới máy chủ";
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

/** Trả về map field -> thông báo, dùng để gắn lỗi vào đúng ô nhập trong form. */
export const getFieldErrors = (error: unknown): Record<string, string> => {
  if (!(error instanceof AxiosError)) return {};
  const data = error.response?.data as ApiErrorBody | undefined;
  return Object.fromEntries((data?.errors ?? []).map((item) => [item.field, item.message]));
};
