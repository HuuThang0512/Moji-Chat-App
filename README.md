# Moji

Ứng dụng chat thời gian thực: nhắn tin riêng, nhắn tin nhóm, kết bạn, trạng thái online và đã xem.

- **Backend** — Node.js, Express 5, MongoDB (Mongoose), Socket.IO, JWT
- **Frontend** — React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui, Zustand

Deploy lên môi trường thật: xem [DEPLOY.md](DEPLOY.md).

---

## Yêu cầu

| Thành phần | Phiên bản |
|---|---|
| Node.js | >= 20 |
| MongoDB | >= 6 (local hoặc Atlas) |
| Cloudinary | Tuỳ chọn, chỉ cần cho chức năng tải ảnh đại diện |

## Cài đặt

```bash
git clone <repo-url>
cd Moji

# Backend
cd backend
npm install
cp .env.example .env      # rồi mở .env và điền giá trị thật

# Frontend
cd ../frontend
npm install
cp .env.example .env.development
```

### Biến môi trường backend

Sinh chuỗi bí mật cho JWT:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `MONGODB_CONNECTIONSTRING` | Có | Chuỗi kết nối MongoDB |
| `ACCESS_TOKEN_SECRET` | Có | Khoá ký access token |
| `PORT` | Không | Mặc định `5001` |
| `NODE_ENV` | Không | `development` (mặc định) hoặc `production` |
| `CLIENT_URL` | Không | Origin của frontend, mặc định `http://localhost:5173` |
| `CLOUDINARY_*` | Không | Thiếu thì upload avatar trả về 503, phần còn lại vẫn chạy |

Server kiểm tra các biến bắt buộc lúc khởi động và thoát ngay kèm thông báo nếu thiếu.

`NODE_ENV` quyết định thuộc tính `secure` của cookie refresh token: tắt ở
`development` để chạy được trên `http://localhost`, bật ở `production` vì lúc đó
đã có https. `sameSite` luôn là `lax` do backend phục vụ luôn frontend nên hai bên
cùng origin.

## Chạy

Mở hai terminal:

```bash
# Terminal 1
cd backend && npm run dev      # http://localhost:5001

# Terminal 2
cd frontend && npm run dev     # http://localhost:5173
```

Kiểm tra backend đã sống:

```bash
curl http://localhost:5001/api/health
# {"status":"ok","env":"development","database":"connected","uptime":3}
```

## Kiểm thử

```bash
cd backend
npm run smoke                                        # đánh vào http://localhost:5001/api
SMOKE_BASE_URL=http://localhost:5099/api npm run smoke
```

`npm run smoke` chạy toàn bộ luồng REST trên một server đang chạy: đăng ký, đăng
nhập, refresh token, kết bạn, tạo cuộc trò chuyện, gửi tin nhắn, đánh dấu đã đọc,
và các trường hợp bị từ chối quyền. Script tạo user thật trong database đang được
trỏ tới, nên **chỉ chạy trên database dev**.

```bash
cd frontend
npm run lint
npm run build
```

## Chạy bằng Docker

Image gộp cả frontend và backend vào một service duy nhất, giống hệt thứ chạy trên
production. Backend tự phát hiện thư mục `public` và phục vụ luôn bản build.

```bash
docker build -t moji .

docker run --rm -p 5001:5001 \
  -e MONGODB_CONNECTIONSTRING="mongodb://host.docker.internal:27017/moji" \
  -e ACCESS_TOKEN_SECRET="chuoi-bat-ky-de-test" \
  moji
```

Mở http://localhost:5001 - cả giao diện lẫn API đều nằm ở đó.

## Cấu trúc

