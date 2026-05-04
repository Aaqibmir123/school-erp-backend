require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const DEFAULT_PHONE = "9596523404";
const DEFAULT_PASSWORD = "dev@3404";

const normalizePhone = (value) => String(value || "").replace(/\D/g, "").slice(-10);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, unique: true, sparse: true },
    phone: { type: String, required: true },
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT", "REVIEWER"],
      required: true,
    },
    password: { type: String },
    isFirstLogin: { type: Boolean, default: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School" },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is required in backend/.env");
  }

  const cliPhone = process.argv[2];
  const cliPassword = process.argv[3];

  const phone = normalizePhone(cliPhone || process.env.SUPER_ADMIN_PHONE || DEFAULT_PHONE);
  const password = String(cliPassword || process.env.SUPER_ADMIN_PASSWORD || DEFAULT_PASSWORD);

  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new Error(`Invalid phone '${phone}'. Expected a valid 10-digit Indian mobile number.`);
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  await mongoose.connect(mongoUri);

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await User.findOneAndUpdate(
    { phone },
    {
      $set: {
        isFirstLogin: false,
        password: hashedPassword,
        role: "SUPER_ADMIN",
        status: "active",
      },
      $setOnInsert: {
        name: "Super Admin",
      },
    },
    {
      new: true,
      upsert: true,
    },
  ).select("_id phone role status isFirstLogin");

  console.log("Super admin ready:", {
    id: String(result._id),
    phone: result.phone,
    role: result.role,
    status: result.status,
    isFirstLogin: result.isFirstLogin,
  });
}

run()
  .catch((error) => {
    console.error("Super admin seed failed:", error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });

