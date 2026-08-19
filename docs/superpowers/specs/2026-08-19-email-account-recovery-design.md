# Nhóm A — Xác minh email và khôi phục mật khẩu

Ngày: 2026-08-19
Trạng thái: chờ duyệt

## Vấn đề

Người dùng quên mật khẩu là mất tài khoản vĩnh viễn: [authRoute.js](../../../backend/src/routes/authRoute.js)
chỉ có `signup`, `signin`, `signout`, `refresh`. Cách duy nhất để cứu là sửa tay trong
Atlas. Với người dùng thật, đây là lỗi gặp trong tuần đầu tiên.

Model `User` đã có trường `email` nhưng không ai kiểm chứng, nên kể cả khi có chức
năng khôi phục, mail vẫn có thể gửi vào một địa chỉ bịa.

## Phạm vi

Trong phạm vi:

- Gửi mail xác minh khi đăng ký, kèm nút gửi lại
- Xác minh email qua link
- Quên mật khẩu: yêu cầu link, đặt lại mật khẩu qua link
- Banner nhắc xác minh trong ứng dụng
- Mở rộng `smoke.mjs` phủ toàn bộ hai luồng trên

Ngoài phạm vi (ghi lại để không quên, làm sau):

- Đổi mật khẩu khi đang đăng nhập
- Đổi địa chỉ email
- Đăng nhập bằng Google
- Chặn/báo cáo người dùng (nhóm B), xoá tin nhắn/tài khoản (nhóm C)

## Quyết định đã chốt

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| Nơi lưu token | Collection `Token` riêng | Thu hồi được, Mongo tự dọn bằng TTL, khớp pattern `Session` đã có |
| Dạng lưu | Băm SHA-256, không lưu token thô | Lộ database cũng không dùng lại được link |
| Dịch vụ gửi mail | Brevo HTTP API | 300 mail/ngày miễn phí, gửi được tới người lạ, không cần tên miền riêng |
| Mức chặt của xác minh | Mềm — vẫn dùng app, chỉ hiện banner | Ít ma sát; mail lỗi không khoá người dùng ra ngoài |
| Hạn link xác minh | 24 giờ | Đủ để người dùng mở hòm thư sau một ngày |
| Hạn link đổi mật khẩu | 1 giờ | Cửa sổ tấn công hẹp nếu hòm thư bị đọc lén |

## Kiến trúc

Ba mảnh mới, mỗi mảnh một việc:

**`backend/src/models/Token.js`** — lưu token dùng một lần.

```js
{
  userId:    ObjectId, ref User, index
  tokenHash: String, required, unique      // sha256 của token thô
  type:      String, enum ["verify_email", "reset_password"]
  expiresAt: Date, required                // TTL index, Mongo tự xoá
}
```

Chỉ số TTL giống hệt [Session.js](../../../backend/src/models/Session.js):
`tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })`.

**`backend/src/libs/mailer.js`** — gửi mail, không biết gì về nghiệp vụ.

Hai hàm xuất ra: `sendVerifyEmail(to, link)` và `sendResetPasswordEmail(to, link)`.
Gọi `POST https://api.brevo.com/v3/smtp/email` với header `api-key`. Không dùng SMTP
vì HTTP API ít bị chặn cổng hơn và không cần thêm thư viện.

Theo đúng pattern Cloudinary đang dùng trong [env.js](../../../backend/src/config/env.js):
xuất thêm `isMailerConfigured`. Thiếu biến môi trường thì app vẫn chạy, riêng các
endpoint gửi mail trả 503 kèm thông báo rõ ràng. Nghĩa là deploy được ngay cả trước
khi đăng ký Brevo.

**`backend/src/controllers/authController.js`** — thêm 4 handler, dùng lại
`asyncHandler`, `badRequest`, `notFound` sẵn có trong [AppError.js](../../../backend/src/utils/AppError.js).

### Biến môi trường mới

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `BREVO_API_KEY` | Không | Thiếu thì endpoint gửi mail trả 503 |
| `MAIL_FROM` | Không | Địa chỉ người gửi đã xác minh ở Brevo |
| `MAIL_FROM_NAME` | Không | Mặc định `"Moji"` |
| `APP_URL` | Không | Gốc để dựng link. Thứ tự lấy: `APP_URL` → `RENDER_EXTERNAL_URL` (Render tự cấp) → `env.clientUrl` |
| `EXPOSE_MAIL_TOKENS` | Không | Chỉ có tác dụng khi `NODE_ENV !== production`. Bật thì mở thêm một endpoint chỉ dành cho dev, xem mục "Lấy token khi test" |

