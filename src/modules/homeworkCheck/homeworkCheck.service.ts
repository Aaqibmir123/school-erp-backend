import mongoose from "mongoose";
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
      s.status === "DONE" ||
      (s.marks && s.marks > 0) ||
      (s.feedback && s.feedback.trim() !== ""),
  );

  if (filtered.length === 0) {
    return { message: "No changes" };
  }

  const operations = filtered
    .filter((s: any) => s.status === "DONE")
    .map((s: any) => {
      const studentIdObj = toObjectId(s.studentId);
      const homeworkIdObj = toObjectId(homeworkId);

      if (!studentIdObj || !homeworkIdObj) return null;

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
              sectionId: toObjectId(sectionId),

              studentId: studentIdObj,
              homeworkId: homeworkIdObj,
              status: "DONE",
              marks: s.marks || 0,
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
  const data = await HomeworkCheck.find({
    homeworkId: new mongoose.Types.ObjectId(homeworkId),
  })
    .select("studentId status marks feedback")
    .lean();

  return data;
};
