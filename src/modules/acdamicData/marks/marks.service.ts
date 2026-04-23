import Mark from "./marks.model";
import { AuthUser, BulkMarksInput } from "./marks.types";

import mongoose from "mongoose";

export const upsertBulkMarks = async (data: BulkMarksInput, user: AuthUser) => {
  const { examId, subjectId, classId, marks } = data;

  const operations = marks.map((item) => ({
    updateOne: {
      filter: {
        studentId: new mongoose.Types.ObjectId(item.studentId),
        examId: new mongoose.Types.ObjectId(examId),
        subjectId: new mongoose.Types.ObjectId(subjectId),
      },
      update: {
        $set: {
          marks: item.marks,
          classId: new mongoose.Types.ObjectId(classId),
          schoolId: new mongoose.Types.ObjectId(user.schoolId),
          teacherId: new mongoose.Types.ObjectId(user._id),
        },
      },
      upsert: true,
    },
  }));

  const result = await Mark.bulkWrite(operations);

  return result;
};

export const getMarksByExam = async (
  examId: string,
  subjectId: string,
  classId: string,
) => {
  return Mark.find({ examId, subjectId, classId }).lean();
};
