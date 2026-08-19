import express from "express";
import { signUp, signIn, signOut, refreshToken } from "../controllers/authController.js";
import { validateBody } from "../middlewares/validateMiddleware.js";
import { signInSchema, signUpSchema } from "../utils/schemas.js";
import { authLimiter } from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();

router.post("/signup", authLimiter, validateBody(signUpSchema), signUp);
router.post("/signin", authLimiter, validateBody(signInSchema), signIn);
router.post("/signout", signOut);
router.post("/refresh", authLimiter, refreshToken);

export default router;
