import { User, UserRole } from "../../user/user.model";
import { StudentModel } from "./student.model";

import { generateStudentTemplate } from "./student.template";

export const downloadStudentTemplateService = async () => {
  const buffer = generateStudentTemplate();

  return buffer;
};
export const createStudentService = async (
  schoolId: string,
  academicYearId: string,
  data: any,
) => {
  let parentUser = await User.findOne({ phone: data.parentPhone });

  if (!parentUser) {
    parentUser = await User.create({
      name: data.fatherName,
      email: `${data.parentPhone}@parent.local`,
      phone: data.parentPhone,
      role: UserRole.PARENT,
      schoolId,
    });
  }

  const student = await StudentModel.create({
    ...data,
    schoolId,
    academicYearId,
    parentUserId: parentUser._id,
  });

  return student;
};

export const getStudentsService = async (schoolId: string, query: any) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  const skip = (page - 1) * limit;

  const filter: any = { schoolId };

  const students = await StudentModel.find(filter)
    .populate("classId", "name")
    .populate("sectionId", "name")
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await StudentModel.countDocuments(filter);

  return { students, total };
};

export const getStudentsByClassService = async (
  schoolId: string,
  classId: string,
  sectionId?: string,
) => {
  const filter: any = {
    schoolId,
    classId,
  };

  if (sectionId) {
    filter.sectionId = sectionId;
  }

  return StudentModel.find(filter)
    .select("_id firstName lastName rollNumber")
    .sort({ rollNumber: 1 }) // 🔥 UX
    .lean(); // 🔥 performance
};

export const updateStudentService = async (
  schoolId: string,
  studentId: string,
  data: any,
) => {
  // if (!Types.ObjectId.isValid(studentId)) {
  //   throw new Error("Invalid student ID");
  // }

  const student = await StudentModel.findOneAndUpdate(
    { _id: studentId, schoolId },
    data,
    { new: true },
  )
    .populate("classId", "name")
    .populate("sectionId", "name")
    .lean();

  if (!student) throw new Error("Student not found");

  return student;
};

/* ================= DELETE ================= */

export const deleteStudentService = async (
  schoolId: string,
  studentId: string,
) => {
  // if (!Types.ObjectId.isValid(studentId)) {
  //   throw new Error("Invalid student ID");
  // }

  const student = await StudentModel.findOneAndDelete({
    _id: studentId,
    schoolId,
  });

  if (!student) throw new Error("Student not found");

  return true;
};

export const getAllStudentsByClassService = async (
  schoolId: string,
  classId: string,
  sectionId?: string,
) => {
  const query: any = {
    schoolId,
    classId,
  };

  if (sectionId) {
    query.sectionId = sectionId;
  }

  const students = await StudentModel.find(query)
    .select(
      `
      _id 
      firstName 
      lastName 
      rollNumber 
      classId 
      sectionId 
      address 
      fatherName 
      parentPhone 
      gender
    `,
    )
    .populate("classId", "name")
    .populate("sectionId", "name")
    .sort({ rollNumber: 1 })
    .lean();

  return students.map((s: any) => ({
    _id: s._id,

    // BASIC
    name: `${s.firstName} ${s.lastName}`,
    rollNumber: s.rollNumber,

    // CLASS
    className: s.classId?.name || "",
    sectionName: s.sectionId?.name || "All",

    // IDS (IMPORTANT)
    classId: s.classId?._id,
    sectionId: s.sectionId?._id || null,

    // EXTRA INFO 🔥
    fatherName: s.fatherName || "",
    parentPhone: s.parentPhone || "",
    gender: s.gender || "",

    address: s.address || "",
  }));
};
