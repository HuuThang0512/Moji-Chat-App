import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectedRoute = async (req, res, next) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    // Xác nhận token hợp lệ
    if (!token) {
      return res.status(403).json({ message: "Unauthorized" });
    } 

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (error, decodedUser) => {
        if (error) {
            console.error("Error verifying token", error);
            return res.status(403).json({ message: "Access token is not valid or expired" });
        }
        const user = await User.findById(decodedUser.userId).select("-hashedPassword");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        req.user = user;
        next();
    })
  } catch (error) {
    console.error("Error in protectedRoute middleware", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
