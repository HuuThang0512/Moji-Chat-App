# syntax=docker/dockerfile:1

# ---------- Stage 1: build frontend ----------
FROM node:22-alpine AS client

WORKDIR /build

# Copy manifest trước để Docker cache được lớp cài đặt: chỉ khi package.json
# hoặc lockfile đổi thì npm ci mới chạy lại.
# .npmrc phải có mặt trước npm ci: nó chứa legacy-peer-deps cho @emoji-mart/react.
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN npm ci

COPY frontend/ ./
# .env.production trỏ VITE_API_URL=/api và để trống VITE_SOCKET_URL,
# nên bản build không dính cứng domain nào.
RUN npm run build


# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend/src ./src
COPY backend/scripts ./scripts

# server.js tự phát hiện thư mục public và bật chế độ phục vụ frontend.
COPY --from=client /build/dist ./public

# Chạy bằng user không phải root: nếu ứng dụng bị chiếm quyền thì thiệt hại
# vẫn bị giới hạn trong container.
USER node

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
