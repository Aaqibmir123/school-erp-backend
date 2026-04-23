import mongoose from "mongoose";
import Attendance from "./attendance.model";

export const upsertBulkAttendance = async (data: any, user: any) => {
  const { examId, subjectId, attendance } = data;

  const ops = attendance.map((item: any) => ({
    updateOne: {
      filter: {
        studentId: new mongoose.Types.ObjectId(item.studentId),
        examId: new mongoose.Types.ObjectId(examId),
        subjectId: new mongoose.Types.ObjectId(subjectId),
      },
      update: {
        $set: {
          status: item.status,
          schoolId: user.schoolId,
          teacherId: user._id,
        },
      },
      upsert: true,
    },
  }));

  return Attendance.bulkWrite(ops);
};

export const getAttendanceByExam = async (
  examId: string,
  subjectId: string,
) => {
  return Attendance.find({ examId, subjectId })
    .select("studentId status")
    .lean();
};
