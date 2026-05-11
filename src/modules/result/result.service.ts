import mongoose from "mongoose";
import Exam from "../exam/exam.model";
import { ResultModel } from "./result.model";
import { SchoolProfile } from "../school-admin/school/schoolProfile.model";
import { StudentModel } from "../school-admin/student/student.model";
import academicExamModel from "../school-admin/exams/academicExam.model";
import Mark from "../acdamicData/marks/marks.model";
import {
  generateMarksCardPDF,
  generateMarksCardPreviewImage,
} from "./marksCardPdf.service";

const parseSafeNumber = (value: any) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const toGrade = (percentage: number) => {
  if (percentage >= 90) return "A1";
  if (percentage >= 80) return "A2";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "E";
};

const formatStudentName = (student: any) =>
  `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || "Student";

const makeSchoolLogoFallback = (schoolName?: string) => {
  const label = (schoolName || "School")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";

  return `data:image/svg+xml;base64,${Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#eff6ff"/>
          <stop offset="100%" stop-color="#dbeafe"/>
        </linearGradient>
      </defs>
      <circle cx="110" cy="110" r="104" fill="url(#g)" stroke="#2563eb" stroke-width="4"/>
      <circle cx="110" cy="110" r="72" fill="#ffffff" opacity="0.82"/>
      <text x="110" y="124" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#1d4ed8">${label}</text>
    </svg>
  `).toString("base64")}`;
};

