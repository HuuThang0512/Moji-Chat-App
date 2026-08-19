# Nhóm A — Xác minh email và khôi phục mật khẩu: kế hoạch triển khai

> **Cho người thực thi:** làm tuần tự từng task. Mỗi task kết thúc bằng một commit
> và một bộ test xanh. Không gộp task.

**Mục tiêu:** người dùng quên mật khẩu tự lấy lại được tài khoản qua email, và địa
chỉ email được kiểm chứng là có thật.

**Kiến trúc:** collection `Token` lưu bản băm SHA-256 của token dùng một lần, tự hết
hạn bằng TTL index. Mail gửi qua HTTP API của Brevo, bọc trong `libs/mailer.js`.
Thiếu cấu hình mail thì app vẫn chạy, endpoint gửi mail trả 503 — giống hệt cách
Cloudinary đang xử lý.

**Công nghệ:** Express 5, Mongoose 9, zod 4, express-rate-limit 8, React 19,
react-router 7, zustand 5.

**Spec:** [2026-08-19-email-account-recovery-design.md](../specs/2026-08-19-email-account-recovery-design.md)

## Ràng buộc chung

- Hạn token: xác minh email 24 giờ, đặt lại mật khẩu 1 giờ.
- Token thô: `crypto.randomBytes(32).toString("hex")`. Database chỉ lưu
  `crypto.createHash("sha256").update(raw).digest("hex")`.
- `POST /auth/forgot-password` **luôn** trả 204, trừ khi mailer chưa cấu hình (503).
- Đặt lại mật khẩu thành công phải `Session.deleteMany({ userId })`.
- bcrypt cost 10, giống `signUp` hiện tại.
- Endpoint `/api/auth/__dev/last-token` chỉ mount khi `EXPOSE_MAIL_TOKENS=1` **và**
  `NODE_ENV !== "production"`.
- Toàn bộ chú thích code viết tiếng Việt, theo đúng phần còn lại của dự án.
- Test là `backend/scripts/smoke.mjs`, chạy khi server đang bật.

## Bản đồ file

| File | Trách nhiệm |
|---|---|
| `backend/src/models/Token.js` | tạo mới — token dùng một lần, TTL tự xoá |
| `backend/src/models/User.js` | sửa — thêm `emailVerifiedAt` |
| `backend/src/libs/mailer.js` | tạo mới — gửi mail qua Brevo, không biết nghiệp vụ |
| `backend/src/config/env.js` | sửa — thêm cấu hình mail, `isMailerConfigured` |
| `backend/src/utils/tokenHelper.js` | tạo mới — sinh, băm, tra cứu, tiêu thụ token |
| `backend/src/controllers/authController.js` | sửa — 4 handler mới, sửa `signUp` |
| `backend/src/routes/authRoute.js` | sửa — 4 route mới + route dev |
| `backend/src/middlewares/rateLimitMiddleware.js` | sửa — `mailLimiter` |
| `backend/src/utils/schemas.js` | sửa — 3 schema mới |
| `backend/scripts/smoke.mjs` | sửa — 11 trường hợp mới |
| `frontend/src/pages/ForgotPasswordPage.tsx` | tạo mới |
| `frontend/src/pages/ResetPasswordPage.tsx` | tạo mới |
| `frontend/src/pages/VerifyEmailPage.tsx` | tạo mới |
| `frontend/src/components/auth/EmailVerificationBanner.tsx` | tạo mới |
| `frontend/src/services/authService.ts` | sửa — 4 hàm mới |
| `frontend/src/types/user.ts` | sửa — `emailVerifiedAt` |
| `frontend/src/App.tsx` | sửa — 3 route public |
| `frontend/src/lib/axios.ts` | sửa — thêm vào `NO_REFRESH_PATHS` |
| `frontend/src/stores/useSocketStore.ts` | sửa — polling fallback |
| `render.yaml`, `backend/.env.example` | sửa — biến môi trường mới |

---

## Task 1: Model `Token` và trường `emailVerifiedAt`

**Files:**
- Tạo: `backend/src/models/Token.js`
- Sửa: `backend/src/models/User.js`

**Interfaces — Produces:**
- `Token` (default export): document `{ userId, tokenHash, type, expiresAt }`,
  `type` ∈ `"verify_email" | "reset_password"`
