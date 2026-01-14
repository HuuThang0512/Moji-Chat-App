import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist"],
  },

  {
    files: ["**/*.{ts,tsx}"],

    languageOptions: {
      confirmTypeScript: true, // 👈 QUAN TRỌNG
      ecmaVersion: 2020,
      sourceType: "module",
      globals: globals.browser,
    },

    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },

    rules: {
      // JS
      ...js.configs.recommended.rules,

      // TS (BẮT BUỘC, nếu không sẽ parse lỗi)
      ...tseslint.configs.recommended.rules,

      // React
      ...reactHooks.configs.recommended.rules,
      ...reactRefresh.configs.vite.rules,

      // 🔥 Tắt unused-vars
      "@typescript-eslint/no-unused-vars": "off",
    },
  }
);
