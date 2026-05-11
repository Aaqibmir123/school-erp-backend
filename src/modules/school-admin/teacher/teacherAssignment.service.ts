import { AssignSubjectPayload } from "../../../../shared-types/teacherAssignment.types";
import AcademicYear from "../../academicYears/academicYear.model";
import timetableModel from "../timetable/timetable.model";
import { TeacherModel } from "./teacher.model";
import TeacherAssignment from "./teacherAssignment.model";

const findExactTeacherAssignment = (schoolId: string, data: AssignSubjectPayload) =>
  TeacherAssignment.findOne({
    schoolId,
    teacherId: data.teacherId,
    classId: data.classId,
    sectionId: data.sectionId || null,
    subjectId: data.subjectId,
    academicYearId: data.academicYearId,
  })
    .populate("classId", "name")
    .populate("subjectId", "name")
    .lean();

const dropLegacyUniqueSubjectIndex = async () => {
  try {
    const indexes = await TeacherAssignment.collection.indexes();
    const legacyIndex = indexes.find((index: any) => {
      const keys = Object.keys(index.key || {});
      return (
        index.unique &&
        keys.length === 3 &&
        index.key?.classId === 1 &&
        index.key?.subjectId === 1 &&
        index.key?.academicYearId === 1
      );
    });

    if (!legacyIndex?.name) {
      return false;
    }

    await TeacherAssignment.collection.dropIndex(legacyIndex.name);
    return true;
  } catch {
    return false;
  }
};

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
      const existingForTeacher = await findExactTeacherAssignment(schoolId, data);

      if (existingForTeacher) {
        throw new Error(
          "This subject is already assigned to this teacher for the selected class and academic year.",
        );
      }

      const removedLegacyIndex = await dropLegacyUniqueSubjectIndex();

      if (removedLegacyIndex) {
        try {
          return await TeacherAssignment.create(assignment);
        } catch (retryError: any) {
          if (retryError.code === 11000) {
            const retryExistingForTeacher = await findExactTeacherAssignment(
              schoolId,
              data,
            );

            if (retryExistingForTeacher) {
              throw new Error(
                "This subject is already assigned to this teacher for the selected class and academic year.",
              );
            }
          }

          throw retryError;
        }
      }

      throw new Error("This subject assignment already exists.");
    }

    throw error;
  }
};

export const getTeacherAssignments = async (
  schoolId: string,
  teacherId: string,
) => {
  const assignments = await TeacherAssignment.find({
    schoolId,
    teacherId,
  })
    .select("teacherId classId sectionId subjectId academicYearId createdAt")
    .populate("teacherId", "firstName lastName")
    .populate("classId", "name")
    .populate("sectionId", "name")
    .populate("subjectId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const academicYearIds = Array.from(
    new Set(
      assignments
        .map((assignment) => String(assignment.academicYearId || "").trim())
        .filter(Boolean),
    ),
  );

  const academicYears = academicYearIds.length
    ? await AcademicYear.find({
        _id: { $in: academicYearIds },
        schoolId,
      })
        .select("_id name isActive")
        .lean()
    : [];

  const academicYearMap = new Map(
    academicYears.map((year) => [String(year._id), year]),
  );

  return assignments.map((assignment) => ({
    ...assignment,
    academicYear: academicYearMap.get(String(assignment.academicYearId)) || null,
  }));
};

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