```
backend/src
├── config/env.js            Nạp .env, kiểm tra biến bắt buộc, export cấu hình
├── controllers/             Xử lý request cho auth, user, friend, conversation, message
├── middlewares/
│   ├── authMiddleware        Xác thực access token
│   ├── conversationMiddleware Chặn truy cập conversation không thuộc về mình
│   ├── friendMiddleware      Bắt buộc là bạn bè mới nhắn tin được
│   ├── validateMiddleware    Kiểm tra body/query/params bằng zod
│   ├── rateLimitMiddleware   Giới hạn tần suất
│   ├── uploadMiddleware      Nhận file và đẩy lên Cloudinary
│   └── errorMiddleware       404 và error handler tập trung
├── models/                  Schema Mongoose
├── routes/                  Định nghĩa endpoint
├── socket/                  Server Socket.IO và theo dõi người đang online
└── utils/                   AppError, schema zod, helper tin nhắn

frontend/src
├── components/              Component theo tính năng, components/ui là shadcn
├── lib/                     Instance axios, tiện ích xử lý lỗi
├── pages/                   Các trang gắn với route
├── services/                Lớp gọi API
├── stores/                  Zustand store: auth, chat, friend, socket, theme, user
└── types/                   Kiểu dữ liệu dùng chung
```

## API

Mọi endpoint đều có tiền tố `/api`. Trừ nhóm `/auth` và `/health`, tất cả yêu cầu
header `Authorization: Bearer <accessToken>`.

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/health` | Trạng thái server và database |
| POST | `/auth/signup` | Đăng ký |
| POST | `/auth/signin` | Đăng nhập, trả access token + cookie refresh |
| POST | `/auth/refresh` | Đổi cookie refresh lấy access token mới |
| POST | `/auth/signout` | Đăng xuất, xoá session |
| GET | `/users/me` | Thông tin người dùng hiện tại |
| GET | `/users/search?username=` | Tìm người dùng kèm quan hệ bạn bè |
| POST | `/users/avatar` | Tải ảnh đại diện (multipart, field `file`) |
| GET | `/friends` | Danh sách bạn bè |
| GET | `/friends/requests` | Lời mời đã gửi và đã nhận |
| POST | `/friends/requests` | Gửi lời mời |
| POST | `/friends/requests/:id/accept` | Chấp nhận |
| POST | `/friends/requests/:id/decline` | Từ chối hoặc thu hồi |
| GET | `/conversations` | Danh sách cuộc trò chuyện |
| POST | `/conversations` | Tạo chat riêng hoặc nhóm |
| GET | `/conversations/:id/messages` | Tin nhắn, phân trang bằng cursor |
| PATCH | `/conversations/:id/seen` | Đánh dấu đã đọc |
| POST | `/messages/direct` | Gửi tin nhắn riêng |
| POST | `/messages/group` | Gửi tin nhắn nhóm |

### Sự kiện Socket.IO

Kết nối kèm access token: `io(url, { auth: (cb) => cb({ token }) })`.

| Hướng | Sự kiện | Nội dung |
|---|---|---|
| server → client | `online-users` | Mảng userId đang online |
| server → client | `new-message` | `{ message, conversation, unreadCount }` |
| server → client | `read-message` | `{ conversationId, seenBy, unreadCount }` |
| server → client | `new-group` | Conversation nhóm vừa được tạo |
| client → server | `join-conversation` | `conversationId` (server kiểm tra thành viên trước khi cho join) |

## Ghi chú bảo mật

- Access token sống 30 phút và chỉ nằm trong bộ nhớ; refresh token đặt trong cookie
  `httpOnly` với `path=/api/auth`, hạn 14 ngày, lưu trong collection `Session` và
  tự hết hạn nhờ TTL index.
- Mọi thao tác đọc/ghi trên một conversation đều kiểm tra người gọi có nằm trong
  `participants` hay không, cả trên REST lẫn khi socket join phòng.
- Chỉ nhắn tin được với người đã là bạn bè.
- Toàn bộ body, query và params đều đi qua schema zod trước khi tới controller.
- `helmet` bật các security header; `express-rate-limit` giới hạn 20 lần/15 phút cho
  các route xác thực, 300 lần/phút cho phần API còn lại và 20 lần/giờ cho upload.

## Chưa có

Gửi ảnh trong tin nhắn, typing indicator, sửa/xoá tin nhắn, quản lý thành viên
nhóm, huỷ kết bạn, sửa hồ sơ và đổi mật khẩu, tìm kiếm tin nhắn.
