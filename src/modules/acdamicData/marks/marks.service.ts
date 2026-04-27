import Mark from "./marks.model";
import { AuthUser, BulkMarksInput } from "./marks.types";

import mongoose from "mongoose";
import { StudentModel } from "../../school-admin/student/student.model";

const parseSafeNumber = (value: any) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const validateBulkMarkItem = (item: any, index: number) => {
  if (!item?.studentId) {
    throw new Error(`Student is required for row ${index + 1}`);
  }

  const marks = parseSafeNumber(item.marks);

  if (marks === null) {
    throw new Error(`Enter valid marks for row ${index + 1}`);
  }

  if (marks < 0 || marks > 999) {
    throw new Error(`Marks must be between 0 and 999 for row ${index + 1}`);
  }
};

export const upsertBulkMarks = async (data: BulkMarksInput, user: AuthUser) => {
  const { examId, subjectId, classId, sectionId = null, marks } = data;

  if (!examId || !subjectId || !classId) {
    throw new Error("examId, subjectId and classId are required");
  }

  if (!Array.isArray(marks) || !marks.length) {
    throw new Error("Marks list is required");
  }

  marks.forEach((item, index) => validateBulkMarkItem(item, index));

  const studentIds = marks.map((item) => new mongoose.Types.ObjectId(item.studentId));
  const students = await StudentModel.find({
    _id: { $in: studentIds },
    schoolId: new mongoose.Types.ObjectId(user.schoolId),
  })
    .select("_id rollNumber sectionId")
    .lean();

  const studentMap = new Map(
    students.map((student: any) => [student._id.toString(), student]),
  );

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
          sectionId: sectionId ? new mongoose.Types.ObjectId(sectionId) : null,
          schoolId: new mongoose.Types.ObjectId(user.schoolId),
          teacherId: new mongoose.Types.ObjectId(user._id),
          rollNumberSnapshot:
            studentMap.get(item.studentId)?.rollNumber || null,
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

export const getMarksHistory = async ({
  schoolId,
  classId,
  sectionId,
  subjectId,
  studentId,
  examId,
  page = 1,
  limit = 20,
  search,
  from,
  to,
}: {
  schoolId: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  studentId?: string;
  examId?: string;
  page?: number;
  limit?: number;
  search?: string;
  from?: string;
  to?: string;
}) => {
  const query: any = {
    schoolId: new mongoose.Types.ObjectId(schoolId),
  };

  if (classId) query.classId = new mongoose.Types.ObjectId(classId);
  if (sectionId) query.sectionId = new mongoose.Types.ObjectId(sectionId);
  if (subjectId) query.subjectId = new mongoose.Types.ObjectId(subjectId);
  if (studentId) query.studentId = new mongoose.Types.ObjectId(studentId);
  if (examId) query.examId = new mongoose.Types.ObjectId(examId);

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  if (search) {
    const studentMatches = await StudentModel.find({
      schoolId: new mongoose.Types.ObjectId(schoolId),
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { rollNumber: Number(search) || -1 },
      ],
    })
      .select("_id")
      .lean();

    const ids = studentMatches.map((item: any) => item._id);

    if (!ids.length) {
      return {
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    query.studentId = { $in: ids };
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Mark.find(query)
      .populate("studentId", "firstName lastName rollNumber classId sectionId")
      .populate("subjectId", "name")
      .populate("examId", "name examType totalMarks startDate endDate")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Mark.countDocuments(query),
  ]);

  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
