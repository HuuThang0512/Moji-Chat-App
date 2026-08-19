import express from "express";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getAllFriends,
} from "../controllers/friendController.js";
import { validateBody, validateParams } from "../middlewares/validateMiddleware.js";
import { requestIdParamSchema, sendFriendRequestSchema } from "../utils/schemas.js";

const router = express.Router();

router.post("/requests", validateBody(sendFriendRequestSchema), sendFriendRequest);
router.post("/requests/:requestId/accept", validateParams(requestIdParamSchema), acceptFriendRequest);
router.post("/requests/:requestId/decline", validateParams(requestIdParamSchema), declineFriendRequest);
router.get("/requests", getFriendRequests);
router.get("/", getAllFriends);

export default router;
