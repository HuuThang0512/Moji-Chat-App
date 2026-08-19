import mongoose from "mongoose";
import { env } from "../config/env.js";

export const connectDB = async () => {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log("Đã kết nối MongoDB");
  } catch (error) {
    console.error("Không kết nối được MongoDB:", error.message);
    process.exit(1);
  }
};