- `User.emailVerifiedAt`: `Date | null`

- [ ] **Bước 1: viết `Token.js`**

```js
import mongoose from "mongoose";

/**
 * Token dùng một lần gửi qua email: xác minh địa chỉ hoặc đặt lại mật khẩu.
 *
 * Chỉ lưu bản băm SHA-256, không lưu token thô. Ai đọc được database cũng không
 * dựng lại được link, vì link chứa token thô.
 */
const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["verify_email", "reset_password"],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Mongo tự xoá bản ghi hết hạn, không cần job dọn dẹp.
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Token = mongoose.model("Token", tokenSchema);
export default Token;
```

- [ ] **Bước 2: thêm trường vào `User.js`**

Chèn sau trường `bio`, trước `phone`:

```js
    /** Thời điểm người dùng bấm link xác minh. Rỗng nghĩa là chưa xác minh. */
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
```

- [ ] **Bước 3: kiểm tra cú pháp**

Chạy: `cd backend && npm run check`
Kỳ vọng: không in ra lỗi.

- [ ] **Bước 4: commit**

```bash
git add backend/src/models/Token.js backend/src/models/User.js
git commit -m "feat(auth): them model Token va truong emailVerifiedAt"
```

---

## Task 2: Cấu hình mail và `mailer.js`

**Files:**
- Sửa: `backend/src/config/env.js`
- Tạo: `backend/src/libs/mailer.js`

**Interfaces — Produces:**
- `env.mail`: `{ apiKey, from, fromName }`
- `env.appUrl`: `string` — gốc để dựng link
- `env.exposeMailTokens`: `boolean`
- `isMailerConfigured`: `boolean`
- `sendVerifyEmail(to: string, link: string): Promise<void>`
- `sendResetPasswordEmail(to: string, link: string): Promise<void>`

- [ ] **Bước 1: thêm cấu hình vào `env.js`**

Thêm vào object `env`, sau `cloudinary`:

```js
  mail: {
    apiKey: process.env.BREVO_API_KEY,
    from: process.env.MAIL_FROM,
    fromName: process.env.MAIL_FROM_NAME || "Moji",
  },

  /**
   * Gốc URL để dựng link trong email.
   * Render tự đặt RENDER_EXTERNAL_URL nên production không phải cấu hình gì.
   */
  appUrl: (
    process.env.APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:5173"
  ).replace(/\/$/, ""),

  /**
   * Mở endpoint đọc token dành cho test tự động.
   * Chỉ có tác dụng ngoài production - xem thêm ở authRoute.
   */
  exposeMailTokens:
    process.env.EXPOSE_MAIL_TOKENS === "1" && process.env.NODE_ENV !== "production",
```

Thêm sau `isCloudinaryConfigured`:

```js
export const isMailerConfigured = Boolean(env.mail.apiKey && env.mail.from);

if (!isMailerConfigured) {
  console.warn(
    "Chưa cấu hình gửi mail - xác minh email và khôi phục mật khẩu sẽ trả về 503."
  );
}
```

- [ ] **Bước 2: viết `mailer.js`**

```js
import { env, isMailerConfigured } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

/**
 * Gửi một email giao dịch qua HTTP API của Brevo.
 *
 * Dùng HTTP thay vì SMTP vì cổng SMTP hay bị nhà cung cấp hosting chặn, còn
 * HTTPS thì không, và không phải thêm thư viện nào.
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
    const detail = await res.text().catch(() => "");
    console.error("Brevo trả lỗi:", res.status, detail);
    throw new AppError(502, "Không gửi được email, vui lòng thử lại sau");
  }
};

/** Khung HTML dùng chung, giữ đơn giản để không rơi vào hộp thư rác. */
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
      "Bấm nút bên dưới để đặt mật khẩu mới. Liên kết có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu điều này, hãy bỏ qua email.",
      "Đặt lại mật khẩu",
      link
    ),
  });
```

- [ ] **Bước 3: kiểm tra cú pháp**

Chạy: `cd backend && npm run check`
Kỳ vọng: không lỗi. Khởi động `npm run dev` phải thấy cảnh báo
`Chưa cấu hình gửi mail...` vì `.env` chưa có khoá Brevo.

- [ ] **Bước 4: commit**

