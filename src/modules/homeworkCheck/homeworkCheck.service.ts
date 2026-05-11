import mongoose from "mongoose";
import { HomeworkModel } from "../homework/homework.model";
import HomeworkCheck from "./homeworkCheck.model";

export const bulkHomeworkCheckService = async ({
  schoolId,
  teacherId,
  homeworkId,
  classId,
  subjectId,
  students,
  sectionId,
}: any) => {
  const toObjectId = (val: any) => {
    if (!val) return null;

    if (typeof val === "object" && val._id) {
      val = val._id;
    }

    if (!mongoose.Types.ObjectId.isValid(val)) {
      return null;
    }

    return new mongoose.Types.ObjectId(val);
  };

  const filtered = students.filter(
    (s: any) =>
      (s.marks !== "" && s.marks !== null && s.marks !== undefined) ||
      (s.feedback && s.feedback.trim() !== ""),
  );

  if (filtered.length === 0) {
    return { message: "No changes" };
  }

  const homework = await HomeworkModel.findOne({
    _id: toObjectId(homeworkId),
    schoolId: toObjectId(schoolId),
    teacherId: toObjectId(teacherId),
  })
    .select("maxMarks")
    .lean();

  if (!homework) {
    throw new Error("Homework not found or unauthorized");
  }

  const maxMarks = Number(homework.maxMarks || 0);

  const operations = filtered
    .map((s: any) => {
      const studentIdObj = toObjectId(s.studentId);
      const homeworkIdObj = toObjectId(homeworkId);

      if (!studentIdObj || !homeworkIdObj) return null;

      const rawMarks = s.marks === "" || s.marks === null ? 0 : Number(s.marks);

      if (Number.isNaN(rawMarks) || rawMarks < 0) {
        throw new Error("Invalid marks value");
      }

      if (maxMarks > 0 && rawMarks > maxMarks) {
        throw new Error(`Marks cannot exceed ${maxMarks}`);
      }

      return {
        updateOne: {
          filter: {
            studentId: studentIdObj,
            homeworkId: homeworkIdObj,
          },
          update: {
            $set: {
              schoolId: toObjectId(schoolId),
              classId: toObjectId(classId),
              subjectId: toObjectId(subjectId),
              sectionId: sectionId ? toObjectId(sectionId) : null,

              studentId: studentIdObj,
              homeworkId: homeworkIdObj,
              status: "DONE",
              marks: rawMarks,
              feedback: s.feedback || "",
              checkedBy: toObjectId(teacherId),
            },
          },
          upsert: true,
        },
      };
    })
    .filter(Boolean);

  if (operations.length === 0) {
    return { message: "Invalid data" };
  }

  const result = await HomeworkCheck.bulkWrite(operations);

  return {
    message: "Saved successfully",
    result,
  };
};

export const getHomeworkCheckService = async ({
  homeworkId,
}: {
  homeworkId: string;
}) => {
  const homework = await HomeworkModel.findById(
    new mongoose.Types.ObjectId(homeworkId),
  )
    .select("title maxMarks dueDate classId subjectId sectionId")
    .lean();

  const checks = await HomeworkCheck.find({
    homeworkId: new mongoose.Types.ObjectId(homeworkId),
  })
    .select("studentId marks feedback updatedAt createdAt")
    .lean();

  return {
    homework,
    checks,
  };
};