const makeSealFallback = () =>
  `data:image/svg+xml;base64,${Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
      <defs>
        <radialGradient id="seal" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff7ed"/>
          <stop offset="100%" stop-color="#fde68a"/>
        </radialGradient>
      </defs>
      <circle cx="110" cy="110" r="98" fill="url(#seal)" stroke="#f59e0b" stroke-width="6"/>
      <circle cx="110" cy="110" r="74" fill="none" stroke="#f59e0b" stroke-width="4" stroke-dasharray="10 8"/>
      <circle cx="110" cy="110" r="40" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="4 6"/>
      <path d="M82 110 L108 86 L128 108 L146 90" fill="none" stroke="#b45309" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M72 140 C86 128, 98 126, 110 132 S134 142, 146 132" fill="none" stroke="#b45309" stroke-width="4" stroke-linecap="round"/>
    </svg>
  `).toString("base64")}`;

const makeSignatureFallback = () =>
  `data:image/svg+xml;base64,${Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120">
      <path d="M20 78 C48 44, 82 95, 110 62 S180 28, 210 70 S260 88, 300 38" fill="none" stroke="#1d4ed8" stroke-width="4" stroke-linecap="round"/>
      <path d="M38 84 C62 60, 86 96, 114 72 S172 46, 204 80 S254 92, 282 52" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="18" y1="96" x2="302" y2="96" stroke="#cbd5e1" stroke-width="2"/>
    </svg>
  `).toString("base64")}`;

const normalizeExamType = (value?: string) =>
  String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

const isMidTermExam = (exam: any) => {
  const type = normalizeExamType(exam?.examType);
  const name = normalizeExamType(exam?.name);

  return type.includes("midterm") || name.includes("midterm");
};

const resolveExamById = async (examId: string, schoolId: string) => {
  const examObjectId = new mongoose.Types.ObjectId(examId);
  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

  return (
    (await Exam.findOne({ _id: examObjectId, schoolId: schoolObjectId }).lean()) ||
    (await academicExamModel.findOne({ _id: examObjectId, schoolId: schoolObjectId }).lean())
  );
};

const getMarksCollectionRecords = async (schoolId: mongoose.Types.ObjectId, examId: string) => {
  const examObjectId = new mongoose.Types.ObjectId(examId);

  const [resultRecords, markRecords] = await Promise.all([
    ResultModel.find({
      schoolId,
      examId: examObjectId,
    })
      .populate("studentId", "firstName lastName rollNumber classId sectionId fatherName profileImage")
      .populate("subjectId", "name")
      .populate("classId", "name")
      .populate("sectionId", "name")
      .sort({ createdAt: 1 })
      .lean(),
    Mark.find({
      schoolId,
      examId: examObjectId,
    })
      .populate("examId", "name examType totalMarks date startDate endDate")
      .populate("studentId", "firstName lastName rollNumber classId sectionId fatherName profileImage")
      .populate("subjectId", "name")
      .populate("classId", "name")
      .populate("sectionId", "name")
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  const normalized = [
    ...resultRecords.map((record: any) => ({
      source: "result",
      studentId: record.studentId,
      subjectId: record.subjectId,
      classId: record.classId,
      sectionId: record.sectionId,
      marks: Number(record.marksObtained ?? 0),
      totalMarks: Number(record.totalMarks ?? 100),
      rollNumberSnapshot: record.rollNumberSnapshot ?? null,
      createdAt: record.createdAt ? new Date(record.createdAt).getTime() : 0,
    })),
    ...markRecords.map((record: any) => ({
      source: "mark",
      studentId: record.studentId,
      subjectId: record.subjectId,
      classId: record.classId,
      sectionId: record.sectionId,
      marks: Number(record.marks ?? 0),
      totalMarks: Number(record.examId?.totalMarks ?? 100),
      rollNumberSnapshot: record.rollNumberSnapshot ?? null,
      createdAt: record.createdAt ? new Date(record.createdAt).getTime() : 0,
    })),
  ];

  const deduped = new Map<string, any>();

  normalized.forEach((record) => {
    const studentKey = String(record.studentId?._id || record.studentId || "");
    const subjectKey = String(record.subjectId?._id || record.subjectId || "");
    const key = `${studentKey}-${subjectKey}`;
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, record);
      return;
    }

    if (existing.source !== "result" && record.source === "result") {
      deduped.set(key, record);
      return;
    }

    if (
      existing.source === record.source &&
      (record.createdAt || 0) >= (existing.createdAt || 0)
    ) {
      deduped.set(key, record);
    }
  });

  return Array.from(deduped.values());
};

const resolveMidTermExamCandidates = async (
  schoolId: mongoose.Types.ObjectId,
  approvedOnly = false,
) => {
  const [resultExamIds, markExamIds] = await Promise.all([
    ResultModel.distinct("examId", { schoolId }),
    Mark.distinct("examId", { schoolId }),
  ]);

  const examIds = Array.from(
    new Set([...resultExamIds, ...markExamIds].map((id) => String(id))),
  );

  if (!examIds.length) {
    return [];
  }

  const [oldExams, academicExams] = await Promise.all([
    Exam.find({ _id: { $in: examIds }, schoolId }).lean(),
    academicExamModel.find({ _id: { $in: examIds }, schoolId }).lean(),
  ]);

  const merged = [...oldExams, ...academicExams]
    .filter(Boolean)
    .filter((exam: any) => isMidTermExam(exam))
    .filter((exam: any) =>
      approvedOnly ? exam?.marksCardStatus === "approved" : true,
    )
    .sort((a: any, b: any) => {
      const aDate = new Date(a.date || a.endDate || a.startDate || a.createdAt || 0).getTime();
      const bDate = new Date(b.date || b.endDate || b.startDate || b.createdAt || 0).getTime();
      return bDate - aDate;
    });

  return merged;
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

  const examTotalMap = new Map<string, number>();

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

  for (let i = 0; i < parsedResults.length; i += 1) {
    const item = parsedResults[i];
    const cachedTotal = examTotalMap.get(String(item.examId));

    if (cachedTotal !== undefined) {
      continue;
    }

    const exam = await resolveExamById(String(item.examId), schoolId);
    if (!exam) {
      throw new Error(`Exam not found for row ${i + 1}`);
    }

    const totalMarks = Number(exam.totalMarks || 0);
    if (!totalMarks || totalMarks <= 0) {
      throw new Error(`Exam total marks not set for row ${i + 1}`);
    }

    examTotalMap.set(String(item.examId), totalMarks);
  }

  parsedResults.forEach((item: any, index: number) => {
    const examTotalMarks = examTotalMap.get(String(item.examId)) || 0;
    const marksObtained = parseSafeNumber(item.marksObtained);
    const rowTotalMarks = parseSafeNumber(item.totalMarks);

    if (marksObtained !== null && marksObtained > examTotalMarks) {
      throw new Error(
        `Marks cannot exceed exam total marks (${examTotalMarks}) for row ${index + 1}`,
      );
    }

    if (rowTotalMarks !== null && rowTotalMarks > examTotalMarks) {
      throw new Error(
        `Total marks cannot exceed exam total marks (${examTotalMarks}) for row ${index + 1}`,
      );
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
            totalMarks: examTotalMap.get(String(item.examId)) || item.totalMarks,
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

export const getMidTermMarksCardPreviewService = async ({
  schoolId,
  examId,
  studentId,
  approvedOnly = false,
  serverUrl = "",
}: {
  schoolId: string;
  examId?: string;
  studentId?: string;
  approvedOnly?: boolean;
  serverUrl?: string;
}) => {
  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

  let selectedExam: any = null;

  if (examId) {
    const examObjectId = new mongoose.Types.ObjectId(examId);

    selectedExam =
      (await Exam.findOne({
        _id: examObjectId,
        schoolId: schoolObjectId,
      }).lean()) ||
      (await academicExamModel.findOne({
        _id: examObjectId,
        schoolId: schoolObjectId,
      }).lean());

    if (selectedExam && !isMidTermExam(selectedExam)) {
      selectedExam = null;
    }
  }

  if (!selectedExam) {
    const exams = await resolveMidTermExamCandidates(schoolObjectId, approvedOnly);
    selectedExam = exams[0] || null;
  }

  if (!selectedExam) {
    throw new Error(
      approvedOnly
        ? "No approved Mid Term exam with marks found"
        : "No Mid Term exam with marks found",
    );
  }

  const school = await SchoolProfile.findOne({ schoolId: schoolObjectId }).lean();

  const records = await getMarksCollectionRecords(
    schoolObjectId,
    String(selectedExam._id),
  );

  if (!records.length) {
    throw new Error("No marks found for the selected Mid Term exam");
  }

  const studentGroups = new Map<string, any[]>();

  for (const record of records as any[]) {
    const key = String(record.studentId?._id || record.studentId);
    const list = studentGroups.get(key) || [];
    list.push(record);
    studentGroups.set(key, list);
  }

  const sortedGroups = [...studentGroups.entries()].sort(([, a], [, b]) => {
    const aRoll = Number(a[0]?.studentId?.rollNumber || a[0]?.rollNumberSnapshot || 0);
    const bRoll = Number(b[0]?.studentId?.rollNumber || b[0]?.rollNumberSnapshot || 0);
    return aRoll - bRoll;
  });

  const resolveStudentGroup = () => {
    if (studentId) {
      const found = sortedGroups.find(([key]) => key === String(studentId));
      return found?.[1] || null;
    }

    return sortedGroups[0]?.[1] || null;
  };

  const selectedStudentRecords = resolveStudentGroup();

  if (!selectedStudentRecords?.length) {
    throw new Error("No student marks found for the selected Mid Term exam");
  }

  const student = selectedStudentRecords[0].studentId;
  const className = selectedStudentRecords[0].classId?.name || student?.classId?.name || "N/A";
  const sectionName = selectedStudentRecords[0].sectionId?.name || student?.sectionId?.name || "All";

  const subjects = selectedStudentRecords.map((record: any) => {
    const obtained = Number(record.marks ?? 0);
    const total = Number(record.totalMarks ?? selectedExam.totalMarks ?? 100);
    const percentage = total > 0 ? Math.round((obtained / total) * 100) : 0;

    return {
      name: record.subjectId?.name || "Subject",
      max: total,
      obtained,
      grade: toGrade(percentage),
    };
  });

  const obtained = subjects.reduce((sum, subject) => sum + subject.obtained, 0);
  const total = subjects.reduce((sum, subject) => sum + subject.max, 0);
  const percentage = total > 0 ? Number(((obtained / total) * 100).toFixed(1)) : 0;
  const students = sortedGroups.slice(0, 5).map(([, group]) => {
    const studentRecord = group[0];
    const studentInfo = studentRecord.studentId;
    const groupSubjects = group.map((record: any) => {
      const obtainedMarks = Number(record.marks ?? 0);
      const totalMarks = Number(record.totalMarks ?? selectedExam.totalMarks ?? 100);
      return {
        obtained: obtainedMarks,
        total: totalMarks,
      };
    });

    const candidateObtained = groupSubjects.reduce((sum, item) => sum + item.obtained, 0);
    const candidateTotal = groupSubjects.reduce((sum, item) => sum + item.total, 0);
    const candidatePercentage =
      candidateTotal > 0 ? Number(((candidateObtained / candidateTotal) * 100).toFixed(1)) : 0;

    return {
      _id: String(studentInfo?._id || studentRecord.studentId),
      className: studentRecord.classId?.name || studentInfo?.classId?.name || "N/A",
      fatherName: studentInfo?.fatherName || "",
      name: formatStudentName(studentInfo),
      obtained: candidateObtained,
      percentage: candidatePercentage,
      grade: toGrade(candidatePercentage),
      photo: studentInfo?.profileImage || "",
      rollNumber: studentInfo?.rollNumber ?? "N/A",
      sectionName: studentRecord.sectionId?.name || studentInfo?.sectionId?.name || "All",
      total: candidateTotal,
    };
  });

  let pdfUrl = "";
  let previewUrl = "";

  if (studentId) {
    const fileSeed = `MARKS-${String(selectedExam._id).slice(-6)}-${String(
      student?._id || studentId,
    ).slice(-6)}-${Date.now()}`;
    const sheetPayload = {
      school: {
        address: school?.address || "",
        logo: school?.logo || "",
        name: school?.name || "School",
        seal: school?.seal || "",
        signature: school?.signature || "",
      },
      exam: {
        examType: selectedExam.examType || "Mid Term",
        marksCardStatus: selectedExam.marksCardStatus || "draft",
        name: selectedExam.name,
        totalMarks: selectedExam.totalMarks,
      },
      fileName: fileSeed,
      serverUrl,
      student: {
        className,
        fatherName: student?.fatherName || "",
        name: formatStudentName(student),
        photo: student?.profileImage || "",
        rollNumber: student?.rollNumber ?? "N/A",
        sectionName,
      },
      summary: {
        grade: toGrade(percentage),
        obtained,
        percentage,
        remarks: percentage >= 80 ? "Excellent progress" : "Mid term result ready",
        total,
      },
      subjects,
    };

    [pdfUrl, previewUrl] = await Promise.all([
      generateMarksCardPDF(sheetPayload),
      generateMarksCardPreviewImage(sheetPayload),
    ]);
  }

  return {
    school: {
      name: school?.name || "School",
      address: school?.address || "",
      logo: school?.logo || makeSchoolLogoFallback(school?.name),
      seal: school?.seal || makeSealFallback(),
      signature: school?.signature || makeSignatureFallback(),
    },
    exam: {
      _id: selectedExam._id,
      name: selectedExam.name,
      examType: selectedExam.examType,
      date: selectedExam.date || selectedExam.startDate || selectedExam.endDate,
      totalMarks: selectedExam.totalMarks,
      marksCardApprovedAt: selectedExam.marksCardApprovedAt || null,
      marksCardApprovedBy: selectedExam.marksCardApprovedBy || null,
      marksCardStatus: selectedExam.marksCardStatus || "draft",
      pdfUrl,
      previewUrl,
    },
    student: {
      _id: student?._id,
      name: formatStudentName(student),
      fatherName: student?.fatherName || "",
      rollNumber: student?.rollNumber ?? "N/A",
      className,
      sectionName,
      photo: student?.profileImage || "",
    },
    summary: {
      grade: toGrade(percentage),
      obtained,
      percentage,
      remarks: percentage >= 80 ? "Excellent progress" : "Mid term result ready",
      total,
    },
    pdfUrl,
    previewUrl,
    students,
    subjects,
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
