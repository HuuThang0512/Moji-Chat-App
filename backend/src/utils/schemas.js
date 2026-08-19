import { z } from "zod";

export const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Id không hợp lệ");

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username tối thiểu 3 ký tự")
  .max(30, "Username tối đa 30 ký tự")
  .regex(/^[a-z0-9._-]+$/, "Username chỉ gồm chữ, số và . _ -");

const password = z
  .string()
  .min(6, "Mật khẩu tối thiểu 6 ký tự")
  .max(128, "Mật khẩu tối đa 128 ký tự");

const displayNamePart = z
  .string()
  .trim()
  .min(1, "Không được để trống")
  .max(50, "Tối đa 50 ký tự");

export const signUpSchema = z.object({
  username,
  password,
  email: z.email("Email không hợp lệ").trim().toLowerCase(),
  firstName: displayNamePart,
  lastName: displayNamePart,
});

export const signInSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Username là bắt buộc"),
  password: z.string().min(1, "Mật khẩu là bắt buộc"),
});

export const sendFriendRequestSchema = z.object({
  to: objectId,
  message: z.string().trim().max(300, "Lời nhắn tối đa 300 ký tự").optional(),
});

export const createConversationSchema = z
  .object({
    type: z.enum(["direct", "group"]),
    memberIds: z.array(objectId).min(1, "Cần ít nhất một thành viên"),
    name: z.string().trim().min(1).max(80).optional(),
  })
  .refine((data) => data.type !== "direct" || data.memberIds.length === 1, {
    message: "Chat riêng chỉ nhận đúng một thành viên",
    path: ["memberIds"],
  })
  .refine((data) => data.type !== "group" || data.memberIds.length >= 2, {
    message: "Nhóm cần ít nhất hai thành viên khác bạn",
    path: ["memberIds"],
  })
  .refine((data) => data.type !== "group" || Boolean(data.name), {
    message: "Nhóm cần có tên",
    path: ["name"],
  });

const messageContent = z
  .string()
  .trim()
  .min(1, "Nội dung tin nhắn không được để trống")
  .max(5000, "Tin nhắn tối đa 5000 ký tự");

export const sendDirectMessageSchema = z.object({
  recipientId: objectId,
  content: messageContent,
  imgUrl: z.url("Đường dẫn ảnh không hợp lệ").optional(),
  conversationId: objectId.optional(),
});

export const sendGroupMessageSchema = z.object({
  conversationId: objectId,
  content: messageContent,
  imgUrl: z.url("Đường dẫn ảnh không hợp lệ").optional(),
});

export const conversationIdParamSchema = z.object({
  conversationId: objectId,
});

export const requestIdParamSchema = z.object({
  requestId: objectId,
});

/** Query string rỗng ("?cursor=") phải được coi như không truyền, không phải giá trị sai. */
const emptyStringToUndefined = (value) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const getMessagesQuerySchema = z.object({
  limit: z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(1).max(100).default(50)),
  cursor: z.preprocess(
    emptyStringToUndefined,
    z
      .string()
      .trim()
      .refine((value) => !Number.isNaN(new Date(value).getTime()), "Cursor không hợp lệ")
      .optional()
  ),
});

export const searchUserQuerySchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Username là bắt buộc"),
});
