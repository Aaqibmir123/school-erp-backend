import mongoose from "mongoose";
import { env } from "./env";

export const connectDB = async () => {
  try {
    console.log("Connecting to DB...");

    await mongoose.connect(env.MONGO_URI);

    console.log("✅ Mongo Connected");
  } catch (err) {
    console.error("❌ DB connection error:", err);
    throw err; // ✅ IMPORTANT
  }
};
