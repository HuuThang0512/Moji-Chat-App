import { env, isMailerConfigured } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/**
 * Gửi một email giao dịch qua HTTP API của Brevo.
 *
 * Dùng HTTP thay vì SMTP vì cổng SMTP hay bị nhà cung cấp hosting chặn còn HTTPS
 * thì không, và không phải thêm thư viện nào - fetch có sẵn trong Node 20.
 */
const send = async ({ to, subject, html }) => {
  if (!isMailerConfigured) {
    throw new AppError(503, "Chức năng gửi email chưa được cấu hình");
  }

  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": env.mail.apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: env.mail.from, name: env.mail.fromName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    // Ghi lại phản hồi của Brevo vì thông báo lỗi của họ nói rõ nguyên nhân
    // (khoá sai, địa chỉ gửi chưa xác minh, hết hạn mức ngày).
    const detail = await res.text().catch(() => "");
    console.error("Brevo trả lỗi:", res.status, detail);
    throw new AppError(502, "Không gửi được email, vui lòng thử lại sau");
  }
};

/**
 * Khung HTML dùng chung.
 * Giữ đơn giản và có sẵn link dạng chữ: mail nhiều ảnh, nhiều thẻ lạ dễ bị bộ
 * lọc đẩy vào hộp thư rác, mà đây là loại mail bắt buộc phải tới nơi.
 */
const layout = (title, body, buttonLabel, link) => `
  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <h2 style="margin:0 0 16px">${title}</h2>
    <p style="margin:0 0 24px;line-height:1.6;color:#374151">${body}</p>
    <a href="${link}" style="display:inline-block;padding:12px 20px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none">${buttonLabel}</a>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280">
      Nếu nút không bấm được, mở đường dẫn sau:<br>
      <span style="word-break:break-all">${link}</span>
    </p>
  </div>
`;

export const sendVerifyEmail = (to, link) =>
  send({
    to,
    subject: "Xác minh địa chỉ email của bạn - Moji",
    html: layout(
      "Xác minh email",
      "Bấm nút bên dưới để xác minh địa chỉ email này. Liên kết có hiệu lực trong 24 giờ.",
      "Xác minh email",
      link
    ),
  });

export const sendResetPasswordEmail = (to, link) =>
  send({
    to,
    subject: "Đặt lại mật khẩu - Moji",
    html: layout(
      "Đặt lại mật khẩu",
      "Bấm nút bên dưới để đặt mật khẩu mới. Liên kết có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu điều này, hãy bỏ qua email - mật khẩu hiện tại vẫn giữ nguyên.",
      "Đặt lại mật khẩu",
      link
    ),
  });
