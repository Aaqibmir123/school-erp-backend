import { AssignSubjectPayload } from "../../../../shared-types/teacherAssignment.types";
import timetableModel from "../timetable/timetable.model";
import { TeacherModel } from "./teacher.model";
import TeacherAssignment from "./teacherAssignment.model";
/* ASSIGN SUBJECT */

export const assignSubject = async (
  schoolId: string,
  data: AssignSubjectPayload,
) => {
  const assignment = {
    schoolId,
    teacherId: data.teacherId,
    classId: data.classId,
    sectionId: data.sectionId || null,
    subjectId: data.subjectId,
    academicYearId: data.academicYearId,
    isClassTeacher: data.isClassTeacher || false,
  };

  try {
    const result = await TeacherAssignment.create(assignment);

    return result;
  } catch (error: any) {
    if (error.code === 11000) {
      throw new Error(
        "This subject is already assigned to this teacher for this class",
      );
    }

    throw error;
  }
};

/* GET TEACHER ASSIGNMENTS */

export const getTeacherAssignments = async (
  schoolId: string,
  teacherId: string,
) => {
  const assignments = await TeacherAssignment.find({
    schoolId,
    teacherId,
  })
    .select("classId sectionId subjectId createdAt") // 🔥 only needed
    .populate("classId", "name")
    .populate("sectionId", "name")
    .populate("subjectId", "name")
    .sort({ createdAt: -1 })
    .lean(); // 🔥 MUST

  return assignments;
};

/* DELETE TEACHER ASSIGNMENT */

export const removeTeacherSubject = async ({
  teacherId,
  subjectId,
  forceDelete = false,
}: any) => {
  if (!teacherId || !subjectId) {
    throw new Error("teacherId and subjectId are required");
  }

  const exists = await timetableModel.findOne({
    teacherId,
    subjectId,
  });

  if (exists && !forceDelete) {
    const err: any = new Error(
      "This subject is used in timetable. Confirm delete to remove it from timetable as well.",
    );
    err.statusCode = 409;
    err.requiresConfirmation = true;
    throw err;
  }

  if (exists && forceDelete) {
    await timetableModel.deleteMany({
      teacherId,
      subjectId,
    });
  }

  await TeacherModel.findByIdAndUpdate(teacherId, {
    $pull: { subjects: subjectId },
  });

  return { success: true };
};
