import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * Tách các thư viện ít thay đổi ra chunk riêng để trình duyệt cache
         * được lâu: khi code ứng dụng đổi, người dùng chỉ tải lại chunk nhỏ.
         */
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          ui: ["radix-ui", "lucide-react"],
          socket: ["socket.io-client"],
        },
      },
    },
  },
});
