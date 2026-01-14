import express from "express";
import { signUp, signIn, signOut } from "../controllers/authController.js";
import { refreshToken } from "../controllers/authController.js";
const router = express.Router();

router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/signout", signOut);
router.post("/refresh", refreshToken);

export default router;