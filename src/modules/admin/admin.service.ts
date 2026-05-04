import { approvalNoticeTemplate } from "../../templates/approvalNoticeTemplate";
import { env } from "../../config/env";
import { sendEmail } from "../../utils/email";
import { School } from "../school/school.model";
import { User, UserRole } from "../user/user.model";

export const getPendingSchools = async () => {
  return School.find({ status: "PENDING" });
};

export const getAllSchools = async () => {
  return School.find().sort({ createdAt: -1 });
};

export const approveSchool = async (schoolId: string) => {
  const school = await School.findById(schoolId).select("+passwordHash");

  if (!school) {
    throw new Error("School not found");
  }

  if (!school.passwordHash) {
    throw new Error(
      "This application has no password on file. Please submit a new application with a password.",
    );
  }

  const existingUser = await User.findOne({
    email: school.email,
  });

  if (existingUser) {
    throw new Error("Admin user already exists for this email");
  }

  await User.create({
    email: school.email,
    isFirstLogin: false,
    name: school.principalName,
    password: school.passwordHash,
    phone: school.phone,
    role: UserRole.SCHOOL_ADMIN,
    schoolId: school._id,
  });

  school.status = "APPROVED";
  await school.save();

  const baseUrl =
    env.WEB_APP_URL || "https://aaqib-school-erp-admin.vercel.app";
  const loginUrl = `${baseUrl.replace(/\/$/, "")}/`;

  if (school.email) {
    try {
      await sendEmail(
        school.email,
        "School ERP — Application approved",
        approvalNoticeTemplate(loginUrl),
      );
    } catch (err) {
      console.warn("[approveSchool] Optional approval email failed:", err);
    }
  }

  return school;
};

export const updateSchoolStatus = async (
  schoolId: string,
  status: "PENDING" | "APPROVED" | "REJECTED",
) => {
  const school = await School.findById(schoolId);

  if (!school) {
    throw new Error("School not found");
  }

  school.status = status;
  await school.save();

  return school;
};
