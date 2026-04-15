import express from "express";
import { authMe, test, searchUserByUsername } from "../controllers/userController.js";


const router = express.Router();

router.get('/me', authMe)
router.get('/test', test)
router.get('/search', searchUserByUsername)


export default router;