Thêm cả 5 vào [render.yaml](../../../render.yaml) dạng `sync: false`, trừ
`EXPOSE_MAIL_TOKENS` (không đưa lên production).

## Endpoint

Tất cả nằm dưới `/api/auth`.

### `POST /auth/verify-email/resend` — cần đăng nhập

Gửi lại mail xác minh cho chính người đang đăng nhập. Route này gắn `protectedRoute`
riêng lẻ, vì `authRoute` nằm trước tầng bảo vệ chung trong [server.js](../../../backend/src/server.js).

Đã xác minh rồi → 409. Chưa cấu hình mailer → 503. Thành công → 204.

### `POST /auth/verify-email` — công khai

Body: `{ token }`. Băm token, tìm trong `Token` với `type: "verify_email"` còn hạn.

Không thấy hoặc hết hạn → 400 `"Link xác minh không hợp lệ hoặc đã hết hạn"`.
Thấy → đặt `user.emailVerifiedAt = new Date()`, xoá bản ghi token, trả 204.

### `POST /auth/forgot-password` — công khai

Body: `{ email }`. **Luôn trả 204**, kể cả email không tồn tại, kể cả tài khoản chưa
xác minh. Phân biệt thì người lạ dò được ai đã đăng ký.

Có user → xoá mọi token `reset_password` cũ của người đó (một link sống tại một thời
điểm), tạo token mới hạn 1 giờ, gửi mail.

Ngoại lệ duy nhất của quy tắc "luôn 204": chưa cấu hình mailer thì trả 503. Điều này
không lộ gì về việc email có tồn tại hay không, vì nó đúng với mọi email.

### `POST /auth/reset-password` — công khai

Body: `{ token, password }`. Băm, tìm token `reset_password` còn hạn.

Không thấy → 400. Thấy → băm mật khẩu mới bằng bcrypt cost 10 (giống `signUp`), lưu,
rồi:

1. Xoá bản ghi token đã dùng
2. `Session.deleteMany({ userId })` — đá mọi thiết bị đang đăng nhập, kể cả kẻ đang
   chiếm tài khoản
3. Đặt luôn `emailVerifiedAt` nếu chưa có — bấm được link trong hòm thư đã chứng minh
   quyền sở hữu email

Không tự đăng nhập sau khi đổi. Trả 204, frontend đẩy về trang đăng nhập.

### Thay đổi ở endpoint cũ

`POST /auth/signup` — sau `User.create`, tạo token xác minh và gửi mail. Gửi kiểu
"bắn rồi quên": mail lỗi chỉ ghi log, **không** làm hỏng việc đăng ký. Vẫn trả 204
như hiện tại nên frontend không phải sửa.

`publicUser()` trong authController thêm trường `emailVerifiedAt` để frontend biết có
hiện banner hay không.

## Model `User`

Thêm đúng một trường:

```js
emailVerifiedAt: { type: Date, default: null }
```

Optional nên tài khoản đã tồn tại không hỏng. Production đang trống nên không cần
script chuyển đổi dữ liệu.

## Giới hạn tần suất

Thêm `mailLimiter` vào [rateLimitMiddleware.js](../../../backend/src/middlewares/rateLimitMiddleware.js):
5 lượt mỗi giờ, đếm theo **địa chỉ email trong body** chứ không theo IP — chống việc
một người spam hòm thư của người khác. Không có email trong body thì lùi về đếm theo
IP bằng `ipKeyGenerator` của express-rate-limit (bắt buộc, nếu tự nối chuỗi IP thì
IPv6 bị đếm sai).

Gắn cho `forgot-password` (đếm theo email trong body) và `verify-email/resend` (đếm
theo `req.user._id`, vì route này không nhận email — người gửi đã đăng nhập).

`reset-password` và `verify-email` dùng `authLimiter` sẵn có vì chúng tiêu thụ token
chứ không sinh mail.

## Lấy token khi test

`smoke.mjs` cần đọc được token mà bình thường chỉ nằm trong email. Cách làm: khi
`EXPOSE_MAIL_TOKENS=1` **và** `NODE_ENV !== production`, mount thêm