```bash
git add backend/src/config/env.js backend/src/libs/mailer.js
git commit -m "feat(auth): them cau hinh mail va mailer qua Brevo API"
```

---

## Task 3: Helper token và `mailLimiter`

**Files:**
- Tạo: `backend/src/utils/tokenHelper.js`
- Sửa: `backend/src/middlewares/rateLimitMiddleware.js`
- Sửa: `backend/src/utils/schemas.js`

**Interfaces — Produces:**
- `issueToken(userId, type): Promise<string>` — trả token **thô**, đã lưu bản băm
- `consumeToken(raw, type): Promise<Token|null>` — tìm token còn hạn, xoá rồi trả về
- `hashToken(raw): string`
- `TOKEN_TTL`: `{ verify_email: number, reset_password: number }` (mili giây)
- `mailLimiter`: middleware
- `forgotPasswordSchema`, `resetPasswordSchema`, `verifyEmailSchema`

- [ ] **Bước 1: viết `tokenHelper.js`**

```js
import crypto from "crypto";
import Token from "../models/Token.js";

/** Hạn sử dụng tính bằng mili giây. */
export const TOKEN_TTL = {
  verify_email: 24 * 60 * 60 * 1000,
  reset_password: 60 * 60 * 1000,
};

export const hashToken = (raw) =>
  crypto.createHash("sha256").update(raw).digest("hex");

/**
 * Sinh token mới cho một người dùng và lưu bản băm.
 * Xoá hết token cùng loại còn tồn của người đó: mỗi lúc chỉ một link sống, nên
 * link gửi lần trước mất hiệu lực ngay khi người dùng bấm "gửi lại".
 */
export const issueToken = async (userId, type) => {
  await Token.deleteMany({ userId, type });

  const raw = crypto.randomBytes(32).toString("hex");
  await Token.create({
    userId,
    tokenHash: hashToken(raw),
    type,
    expiresAt: new Date(Date.now() + TOKEN_TTL[type]),
  });

  return raw;
};

/**
 * Đổi token thô lấy bản ghi tương ứng rồi xoá nó đi.
 * Xoá ngay trong cùng thao tác tìm kiếm để token chỉ dùng được một lần, kể cả
 * khi hai request tới cùng lúc.
 */
export const consumeToken = async (raw, type) => {
  if (!raw) return null;

  return Token.findOneAndDelete({
    tokenHash: hashToken(raw),
    type,
    expiresAt: { $gt: new Date() },
  });
};
```

- [ ] **Bước 2: thêm `mailLimiter`**

Thêm vào `rateLimitMiddleware.js`, sửa dòng import đầu file thành:

```js
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
```

rồi thêm ở cuối file:

```js
/**
 * Giới hạn việc sinh email, đếm theo địa chỉ nhận chứ không theo IP.
 *
 * Đếm theo IP thì một người vẫn spam được hòm thư của người khác chỉ bằng cách
 * đổi mạng. Đếm theo email thì hòm thư nạn nhân được bảo vệ dù kẻ gửi ở đâu.
 * Route không có email trong body (gửi lại mail cho chính mình) thì đếm theo id
 * người dùng; cuối cùng mới lùi về IP.
 */
export const mailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const email = req.body?.email?.trim().toLowerCase();
    if (email) return `mail:${email}`;
    if (req.user?._id) return `mail:user:${req.user._id}`;
    // ipKeyGenerator chuẩn hoá IPv6; tự nối chuỗi IP sẽ đếm sai với IPv6.
    return `mail:ip:${ipKeyGenerator(req, res)}`;
  },
  handler: jsonMessage("Bạn đã yêu cầu quá nhiều email, vui lòng thử lại sau một giờ"),
});
```

- [ ] **Bước 3: thêm schema**

Thêm vào `schemas.js` sau `signInSchema`:

```js
const token = z.string().trim().min(1, "Thiếu token");

export const forgotPasswordSchema = z.object({
  email: z.email("Email không hợp lệ").trim().toLowerCase(),
});

export const verifyEmailSchema = z.object({ token });

export const resetPasswordSchema = z.object({ token, password });
```

- [ ] **Bước 4: kiểm tra cú pháp**

Chạy: `cd backend && npm run check`
Kỳ vọng: không lỗi.

- [ ] **Bước 5: commit**

