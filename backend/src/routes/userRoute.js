import express from "express";
import { authMe, searchUserByUsername, uploadAvatar } from "../controllers/userController.js";
import { upload } from "../middlewares/uploadMiddleware.js";
import { validateQuery } from "../middlewares/validateMiddleware.js";
import { searchUserQuerySchema } from "../utils/schemas.js";
import { uploadLimiter } from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();

router.get("/me", authMe);
router.get("/search", validateQuery(searchUserQuerySchema), searchUserByUsername);
router.post("/avatar", uploadLimiter, upload.single("file"), uploadAvatar);
// Giữ lại đường dẫn cũ để client chưa cập nhật không bị hỏng.
router.post("/uploadAvatar", uploadLimiter, upload.single("file"), uploadAvatar);

export default router;
