import mongoose from "mongoose";
import { ResultModel } from "./result.model";

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

  const operations = parsedResults.map((item: any) => {
    if (!item.examId || !item.studentId || !item.subjectId) {
      throw new Error("Missing required fields");
    }

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
            marksObtained: item.marksObtained,
            totalMarks: item.totalMarks,
            createdById: teacherId,
            schoolId,
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
    .populate("studentId", "firstName lastName rollNumber")
    .sort({ createdAt: -1 })
    .lean();
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
