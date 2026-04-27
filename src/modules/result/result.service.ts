import mongoose from "mongoose";
import { ResultModel } from "./result.model";
import { StudentModel } from "../school-admin/student/student.model";

const parseSafeNumber = (value: any) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

/* ================= CREATE / UPDATE ================= */
export const createResultsService = async (
  teacherId: string,
  schoolId: string,
  body: any,
) => {
  let parsedResults: any[] = [];

  if (Array.isArray(body.results)) {
    parsedResults = body.results;
  } else if (typeof body.results === "string") {
    try {
      parsedResults = JSON.parse(body.results);
    } catch {
      throw new Error("Invalid results format");
    }
  } else {
    throw new Error("Invalid results format");
  }

  if (!parsedResults.length) {
    throw new Error("No results provided");
  }

  parsedResults.forEach((item: any, index: number) => {
    if (!item.examId || !item.studentId || !item.subjectId || !item.classId) {
      throw new Error(`Missing required fields for row ${index + 1}`);
    }

    const marksObtained = parseSafeNumber(item.marksObtained);
    const totalMarks = parseSafeNumber(item.totalMarks);

    if (marksObtained === null) {
      throw new Error(`Enter valid marks for row ${index + 1}`);
    }

    if (totalMarks === null || totalMarks <= 0) {
      throw new Error(`Enter valid total marks for row ${index + 1}`);
    }

    if (marksObtained < 0) {
      throw new Error(`Marks cannot be negative for row ${index + 1}`);
    }

    if (marksObtained > totalMarks) {
      throw new Error(`Marks cannot exceed total marks for row ${index + 1}`);
    }
  });

  const studentIds = parsedResults.map((item: any) =>
    new mongoose.Types.ObjectId(item.studentId),
  );

  const students = await StudentModel.find({
    _id: { $in: studentIds },
    schoolId,
  })
    .select("_id rollNumber sectionId")
    .lean();

  const studentMap = new Map(
    students.map((student: any) => [student._id.toString(), student]),
  );

  const operations = parsedResults.map((item: any) => {
    const student = studentMap.get(String(item.studentId));

    return {
      updateOne: {
        filter: {
          examId: item.examId,
          studentId: item.studentId,
          subjectId: item.subjectId,
          schoolId,
        },
        update: {
          $set: {
            classId: item.classId,
            sectionId:
              item.sectionId || student?.sectionId
                ? item.sectionId || student?.sectionId
                : null,
            marksObtained: item.marksObtained,
            totalMarks: item.totalMarks,
            createdById: teacherId,
            schoolId,
            rollNumberSnapshot: student?.rollNumber ?? null,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await ResultModel.bulkWrite(operations);

  return {
    inserted: result.upsertedCount,
    modified: result.modifiedCount,
    total: operations.length,
  };
};

/* ================= GET RESULTS (TEACHER LIST) ================= */
export const getResultsByExamService = async ({ examId, schoolId }: any) => {
  if (!examId) throw new Error("examId is required");

  return ResultModel.find({
    examId: new mongoose.Types.ObjectId(examId),
    schoolId: new mongoose.Types.ObjectId(schoolId),
  })
    .populate("studentId", "firstName lastName rollNumber classId sectionId")
    .populate("subjectId", "name")
    .populate("sectionId", "name")
    .sort({ createdAt: -1 })
    .lean();
};

export const getResultsHistoryService = async ({
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
    ResultModel.find(query)
      .populate("studentId", "firstName lastName rollNumber classId sectionId")
      .populate("subjectId", "name")
      .populate("examId", "name examType totalMarks date")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ResultModel.countDocuments(query),
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

/* ================= MARKSHEET DATA (ONLY DATA, NO HTML) ================= */

// export const getStudentResultData = async ({
//   examId,
//   studentId,
//   schoolId,
// }: any) => {
//   const examObjectId = new mongoose.Types.ObjectId(examId);
//   const studentObjectId = new mongoose.Types.ObjectId(studentId);
//   const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

//   // ✅ exam check
//   const exam = await Exam.findById(examObjectId).lean();
//   if (!exam) throw new Error("Exam not found");

//   // ❌ class test → marksheet nahi (optional)
//   if (exam.examType === "class_test") {
//     throw new Error("Marksheet not allowed for class test");
//   }

//   // ✅ results
//   const results = await ResultModel.find({
//     examId: examObjectId,
//     studentId: studentObjectId,
//     schoolId: schoolObjectId,
//   })
//     .populate("subjectId", "name")
//     .lean();

//   if (!results.length) throw new Error("No result found");

//   // ✅ student
//   const student = await StudentModel.findById(studentObjectId)
//     .populate("classId", "name")
//     .lean();

//   let total = 0;
//   let totalMax = 0;

//   const subjects = results.map((r: any) => {
//     total += r.marksObtained;
//     totalMax += r.totalMarks;

//     return {
//       name: r.subjectId?.name || "",
//       marks: r.marksObtained,
//       total: r.totalMarks,
//     };
//   });

//   const percentage = totalMax > 0 ? ((total / totalMax) * 100).toFixed(2) : "0";

//   return {
//     student: {
//       name: `${student?.firstName || ""} ${student?.lastName || ""}`,
//       rollNumber: student?.rollNumber,
//       className: student?.classId?.name || "",
//     },

//     exam: {
//       name: exam.name,
//       type: exam.examType,
//       date: exam.date,
//     },

//     subjects,
//     total,
//     totalMax,
//     percentage,
//   };
// };
