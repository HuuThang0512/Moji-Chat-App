import bcrypt from "bcrypt";
import User from "../models/User.js";
import Session from "../models/Session.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_TOKEN_TTL = "30m";
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;

export const signUp = async (req, res) => {
  try {
    const { username, password, email, firstName, lastName } = req.body;
    if (!username || !password || !email || !firstName || !lastName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Kiểm tra user tồn tại chưa
    const duplicate = await User.findOne({ username });
    if (duplicate) {
      return res.status(409).json({ message: "Username already exists" });
    }

    // Mã hoá password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới
    await User.create({
      username,
      hashedPassword,
      email,
      displayName: `${firstName} ${lastName}`,
    });

    // Return
    return res.sendStatus(204); // Mã 204  là thành công nhưng không trả về dữ liệu gì hết
  } catch (error) {
    console.error("Error signing up", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const signIn = async (req, res) => {
  try {
    // Lấy thông tin input từ req.body
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Lấy hashed password từ DB và so sánh
    const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordCorrect) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // Nếu khớp thì tạo accessToken với JWT
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    // Tạo refreshToken
    const refreshToken = crypto.randomBytes(64).toString("hex");

    // Tạo session mới để lưu refreshToken
    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });

    // Trả refressToken về trong cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: REFRESH_TOKEN_TTL,
      sameSite: "none",
    });

    // Trả accessToken về trong res
    return res.status(200).json({ message: "Login successful", accessToken });
  } catch (error) {
    console.error("Error signing in", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const signOut = async (req, res) => {
  try {
    // Lấy refresh Token từ cookie ra
    const refreshToken = req?.cookies?.refreshToken;

    if (refreshToken) {
      // Xoá refreshToken trong DB
      await Session.deleteOne({ refreshToken });
      // Xoá refreshToken trong cookie
      res.clearCookie("refreshToken");
    }

    return res.sendStatus(204);
  } catch (error) {
    console.error("Error signing out", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    // Lấy RT từ cookie
    const refreshToken = req?.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // So sánh với RT trong DB
    const session = await Session.findOne({ refreshToken });
    if (!session) {
      return res
        .status(401)
        .json({ message: "Refresh token is not valid or expired" });
    }
    if (session.expiresAt < Date.now()) {
      return res
        .status(401)
        .json({ message: "Refresh token is not valid or expired" });
    }

    // Nếu khớp và chưa hết hạn thì tạo AT mới
    const accessToken = jwt.sign(
      { userId: session.userId },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );
    return res.status(200).json({ message: "Token refreshed", accessToken });
  } catch (error) {
    console.error("Error refreshing token", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
