import express from "express";
import { sendDirectMessage, sendGroupMessage } from "../controllers/messageController.js";
import { checkFriendship } from "../middlewares/friendMiddleware.js";
import { requireConversationAccess } from "../middlewares/conversationMiddleware.js";
import { validateBody } from "../middlewares/validateMiddleware.js";
import { sendDirectMessageSchema, sendGroupMessageSchema } from "../utils/schemas.js";

const router = express.Router();

router.post(
  "/direct",
  validateBody(sendDirectMessageSchema),
  checkFriendship,
  // conversationId là tuỳ chọn với DM, nhưng nếu được gửi lên thì bắt buộc
  // người gửi phải là thành viên của cuộc trò chuyện đó.
  requireConversationAccess({ from: "body", optional: true, type: "direct" }),
  sendDirectMessage
);

router.post(
  "/group",
  validateBody(sendGroupMessageSchema),
  requireConversationAccess({ from: "body", type: "group" }),
  sendGroupMessage
);

export default router;
