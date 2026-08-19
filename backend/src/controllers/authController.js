import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import { env } from "../config/env.js";
import { asyncHandler, badRequest, conflict, unauthorized } from "../utils/AppError.js";
import { issueToken, consumeToken } from "../utils/tokenHelper.js";
import { sendVerifyEmail, sendResetPasswordEmail } from "../libs/mailer.js";

const ACCESS_TOKEN_TTL = "30m";
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;
const REFRESH_COOKIE = "refreshToken";

/**
 * Cookie chứa refresh token.
 *
 * sameSite luôn là "lax" vì backend phục vụ luôn frontend, tức là cùng origin.
 * Không dùng "none": cookie SameSite=None là cookie bên thứ ba, Safari chặn sẵn
 * và Chrome đang chặn dần, hậu quả là /auth/refresh không nhận được cookie và
 * người dùng bị đăng xuất mỗi khi access token hết hạn.
 *
 * secure chỉ bật ở production vì dev chạy trên http://localhost.
 * path giới hạn ở /api/auth để cookie không bị gửi kèm mọi request khác.
 */
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax",
  path: "/api/auth",
};

const signAccessToken = (userId) =>
  jwt.sign({ userId }, env.accessTokenSecret, { expiresIn: ACCESS_TOKEN_TTL });

const publicUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  emailVerifiedAt: user.emailVerifiedAt,
  phone: user.phone,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const signUp = asyncHandler(async (req, res) => {
  const { username, password, email, firstName, lastName } = req.body;

  // Kiểm tra cả username lẫn email để trả 409 kèm thông báo rõ ràng,
  // thay vì để unique index ném ra lỗi 500 khó hiểu.
  const duplicate = await User.findOne({ $or: [{ username }, { email }] })
    .select("username email")
    .lean();

  if (duplicate) {
    throw conflict(
      duplicate.username === username ? "Username đã tồn tại" : "Email đã được sử dụng"
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    username,
    hashedPassword,
    email,
    displayName: `${firstName} ${lastName}`,
  });

  /**
   * Gửi mail xác minh kiểu "bắn rồi quên".
   * Hòm thư sai, Brevo chết hay chưa cấu hình khoá đều không được làm hỏng việc
   * đăng ký - người dùng vẫn vào được app, chỉ là banner nhắc xác minh còn đó và
   * họ bấm "gửi lại" sau.
   */
  try {
    const raw = await issueToken(user._id, "verify_email");
    await sendVerifyEmail(user.email, `${env.appUrl}/verify-email?token=${raw}`);
  } catch (error) {
    console.error("Không gửi được mail xác minh:", error.message);
  }

  return res.sendStatus(204);
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const record = await consumeToken(token, "verify_email");
  if (!record) {
    throw badRequest("Link xác minh không hợp lệ hoặc đã hết hạn");
  }

  await User.updateOne({ _id: record.userId }, { emailVerifiedAt: new Date() });

  return res.sendStatus(204);
});

export const resendVerifyEmail = asyncHandler(async (req, res) => {
  if (req.user.emailVerifiedAt) {
    throw conflict("Email này đã được xác minh");
  }

  const raw = await issueToken(req.user._id, "verify_email");
  await sendVerifyEmail(req.user.email, `${env.appUrl}/verify-email?token=${raw}`);

  return res.sendStatus(204);
});

export const signIn = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  // So sánh mật khẩu kể cả khi không tìm thấy user để thời gian phản hồi
  // không tiết lộ username nào tồn tại.
  const passwordCorrect = user
    ? await bcrypt.compare(password, user.hashedPassword)
    : await bcrypt.compare(password, "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin");

  if (!user || !passwordCorrect) {
    throw unauthorized("Sai tài khoản hoặc mật khẩu");
  }

  const accessToken = signAccessToken(user._id);
  const refreshToken = crypto.randomBytes(64).toString("hex");

  await Session.create({
    userId: user._id,
    refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
  });

  res.cookie(REFRESH_COOKIE, refreshToken, { ...refreshCookieOptions, maxAge: REFRESH_TOKEN_TTL });

  return res.status(200).json({
    message: "Login successful",
    accessToken,
    user: publicUser(user),
  });
});

export const signOut = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  if (refreshToken) {
    await Session.deleteOne({ refreshToken });
  }
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);

  return res.sendStatus(204);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    throw unauthorized("Thiếu refresh token");
  }

  const session = await Session.findOne({ refreshToken: token });
  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) await Session.deleteOne({ _id: session._id });
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    throw unauthorized("Refresh token không hợp lệ hoặc đã hết hạn");
  }

  const user = await User.findById(session.userId).select("-hashedPassword");
  if (!user) {
    await Session.deleteOne({ _id: session._id });
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    throw unauthorized("Người dùng không tồn tại");
  }

  return res.status(200).json({
    message: "Token refreshed",
    accessToken: signAccessToken(session.userId),
    user: publicUser(user),
  });
});
