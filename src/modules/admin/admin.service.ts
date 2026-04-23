import { setPasswordTemplate } from "../../templates/setPasswordTemplate";
import { sendEmail } from "../../utils/email";
import { generateSetPasswordToken } from "../../utils/jwt";
import { School } from "../school/school.model";
import { User, UserRole } from "../user/user.model";

export const getPendingSchools = async () => {
  return School.find({ status: "PENDING" });
};

export const approveSchool = async (schoolId: string) => {
  const school = await School.findById(schoolId);

  if (!school) {
    throw new Error("School not found");
  }

  /* CHECK IF USER ALREADY EXISTS */

  const existingUser = await User.findOne({
    email: school.email,
  });

  if (existingUser) {
    throw new Error("Admin user already exists for this email");
  }

  /* CREATE ADMIN USER */

  const user = await User.create({
    name: school.principalName,
    email: school.email,
    phone: school.phone,
    role: UserRole.SCHOOL_ADMIN,
    schoolId: school._id,
  });

  /* GENERATE TOKEN */

  const token = generateSetPasswordToken(user._id.toString());

  const link = `http://localhost:3000/set-password?token=${token}`;

  /* SEND EMAIL */

  await sendEmail(user.email, "Set Your Password", setPasswordTemplate(link));

  /* UPDATE SCHOOL STATUS AFTER EMAIL SUCCESS */

  school.status = "APPROVED";

  await school.save();

  return school;
};