```bash
git add backend/src/utils/tokenHelper.js backend/src/utils/schemas.js backend/src/middlewares/rateLimitMiddleware.js
git commit -m "feat(auth): them helper token, mailLimiter va schema"
```

---

## Task 4: Luồng xác minh email

**Files:**
- Sửa: `backend/src/controllers/authController.js`
- Sửa: `backend/src/routes/authRoute.js`
- Sửa: `backend/scripts/smoke.mjs`

**Interfaces — Consumes:** `issueToken`, `consumeToken` (Task 3), `sendVerifyEmail`
(Task 2), `Token` (Task 1)
**Interfaces — Produces:**
- `POST /auth/verify-email` — body `{ token }` → 204 / 400
- `POST /auth/verify-email/resend` — cần đăng nhập → 204 / 409 / 503
- `GET /auth/__dev/last-token?email&type` — chỉ dev → `{ token }`
- `signUp` gửi mail xác minh, vẫn trả 204

- [ ] **Bước 1: viết test trước, trong `smoke.mjs`**

Thêm sau khối `== Auth ==` hiện có:

```js
console.log("\n== Xac minh email ==");
{
  const devToken = async (email, type) => {
    const res = await alice.req(
      "GET",
      `/auth/__dev/last-token?email=${encodeURIComponent(email)}&type=${type}`,
      undefined,
      { noAuth: true }
    );
    return res.data?.token ?? null;
  };

  const me1 = await alice.req("GET", "/users/me");
  check("dang ky xong -> chua xac minh", me1.data?.user?.emailVerifiedAt == null,
    JSON.stringify(me1.data?.user?.emailVerifiedAt));

  const raw = await devToken(`${alice.username}@example.com`, "verify_email");
  check("signup co sinh token xac minh", Boolean(raw));

  const bad = await alice.req("POST", "/auth/verify-email", { token: "khong-ton-tai" });
  check("token bia -> 400", bad.status === 400, JSON.stringify(bad.data));

  const ok = await alice.req("POST", "/auth/verify-email", { token: raw });
  check("token dung -> 204", ok.status === 204, JSON.stringify(ok.data));

  const me2 = await alice.req("GET", "/users/me");
  check("sau xac minh -> emailVerifiedAt co gia tri",
    Boolean(me2.data?.user?.emailVerifiedAt), JSON.stringify(me2.data?.user));

  const again = await alice.req("POST", "/auth/verify-email", { token: raw });
  check("dung lai token lan hai -> 400", again.status === 400, JSON.stringify(again.data));

  const resend = await alice.req("POST", "/auth/verify-email/resend", {});
  check("gui lai khi da xac minh -> 409", resend.status === 409, JSON.stringify(resend.data));
}
```

- [ ] **Bước 2: chạy test, xác nhận nó đỏ**

Terminal 1: `cd backend && npm run dev`
Terminal 2: `cd backend && npm run smoke`
Kỳ vọng: các dòng mới đều `FAIL` vì endpoint chưa tồn tại.

- [ ] **Bước 3: thêm handler vào `authController.js`**

Thêm import ở đầu file:

```js
import { issueToken, consumeToken } from "../utils/tokenHelper.js";
import { sendVerifyEmail, sendResetPasswordEmail } from "../libs/mailer.js";
```

và bổ sung `badRequest` vào dòng import `AppError` đã có sẵn:

```js
import { asyncHandler, badRequest, conflict, unauthorized } from "../utils/AppError.js";
```

Thêm `emailVerifiedAt: user.emailVerifiedAt` vào `publicUser()`.

Trong `signUp`, thay `await User.create({...})` bằng:

```js
  const user = await User.create({
    username,
    hashedPassword,
    email,
    displayName: `${firstName} ${lastName}`,
  });

  // Gửi mail xác minh kiểu "bắn rồi quên": hòm thư lỗi hay Brevo chết cũng
  // không được làm hỏng việc đăng ký.
  try {
    const raw = await issueToken(user._id, "verify_email");
    await sendVerifyEmail(user.email, `${env.appUrl}/verify-email?token=${raw}`);
  } catch (error) {
    console.error("Không gửi được mail xác minh:", error.message);
  }
```

Thêm hai handler mới:

```js
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
```

- [ ] **Bước 4: nối route trong `authRoute.js`**

