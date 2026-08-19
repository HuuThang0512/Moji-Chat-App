# Deploy Moji

Kiến trúc deploy: **một service duy nhất**. Backend Express phục vụ luôn bản build
của frontend, nên cả trang web, REST API và Socket.IO đều nằm trên cùng một domain.

```
https://moji-xxxx.onrender.com
├── /              → frontend (React build, phục vụ tĩnh)
├── /api/*         → Express
└── /socket.io/*   → Socket.IO
```

Lý do gộp một origin thay vì tách frontend/backend: refresh token nằm trong cookie
`httpOnly`. Nếu frontend và backend khác domain thì đó là **cookie bên thứ ba** —
Safari chặn sẵn, Chrome đang chặn dần. Khi cookie bị chặn, `/auth/refresh` không
nhận được gì và người dùng bị đăng xuất mỗi lần access token hết hạn (30 phút) hoặc
mỗi lần tải lại trang. Cùng origin thì cookie là first-party, dùng `SameSite=Lax`,
không dính vấn đề đó.

---

## Bạn cần chuẩn bị

| Việc | Bắt buộc | Thời gian |
|---|---|---|
| Tài khoản MongoDB Atlas (gói M0 free) | Có | ~5 phút |
| Tài khoản Render nối với GitHub | Có | ~3 phút |
| Tài khoản Cloudinary (gói free) | Không — thiếu thì chỉ tính năng đổi ảnh đại diện trả về 503 | ~3 phút |

---

## Bước 1 — Tạo database trên MongoDB Atlas

Cluster cũ trong `backend/.env` đã không còn phân giải được DNS, phải tạo cái mới.

1. Vào <https://cloud.mongodb.com>, đăng ký hoặc đăng nhập.
2. **Create** → chọn **M0 Free** → region gần nhất (Singapore) → **Create Deployment**.
3. Atlas hiện hộp tạo user database. Đặt username và password rồi bấm
   **Create Database User**. **Lưu password lại**, Atlas không cho xem lại.
   Tránh dùng ký tự `@ : / ?` trong password vì phải encode khi nhét vào URI.
4. Menu trái → **Network Access** → **Add IP Address** → **Allow Access from Anywhere**
   (`0.0.0.0/0`) → Confirm.

   Gói free của Render không có IP tĩnh nên không thể allowlist một IP cụ thể.
   Bù lại, database vẫn được bảo vệ bằng username/password và TLS.
5. Menu trái → **Clusters** → **Connect** → **Drivers** → copy chuỗi dạng:

   ```
   mongodb+srv://<db_user>:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

6. Thay `<db_password>` bằng password thật và **chèn tên database vào trước dấu `?`**:

   ```
   mongodb+srv://mojiuser:MatKhauThat@cluster0.xxxxx.mongodb.net/moji?retryWrites=true&w=majority
   ```

   Thiếu chữ `moji` này thì Mongo ghi vào database mặc định `test`.

Giữ chuỗi vừa tạo, lát nữa dán vào Render dưới tên `MONGODB_CONNECTIONSTRING`.

## Bước 2 — Sinh khoá ký token

Chạy trên máy bạn:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy chuỗi hex kết quả, lát nữa dán vào `ACCESS_TOKEN_SECRET`.

Đừng dùng lại chuỗi trong `backend/.env` hiện tại: file đó đã nằm trên máy local
suốt quá trình phát triển, coi như không còn bí mật.

## Bước 3 — Cloudinary (tuỳ chọn)

Bỏ qua bước này nếu chưa cần chức năng đổi ảnh đại diện. Ứng dụng vẫn chạy bình
thường, chỉ endpoint upload trả về 503 kèm thông báo rõ ràng.

1. Đăng ký tại <https://cloudinary.com>.
2. Dashboard hiện sẵn **Cloud name**, **API Key**, **API Secret** — copy cả ba.

## Bước 4 — Đẩy code lên GitHub

```bash
cd /e/WorkSpace/Projects/Moji
git add .
git commit -m "chore: add production deployment setup"
git push origin master
```

## Bước 5 — Tạo service trên Render

Repo đã có sẵn `render.yaml` nên Render tự đọc cấu hình, không phải bấm tay.

1. Vào <https://dashboard.render.com>, đăng nhập bằng GitHub.
2. **New** → **Blueprint** → chọn repo `Moji-Chat-App` → **Connect**.
3. Render đọc `render.yaml` và hỏi giá trị cho các biến đánh dấu `sync: false`.
   Điền:

   | Biến | Giá trị |
   |---|---|
   | `MONGODB_CONNECTIONSTRING` | Chuỗi ở Bước 1 |
   | `ACCESS_TOKEN_SECRET` | Chuỗi hex ở Bước 2 |
   | `CLOUDINARY_CLOUD_NAME` | Bước 3, hoặc để trống |
   | `CLOUDINARY_API_KEY` | Bước 3, hoặc để trống |
   | `CLOUDINARY_API_SECRET` | Bước 3, hoặc để trống |

4. **Apply**. Render build image từ `Dockerfile` — lần đầu mất khoảng 5–8 phút.

Không cần đặt `CLIENT_URL`: cùng origin nên không dùng tới CORS.
Không cần đặt `PORT`: Render tự cấp và server đọc `process.env.PORT`.

## Bước 6 — Kiểm tra

Render cấp một URL dạng `https://moji-xxxx.onrender.com`.

