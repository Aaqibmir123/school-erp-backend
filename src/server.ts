import "dotenv/config"; // ✅ ensure env loaded

import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ Database connected");

    const PORT = Number(env.PORT) || 5000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running`);
      console.log(`👉 Local: http://localhost:${PORT}`);
      console.log(`👉 Network: http://192.168.1.5:${PORT}`);
    });
  } catch (err) {
    // ✅ use "err"
    console.error("❌ Server failed:", err);
    process.exit(1);
  }
};

startServer();
