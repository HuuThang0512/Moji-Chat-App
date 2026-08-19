import express from "express";
import {
  createConversation,
  getConversations,
  getMessages,
  markAsSeen,
} from "../controllers/conversationController.js";
import { checkFriendship } from "../middlewares/friendMiddleware.js";
import { requireConversationAccess } from "../middlewares/conversationMiddleware.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validateMiddleware.js";
import {
  conversationIdParamSchema,
  createConversationSchema,
  getMessagesQuerySchema,
} from "../utils/schemas.js";

const router = express.Router();

router.post("/", validateBody(createConversationSchema), checkFriendship, createConversation);
router.get("/", getConversations);

router.get(
  "/:conversationId/messages",
  validateParams(conversationIdParamSchema),
  validateQuery(getMessagesQuerySchema),
  requireConversationAccess(),
  getMessages
);

router.patch(
  "/:conversationId/seen",
  validateParams(conversationIdParamSchema),
  requireConversationAccess(),
  markAsSeen
);

export default router;