```bash
curl https://moji-xxxx.onrender.com/api/health
# {"status":"ok","env":"production","database":"connected","uptime":12}
```

`database` phải là `connected`. Nếu là `disconnected`, xem mục Sự cố bên dưới.

Sau đó mở URL trên trình duyệt, đăng ký hai tài khoản ở hai cửa sổ khác nhau
(một cửa sổ ẩn danh), kết bạn và nhắn tin để xác nhận realtime chạy.

Chạy được cả bộ test đầu-cuối trên môi trường thật:

```bash
cd backend
SMOKE_BASE_URL=https://moji-xxxx.onrender.com/api npm run smoke
```

Script tạo user thật, nên nếu chạy trên production thì sau đó nên xoá các user
tên `alice_*`, `bob_*`, `mallory_*`, `carol_*` trong Atlas.

---

## Giới hạn của gói free

- **Service ngủ sau 15 phút không có request.** Request kế tiếp phải chờ cold start
  khoảng 50 giây và mọi kết nối Socket.IO đang mở sẽ bị rớt. Chấp nhận được cho
  demo và portfolio, không phù hợp cho người dùng thật. Gói Starter (7 USD/tháng)
  bỏ giới hạn này.
- **Chỉ một instance.** Danh sách người online và các phòng Socket.IO đang lưu
  trong bộ nhớ của tiến trình. Muốn chạy nhiều instance thì phải thêm Redis adapter
  cho Socket.IO, hiện chưa có.
- **M0 giới hạn 512MB.** Đủ cho hàng chục nghìn tin nhắn.

## Xử lý sự cố

| Triệu chứng | Nguyên nhân |
|---|---|
| `/api/health` báo `database: disconnected` | Sai password trong URI, hoặc chưa mở `0.0.0.0/0` ở Network Access |
| Log Render: `Thiếu biến môi trường bắt buộc` | Chưa điền `MONGODB_CONNECTIONSTRING` hoặc `ACCESS_TOKEN_SECRET` |
| Đăng nhập xong F5 lại bị đăng xuất | Cookie không được lưu. Kiểm tra trang đang chạy `https` chứ không phải `http` |
| Ảnh đại diện không hiện | CSP chặn domain lạ. Chỉ `res.cloudinary.com` được cho phép, xem `contentSecurityPolicy` trong `backend/src/server.js` |
| Tải ảnh lên báo 503 | Chưa cấu hình đủ ba biến `CLOUDINARY_*` |
| Tin nhắn không tới ngay, phải F5 | Socket.IO không kết nối được. Mở DevTools tab Network lọc `socket.io` để xem lỗi |
| Lần đầu vào trang chờ rất lâu | Service đang ngủ, đây là hành vi của gói free |

## Chạy thử image production ở máy local

Kiểm chứng chính xác thứ Render sẽ chạy, trước khi đẩy lên:

```bash
docker build -t moji .

docker run --rm -p 5001:5001 \
  -e MONGODB_CONNECTIONSTRING="mongodb://host.docker.internal:27017/moji" \
  -e ACCESS_TOKEN_SECRET="chuoi-bat-ky-de-test" \
  -e NODE_ENV=production \
  moji
```

Mở <http://localhost:5001>.

Lưu ý: `NODE_ENV=production` bật cookie `secure`, mà `http://localhost` thì không
phải https nên trình duyệt sẽ loại cookie refresh và không đăng nhập được. Muốn
thử luồng đăng nhập ở local thì bỏ `-e NODE_ENV=production` đi; phần phục vụ
frontend và API vẫn chạy y hệt vì nó chỉ phụ thuộc vào sự tồn tại của thư mục
build, không phụ thuộc `NODE_ENV`.

## Đổi sang nền tảng khác

`Dockerfile` không phụ thuộc Render. Chỗ khác cần đúng ba thứ: build từ Dockerfile,
truyền các biến môi trường ở Bước 5, và mở cổng theo `PORT`.

- **Railway** — New Project → Deploy from GitHub → tự nhận Dockerfile → thêm biến trong tab Variables
- **Fly.io** — `fly launch --dockerfile Dockerfile` rồi `fly secrets set MONGODB_CONNECTIONSTRING=... ACCESS_TOKEN_SECRET=...`
- **VPS** — `docker build` rồi `docker run`, đặt nginx phía trước để cấp TLS