```js
import { protectedRoute } from "../middlewares/authMiddleware.js";
import { mailLimiter } from "../middlewares/rateLimitMiddleware.js";
import { verifyEmailSchema } from "../utils/schemas.js";
import { env } from "../config/env.js";
import Token from "../models/Token.js";
import User from "../models/User.js";

router.post("/verify-email", authLimiter, validateBody(verifyEmailSchema), verifyEmail);

// protectedRoute gắn riêng cho route này vì authRoute nằm trước tầng bảo vệ
// chung trong server.js.
router.post("/verify-email/resend", protectedRoute, mailLimiter, resendVerifyEmail);
```

Thêm endpoint dev ở cuối file, ngay trước `export default router`:

```js
/**
 * Chỉ dành cho test tự động: trả token thô mà bình thường chỉ nằm trong email.
 *
 * Hai lớp khoá - phải bật cờ EXPOSE_MAIL_TOKENS và phải không phải production
 * (điều kiện thứ hai đã nằm trong env.exposeMailTokens). Không mount thì route
 * này không tồn tại, gọi vào rơi vào notFoundHandler của /api.
 */
if (env.exposeMailTokens) {
  console.warn("EXPOSE_MAIL_TOKENS đang bật - endpoint /auth/__dev/last-token đã mở.");

  router.get("/__dev/last-token", async (req, res) => {
    const { email, type } = req.query;
    const user = await User.findOne({ email: String(email).toLowerCase() }).lean();
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    const record = await Token.findOne({ userId: user._id, type }).sort({ createdAt: -1 }).lean();
    if (!record) return res.status(404).json({ message: "Không có token" });

    // Không lấy lại được token thô từ bản băm, nên lưu tạm khi sinh - xem
    // tokenHelper.issueToken, phần devTokens.
    const raw = global.__devTokens?.get(record.tokenHash);
    return res.json({ token: raw ?? null });
  });
}
```

Trong `tokenHelper.js`, thêm vào cuối `issueToken` trước `return raw`:

```js
  // Chỉ ở môi trường test: giữ lại token thô trong bộ nhớ để endpoint dev đọc.
  // Không bao giờ chạy ở production vì env.exposeMailTokens đã chặn.
  if (env.exposeMailTokens) {
    global.__devTokens ??= new Map();
    global.__devTokens.set(hashToken(raw), raw);
  }
```

kèm `import { env } from "../config/env.js";` ở đầu file.

- [ ] **Bước 5: chạy test, xác nhận xanh**

Bật lại server với cờ: `cd backend && EXPOSE_MAIL_TOKENS=1 npm run dev`
(PowerShell: `$env:EXPOSE_MAIL_TOKENS="1"; npm run dev`)
Rồi `npm run smoke`.
Kỳ vọng: toàn bộ dòng ở khối `== Xac minh email ==` in `PASS`.

- [ ] **Bước 6: commit**

```bash
git add backend/src
git add backend/scripts/smoke.mjs
git commit -m "feat(auth): xac minh email qua link, kem test smoke"
```

---

## Task 5: Luồng quên và đặt lại mật khẩu

**Files:**
- Sửa: `backend/src/controllers/authController.js`
- Sửa: `backend/src/routes/authRoute.js`
- Sửa: `backend/scripts/smoke.mjs`

**Interfaces — Produces:**
- `POST /auth/forgot-password` — body `{ email }` → luôn 204 (503 nếu chưa cấu hình mail)
- `POST /auth/reset-password` — body `{ token, password }` → 204 / 400

- [ ] **Bước 1: viết test trước**

Thêm vào `smoke.mjs` sau khối xác minh email. Dùng `bob` để không đụng `alice`:

```js
console.log("\n== Quen mat khau ==");
{
  const bobEmail = `${bob.username}@example.com`;

  const oldSession = new Client("bob_cu");
  oldSession.cookie = bob.cookie;

  const ghost = await bob.req("POST", "/auth/forgot-password",
    { email: `khongtontai_${stamp}@example.com` }, { noAuth: true });
  check("email khong ton tai -> van 204", ghost.status === 204, JSON.stringify(ghost.data));

  const asked = await bob.req("POST", "/auth/forgot-password", { email: bobEmail }, { noAuth: true });
  check("yeu cau doi mat khau -> 204", asked.status === 204, JSON.stringify(asked.data));

  const raw = await bob.req("GET",
    `/auth/__dev/last-token?email=${encodeURIComponent(bobEmail)}&type=reset_password`,
    undefined, { noAuth: true });
  check("co token dat lai mat khau", Boolean(raw.data?.token));

  const badToken = await bob.req("POST", "/auth/reset-password",
    { token: "bia-dat", password: "matkhaumoi456" }, { noAuth: true });
  check("token bia -> 400", badToken.status === 400, JSON.stringify(badToken.data));

  const done = await bob.req("POST", "/auth/reset-password",
    { token: raw.data.token, password: "matkhaumoi456" }, { noAuth: true });
  check("dat lai mat khau -> 204", done.status === 204, JSON.stringify(done.data));

  const reuse = await bob.req("POST", "/auth/reset-password",
    { token: raw.data.token, password: "matkhaukhac789" }, { noAuth: true });
  check("dung lai token lan hai -> 400", reuse.status === 400, JSON.stringify(reuse.data));

  const oldPw = await bob.req("POST", "/auth/signin",
    { username: bob.username, password: "secret123" }, { noAuth: true });
  check("dang nhap mat khau cu -> 401", oldPw.status === 401, JSON.stringify(oldPw.data));

  const newPw = await bob.req("POST", "/auth/signin",
    { username: bob.username, password: "matkhaumoi456" }, { noAuth: true });
  check("dang nhap mat khau moi -> 200", newPw.status === 200, JSON.stringify(newPw.data));

  const oldRefresh = await oldSession.req("POST", "/auth/refresh", {}, { noAuth: true });
  check("phien cu bi vo hieu -> 401", oldRefresh.status === 401, JSON.stringify(oldRefresh.data));

  // Cập nhật lại token cho các phần test sau vẫn dùng bob.
  bob.token = newPw.data?.accessToken;
}
```

- [ ] **Bước 2: chạy, xác nhận đỏ**

`npm run smoke` → khối `== Quen mat khau ==` toàn `FAIL`.

- [ ] **Bước 3: thêm handler**

```js
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email }).select("_id email");

  /**
   * Luôn trả 204 kể cả không tìm thấy user.
   * Nếu phân biệt hai trường hợp, người lạ dò được địa chỉ email nào đã đăng ký
   * chỉ bằng cách thử lần lượt.
   */
  if (user) {
    const raw = await issueToken(user._id, "reset_password");
    await sendResetPasswordEmail(user.email, `${env.appUrl}/reset-password?token=${raw}`);
  }

  return res.sendStatus(204);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const record = await consumeToken(token, "reset_password");
  if (!record) {
    throw badRequest("Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await User.updateOne(
    { _id: record.userId },
    {
      hashedPassword,
      // Bấm được link trong hòm thư đã chứng minh quyền sở hữu email, nên
      // không bắt xác minh thêm lần nữa.
      emailVerifiedAt: new Date(),
    }
  );

  // Đá mọi thiết bị đang đăng nhập, kể cả kẻ đang chiếm tài khoản.
  await Session.deleteMany({ userId: record.userId });

  return res.sendStatus(204);
});
```

- [ ] **Bước 4: nối route**

```js
router.post("/forgot-password", mailLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", authLimiter, validateBody(resetPasswordSchema), resetPassword);
```

- [ ] **Bước 5: chạy, xác nhận xanh**

`npm run smoke` → tất cả `PASS`, kể cả các khối cũ. Đặc biệt phải xanh hai dòng
`dang nhap mat khau cu -> 401` và `phien cu bi vo hieu -> 401`.

- [ ] **Bước 6: commit**

```bash
git add backend/src backend/scripts/smoke.mjs
git commit -m "feat(auth): quen va dat lai mat khau qua email"
```

---

## Task 6: Biến môi trường và tài liệu

**Files:**
- Sửa: `render.yaml`, `backend/.env.example`, `DEPLOY.md`

- [ ] **Bước 1: thêm vào `render.yaml`**, dưới các khoá Cloudinary:

```yaml
      # Gửi email xác minh và khôi phục mật khẩu (Brevo).
      # Thiếu thì hai chức năng đó trả 503, phần còn lại chạy bình thường.
      - key: BREVO_API_KEY
        sync: false
      - key: MAIL_FROM
        sync: false
      - key: MAIL_FROM_NAME
        sync: false
```