```
GET /api/auth/__dev/last-token?email=...&type=verify_email|reset_password
```

trả về token thô mới nhất của email đó.

Chọn cách này thay vì cho các endpoint thật trả token trong response ở chế độ dev, vì
như thế `smoke.mjs` sẽ kiểm thử một hình dạng API khác với hình dạng chạy trên
production — đúng thứ khiến test mất giá trị.

Endpoint này **không bao giờ được mount** khi `NODE_ENV=production`, kể cả có đặt cờ.
Kiểm tra hai lớp: cờ bật và không phải production. `smoke.mjs` phải có một trường hợp
xác nhận nó vắng mặt khi thiếu cờ.

## Frontend

Ba trang mới, đăng ký trong [App.tsx](../../../frontend/src/App.tsx) ở nhóm public route:

| Đường dẫn | Trang | Việc |
|---|---|---|
| `/forgot-password` | `ForgotPasswordPage` | Nhập email → luôn hiện "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn" |
| `/reset-password?token=...` | `ResetPasswordPage` | Nhập mật khẩu mới hai lần → gọi API → chuyển về `/signin` |
| `/verify-email?token=...` | `VerifyEmailPage` | Tự gọi API khi tải trang, hiện thành công hoặc mời gửi lại |

Một component mới `EmailVerificationBanner` đặt trong `ChatAppPage`: hiện khi
`user.emailVerifiedAt` rỗng, có nút gửi lại mail và nút đóng tạm.

`SignInPage` thêm link "Quên mật khẩu?".

`authService` thêm 4 hàm gọi API. Kiểu `User` thêm `emailVerifiedAt: string | null`.

Ba đường dẫn mới đều là public route nên `ProtectedRoute` không đụng tới. Bộ chặn 401
trong [axios.ts](../../../frontend/src/lib/axios.ts) cũng cần thêm chúng vào
`NO_REFRESH_PATHS` để không kích hoạt vòng refresh vô ích khi chưa đăng nhập.

## Kiểm thử

Mở rộng [smoke.mjs](../../../backend/scripts/smoke.mjs), chạy được không cần hòm thư
thật nhờ cờ `EXPOSE_MAIL_TOKENS=1` ở môi trường dev.

Các trường hợp phải phủ:

1. Đăng ký xong → `emailVerifiedAt` rỗng
2. Xác minh bằng token đúng → 204, `emailVerifiedAt` có giá trị
3. Dùng lại chính token đó lần hai → 400 (token dùng một lần)
4. Xác minh bằng token bịa → 400
5. Quên mật khẩu với email tồn tại → 204
6. Quên mật khẩu với email không tồn tại → **cũng 204** (không lộ thông tin)
7. Đặt lại mật khẩu bằng token đúng → 204
8. Đăng nhập bằng mật khẩu **cũ** → 401
9. Đăng nhập bằng mật khẩu **mới** → 200
10. Refresh token lấy trước khi đổi mật khẩu → 401 (mọi phiên đã bị xoá)
11. Dùng lại token đặt lại mật khẩu lần hai → 400

Trường hợp 8 và 10 là hai cái quan trọng nhất: chúng chứng minh việc đổi mật khẩu
thật sự cắt được quyền truy cập của kẻ đang chiếm tài khoản.

## Việc bạn phải làm tay

1. Đăng ký https://brevo.com (miễn phí, không cần thẻ)
2. Senders & IP → thêm và xác minh một địa chỉ gmail làm người gửi
3. SMTP & API → Generate a new API key
4. Dán `BREVO_API_KEY`, `MAIL_FROM`, `MAIL_FROM_NAME` vào Environment trên Render

Làm được sau khi code xong. Chưa có thì app vẫn deploy và chạy bình thường, chỉ là
chức năng gửi mail trả 503.

## Thứ tự triển khai

1. Model `Token`, thêm `emailVerifiedAt` vào `User`
2. `mailer.js` và các biến môi trường
3. Bốn endpoint + `mailLimiter`
4. Mở rộng `smoke.mjs`, chạy tới khi xanh hết
5. Ba trang frontend + banner
6. Chạy thử tay toàn luồng ở local
7. Deploy, cấu hình Brevo, thử lại trên production bằng hòm thư thật

Mỗi bước là một commit riêng.