Không thêm `APP_URL` — Render tự cấp `RENDER_EXTERNAL_URL`.
Không thêm `EXPOSE_MAIL_TOKENS` — không bao giờ được có trên production.

- [ ] **Bước 2: thêm ba biến vào `backend/.env.example`** kèm chú thích.

- [ ] **Bước 3: thêm mục vào `DEPLOY.md`** — cách lấy khoá Brevo, và một dòng trong
bảng xử lý sự cố: "Không nhận được mail xác minh → kiểm tra `BREVO_API_KEY` và địa
chỉ trong `MAIL_FROM` đã được xác minh ở Brevo chưa".

- [ ] **Bước 4: commit**

```bash
git add render.yaml backend/.env.example DEPLOY.md
git commit -m "chore: khai bao bien moi truong cho gui mail"
```

---

## Task 7: Frontend — service, kiểu dữ liệu, route

**Files:**
- Sửa: `frontend/src/services/authService.ts`, `frontend/src/types/user.ts`,
  `frontend/src/lib/axios.ts`, `frontend/src/App.tsx`
- Tạo: `frontend/src/pages/ForgotPasswordPage.tsx`,
  `frontend/src/pages/ResetPasswordPage.tsx`, `frontend/src/pages/VerifyEmailPage.tsx`

**Interfaces — Produces:**
- `authService.forgotPassword(email: string): Promise<void>`
- `authService.resetPassword(token: string, password: string): Promise<void>`
- `authService.verifyEmail(token: string): Promise<void>`
- `authService.resendVerifyEmail(): Promise<void>`
- `User.emailVerifiedAt?: string | null`

- [ ] **Bước 1: thêm 4 hàm vào `authService`**

```ts
  forgotPassword: async (email: string) => {
    await api.post("/auth/forgot-password", { email });
  },

  resetPassword: async (token: string, password: string) => {
    await api.post("/auth/reset-password", { token, password });
  },

  verifyEmail: async (token: string) => {
    await api.post("/auth/verify-email", { token });
  },

  resendVerifyEmail: async () => {
    await api.post("/auth/verify-email/resend", {});
  },
```

- [ ] **Bước 2:** thêm `emailVerifiedAt?: string | null;` vào interface `User`.

- [ ] **Bước 3:** thêm vào `NO_REFRESH_PATHS` trong `axios.ts`:

```ts
const NO_REFRESH_PATHS = [
  "/auth/signin",
  "/auth/signup",
  "/auth/refresh",
  "/auth/signout",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
];
```

Ba đường dẫn cuối là trang công khai, người chưa đăng nhập gọi vào; không loại trừ
thì mỗi lỗi 401 lại kích hoạt một vòng refresh vô ích rồi đá về `/signin`.

- [ ] **Bước 4:** ba trang mới, dùng lại `Card`, `Input`, `Button`, `Label` trong
`components/ui`, bố cục giống `SignInPage` (nền `bg-gradient-purple`, khối
`max-w-sm`). Thông báo lỗi lấy qua `getErrorMessage` trong `lib/errors.ts`, thông báo
thành công qua `toast` của sonner.

`ForgotPasswordPage`: một ô email, nút gửi. Gửi xong **luôn** hiện
"Nếu email tồn tại, chúng tôi đã gửi hướng dẫn tới hòm thư của bạn" — không tiết lộ
email có tồn tại hay không, đúng như backend.

`ResetPasswordPage`: đọc `token` từ `useSearchParams()`. Hai ô mật khẩu, kiểm tra
khớp nhau ở client trước khi gọi API. Không có token trên URL thì hiện thông báo link
hỏng. Thành công thì `navigate("/signin")`.

`VerifyEmailPage`: đọc `token`, gọi API ngay khi tải trang trong `useEffect`, hiển thị
ba trạng thái đang xử lý / thành công / thất bại. Thành công thì có nút về trang chủ.

- [ ] **Bước 5:** đăng ký route trong `App.tsx`, cùng nhóm public:

```tsx
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
```

- [ ] **Bước 6:** thêm link "Quên mật khẩu?" vào `components/auth/signin-form.tsx`,
đặt cạnh nhãn ô mật khẩu, trỏ `/forgot-password`.

- [ ] **Bước 7: kiểm tra build**

Chạy: `cd frontend && npm run build`
Kỳ vọng: `tsc -b` không lỗi, vite build xong.

- [ ] **Bước 8: commit**

```bash
git add frontend/src
git commit -m "feat(auth): trang quen mat khau, dat lai mat khau va xac minh email"
```

---

## Task 8: Banner nhắc xác minh

**Files:**
- Tạo: `frontend/src/components/auth/EmailVerificationBanner.tsx`
- Sửa: `frontend/src/pages/ChatAppPage.tsx`

- [ ] **Bước 1:** viết component. Hiện khi `user` tồn tại và `user.emailVerifiedAt`
rỗng. Có nút "Gửi lại email" gọi `authService.resendVerifyEmail()` và nút đóng tạm
(state cục bộ, hiện lại sau khi tải lại trang).

Trong lúc gọi API phải khoá nút để tránh bấm liên tục — backend giới hạn 5 lần mỗi
giờ, bấm nhanh sẽ ăn hết hạn mức rồi nhận 429.

- [ ] **Bước 2:** đặt banner ở đầu `ChatAppPage`, phía trên phần nội dung.

- [ ] **Bước 3: kiểm tra build**

`cd frontend && npm run build` — không lỗi.

- [ ] **Bước 4: commit**

```bash
git add frontend/src
git commit -m "feat(auth): banner nhac xac minh email"
```

---

## Task 9: Socket rơi về polling

**Files:**
- Sửa: `frontend/src/stores/useSocketStore.ts:34`

- [ ] **Bước 1: sửa cấu hình**

```ts
      // Ưu tiên websocket, nhưng vẫn giữ polling làm đường lui: một số mạng công
      // ty và proxy chặn WebSocket, khi đó thiếu polling là chat câm hoàn toàn.
      transports: ["websocket", "polling"],
```

- [ ] **Bước 2: thử tay**

Bật cả backend lẫn frontend, mở hai cửa sổ, nhắn tin — vẫn tức thời.
Mở DevTools tab Network lọc `socket.io`, phải thấy kết nối nâng cấp lên WebSocket
như trước, không phải rơi xuống polling ở điều kiện mạng bình thường.

- [ ] **Bước 3: commit**

```bash
git add frontend/src/stores/useSocketStore.ts
git commit -m "fix(socket): giu polling lam duong lui khi mang chan websocket"
```

---

## Task 10: Nghiệm thu và deploy

- [ ] **Bước 1:** chạy lại toàn bộ `smoke.mjs` — mọi dòng `PASS`, không còn `FAIL`.

- [ ] **Bước 2:** thử tay ở local toàn luồng, với `EXPOSE_MAIL_TOKENS` **tắt** và
Brevo đã cấu hình thật: đăng ký bằng hòm thư thật → nhận mail → bấm link → banner biến
mất → đăng xuất → quên mật khẩu → nhận mail → đặt mật khẩu mới → đăng nhập được bằng
mật khẩu mới, không đăng nhập được bằng mật khẩu cũ.

- [ ] **Bước 3:** kiểm tra endpoint dev không tồn tại khi tắt cờ.

Spec yêu cầu `smoke.mjs` có một trường hợp xác nhận điều này, nhưng không làm được:
`smoke.mjs` chạy khi cờ đang **bật**, nên trong cùng một lần chạy nó không thể chứng
minh route vắng mặt lúc cờ tắt. Thay bằng kiểm tra tay ở đây và ở Bước 7 trên
production — nơi thật sự cần bảo đảm.

```bash
curl -i http://localhost:5001/api/auth/__dev/last-token?email=a@b.c&type=verify_email
```

Kỳ vọng: 404.

- [ ] **Bước 4:** `git push origin master`, chờ Render build.

- [ ] **Bước 5:** trên Render → Environment, thêm `BREVO_API_KEY`, `MAIL_FROM`,
`MAIL_FROM_NAME`. Service tự deploy lại.

- [ ] **Bước 6:** thử lại trên production bằng hòm thư thật, đúng các bước ở Bước 2.

- [ ] **Bước 7:** xác nhận endpoint dev **không** tồn tại trên production:

```bash
curl -i "https://moji-21i4.onrender.com/api/auth/__dev/last-token?email=a@b.c&type=verify_email"
```

Kỳ vọng: 404. Ra bất cứ thứ gì khác là lỗi bảo mật, phải dừng và sửa ngay.
