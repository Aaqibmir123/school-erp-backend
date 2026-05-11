import mongoose from "mongoose";

import academicExamModel from "../exams/academicExam.model";
import AcademicYear from "../../academicYears/academicYear.model";
import Schedule from "../schedule/schedule.model";
import { School } from "../../school/school.model";
import { ClassModel } from "../classes/class.model";
import { SectionModel } from "../sections/sections.model";
import { StudentModel } from "../student/student.model";
import AdmitCardModel from "./admitCard.model";
import { generateAdmitCardPDF, generateAdmitCardPreviewImage } from "./pdf.service";

const normalize = (value?: string) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();

const getBaseUrl = (req: any) => {
  const host = req.get("host");
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  return `${protocol}://${host}`;
};

const getPhoneVariants = (phone?: string) => {
  const digits = String(phone || "").replace(/\D/g, "");
  const normalized = digits.slice(-10);

  return Array.from(
    new Set([digits, normalized, `0${normalized}`].filter(Boolean)),
  );
};

const getDayName = (date?: any) => {
  if (!date) return "N/A";
  const parsed = new Date(date);
  return parsed.toLocaleDateString("en-US", { weekday: "long" });
};

const getDateLabel = (date?: any) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-GB");
};

const buildInstructions = () => [
  "Carry a printed copy of this admit card on exam day.",
  "Reach the exam center before the reporting time.",
  "Keep your student ID and roll number ready for verification.",
  "Mobile phones and electronic devices are not allowed inside the hall.",
];

const getStudentAdmitTargets = async (schoolId: string, examId: string) => {
  const schedules = await Schedule.find({ schoolId, examId }).lean();

  const combos = new Map<string, { classId: string; sectionId: string | null }>();
  schedules.forEach((schedule: any) => {
    const key = `${schedule.classId.toString()}-${schedule.sectionId?.toString() || "all"}`;
    if (!combos.has(key)) {
      combos.set(key, {
        classId: schedule.classId.toString(),
        sectionId: schedule.sectionId ? schedule.sectionId.toString() : null,
      });
    }
  });

  const students = await Promise.all(
    Array.from(combos.values()).map(async (combo) => {
      const exactQuery: any = {
        schoolId,
        classId: combo.classId,
        status: "active",
      };

      if (combo.sectionId) {
        exactQuery.sectionId = combo.sectionId;
      }

      const exactMatches = await StudentModel.find(exactQuery)
        .populate("classId", "name")
        .populate("sectionId", "name")
        .sort({ rollNumber: 1 })
        .lean();

      if (exactMatches.length > 0) {
        return exactMatches;
      }

      const classFallback = await StudentModel.find({
        schoolId,
        classId: combo.classId,
        status: "active",
      })
        .populate("classId", "name")
        .populate("sectionId", "name")
        .sort({ rollNumber: 1 })
        .lean();

      if (classFallback.length > 0) {
        return classFallback;
      }

      return StudentModel.find({
        schoolId,
        classId: combo.classId,
      })
        .populate("classId", "name")
        .populate("sectionId", "name")
        .sort({ rollNumber: 1 })
        .lean();
    }),
  );

  const seen = new Set<string>();

  return students
    .flat()
    .filter((student: any) => {
      const key = student?._id?.toString();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const buildAdmitCardPdfData = async ({
  req,
  exam,
  student,
}: {
  req: any;
  exam: any;
  student: any;
}) => {
  const [school, classData, sectionData, schedules, academicYear] = await Promise.all([
    School.findById(exam.schoolId).select("schoolName address email phone principalName").lean(),
    ClassModel.findById(student.classId?._id || student.classId).select("name").lean(),
    student.sectionId
      ? SectionModel.findById(student.sectionId?._id || student.sectionId).select("name").lean()
      : Promise.resolve(null),
    Schedule.find({
      schoolId: exam.schoolId,
      examId: exam._id,
      classId: student.classId?._id || student.classId,
      ...(student.sectionId
        ? {
            $or: [
              { sectionId: student.sectionId?._id || student.sectionId },
              { sectionId: null },
              { sectionId: { $exists: false } },
            ],
          }
        : { sectionId: null }),
    })
      .populate("subjectId", "name")
      .populate("inchargeTeacherId", "firstName lastName")
      .sort({ date: 1, startTime: 1 })
      .lean(),
    exam.academicYearId
      ? AcademicYear.findById(exam.academicYearId).select("name").lean()
      : Promise.resolve(null),
  ]);

  const photo = student.profileImage || "";
  const examInchargeNames = Array.from(
    new Set(
      schedules
        .map((item: any) =>
          item.inchargeTeacherId
            ? `${item.inchargeTeacherId.firstName || ""} ${item.inchargeTeacherId.lastName || ""}`.trim()
            : "",
        )
        .filter(Boolean),
    ),
  );
  const scheduleRows = schedules.map((item: any) => ({
    className: classData?.name || "N/A",
    date: getDateLabel(item.date),
    day: getDayName(item.date),
    endTime: item.endTime || "--",
    inchargeName: item.inchargeTeacherId
      ? `${item.inchargeTeacherId.firstName || ""} ${item.inchargeTeacherId.lastName || ""}`.trim()
      : "",
    sectionName: sectionData?.name || "All",
    startTime: item.startTime || "--",
    subjectName: item.subjectId?.name || "N/A",
  }));

  return {
    admissionNo: student.admissionNo || student.admissionNumber || "N/A",
    address: student.address || "N/A",
    examCode: `EX-${normalize(exam.examType || exam.name)}-${String(exam._id).slice(-4)}`,
    examDateRange: `${getDateLabel(exam.startDate)} to ${getDateLabel(exam.endDate)}`,
    examName: exam.name,
    examType: exam.examType,
    fileName: `ADMIT-${normalize(exam.name)}-${normalize(student.firstName)}-${student.rollNumber || student._id}`,
    fatherName: student.fatherName || "N/A",
    instructions: buildInstructions(),
    parentPhone: student.parentPhone || "N/A",
    principalName: school?.principalName || "Principal",
    releaseNote: "Approved by school admin",
    rollNumber: student.rollNumber || "N/A",
    schoolAddress: school?.address || "N/A",
    schoolEmail: school?.email || "N/A",
    schoolName: school?.schoolName || "School",
    schoolPhone: school?.phone || "N/A",
    schoolId: exam.schoolId,
    schoolLogo: "",
    className: classData?.name || student.classId?.name || "N/A",
    examIncharge: examInchargeNames.length ? examInchargeNames.join(", ") : "N/A",
    sectionName: sectionData?.name || "All",
    session: academicYear?.name || "Current Session",
    studentId: student._id,
    studentName: `${student.firstName} ${student.lastName || ""}`.trim(),
    studentPhoto: photo,
    subjects: scheduleRows,
    serverUrl: getBaseUrl(req),
  };
};

export const previewAdmitCardService = async (
  req: any,
  { examId, studentId }: { examId: string; studentId: string },
) => {
  if (!mongoose.Types.ObjectId.isValid(examId)) {
    throw new Error("Invalid examId");
  }

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new Error("Invalid studentId");
  }

  const exam = await academicExamModel.findOne({
    _id: examId,
    schoolId: req.user.schoolId,
  }).lean();

  if (!exam) {
    throw new Error("Exam not found");
  }

  const student = await StudentModel.findOne({
    _id: studentId,
    schoolId: req.user.schoolId,
    status: "active",
  })
    .populate("classId", "name")
    .populate("sectionId", "name")
    .lean();

  if (!student) {
    throw new Error("Student not found");
  }

  const admitCardData = await buildAdmitCardPdfData({
    req,
    exam,
    student,
  });

  const pdfUrl = await generateAdmitCardPDF({
    ...admitCardData,
    fileName: `${admitCardData.fileName}-PREVIEW-${Date.now()}`,
  });

  const previewUrl = await generateAdmitCardPreviewImage({
    ...admitCardData,
    fileName: `${admitCardData.fileName}-PREVIEW-${Date.now()}`,
  });

  return {
    pdfUrl,
    previewUrl,
    studentId,
    studentName: admitCardData.studentName,
  };
};

export const releaseAdmitCardsService = async (
  req: any,
  { examId }: { examId: string },
) => {
  if (!mongoose.Types.ObjectId.isValid(examId)) {
    throw new Error("Invalid examId");
  }

  const exam = await academicExamModel.findOne({
    _id: examId,
    schoolId: req.user.schoolId,
  }).lean();

  if (!exam) {
    throw new Error("Exam not found");
  }

  if (!exam.isPublished) {
    throw new Error("Publish the exam before releasing admit cards");
  }

  const students = await getStudentAdmitTargets(req.user.schoolId, examId);

  if (!students.length) {
    throw new Error("No students found for this exam");
  }

  const results: any[] = [];

  for (const student of students) {
    const admitCardData = await buildAdmitCardPdfData({
      req,
      exam,
      student,
    });

    const pdfUrl = await generateAdmitCardPDF({
      ...admitCardData,
      fileName: admitCardData.fileName,
    });

    const doc = await AdmitCardModel.findOneAndUpdate(
      {
        schoolId: req.user.schoolId,
        examId,
        studentId: student._id,
      },
      {
        schoolId: req.user.schoolId,
        examId,
        studentId: student._id,
        pdfUrl,
        status: "released",
        approvalStatus: "approved",
        approvedBy: req.user.id || req.user._id,
        approvedAt: new Date(),
        releasedAt: new Date(),
      },
      { new: true, upsert: true },
    ).lean();

    results.push({
      _id: doc?._id,
      pdfUrl,
      studentId: student._id,
      studentName: admitCardData.studentName,
      rollNumber: admitCardData.rollNumber,
    });
  }

  return {
    count: results.length,
    data: results,
  };
};

export const toggleAdmitCardApprovalService = async (
  req: any,
  { examId, approved }: { examId: string; approved: boolean },
) => {
  if (!mongoose.Types.ObjectId.isValid(examId)) {
    throw new Error("Invalid examId");
  }

  const exam = await academicExamModel.findOne({
    _id: examId,
    schoolId: req.user.schoolId,
  }).lean();

  if (!exam) {
    throw new Error("Exam not found");
  }

  if (approved) {
    return releaseAdmitCardsService(req, { examId });
  }

  const result = await AdmitCardModel.updateMany(
    {
      schoolId: req.user.schoolId,
      examId,
    },
    {
      status: "draft",
      approvalStatus: "draft",
      approvedBy: null,
      approvedAt: null,
      releasedAt: null,
    },
  );

  return {
    count: result.modifiedCount || 0,
    data: [],
  };
};

export const getAdmitCardStudentsService = async (
  req: any,
  examId: string,
) => {
  if (!mongoose.Types.ObjectId.isValid(examId)) {
    throw new Error("Invalid examId");
  }

  const exam = await academicExamModel.findOne({
    _id: examId,
    schoolId: req.user.schoolId,
  }).lean();

  if (!exam) {
    throw new Error("Exam not found");
  }

  const students = await getStudentAdmitTargets(req.user.schoolId, examId);

  const releasedCards = await AdmitCardModel.find({
    schoolId: req.user.schoolId,
    examId,
  })
    .select("studentId pdfUrl status approvalStatus releasedAt")
    .lean();

  const releaseMap = new Map(
    releasedCards.map((card: any) => [card.studentId.toString(), card]),
  );

  return students.map((student: any) => ({
    _id: student._id,
    className: student.classId?.name || "N/A",
    fatherName: student.fatherName || "N/A",
    parentPhone: student.parentPhone || "N/A",
    pdfUrl: releaseMap.get(student._id.toString())?.pdfUrl || null,
    releasedAt: releaseMap.get(student._id.toString())?.releasedAt || null,
    rollNumber: student.rollNumber || "N/A",
    sectionName: student.sectionId?.name || "All",
    approvalStatus: releaseMap.get(student._id.toString())?.approvalStatus
      || (releaseMap.get(student._id.toString())?.status === "released" ? "approved" : "draft"),
    status: releaseMap.get(student._id.toString())?.status || "draft",
    studentName: `${student.firstName} ${student.lastName || ""}`.trim(),
  }));
};

export const getReleasedAdmitCardsService = async (req: any) => {
  const cards = await AdmitCardModel.find({
    schoolId: req.user.schoolId,
    $or: [
      { approvalStatus: "approved" },
      { approvalStatus: { $exists: false }, status: "released" },
    ],
  })
    .populate({
      path: "studentId",
      select: "firstName lastName rollNumber parentPhone classId sectionId",
      populate: [
        { path: "classId", select: "name" },
        { path: "sectionId", select: "name" },
      ],
    })
    .populate("examId", "name examType startDate endDate")
    .sort({ releasedAt: -1 })
    .lean();

  return cards.map((card: any) => ({
    _id: card._id,
    examName: card.examId?.name || "Exam",
    examType: card.examId?.examType || "-",
    pdfUrl: card.pdfUrl,
    releasedAt: card.releasedAt,
    approvalStatus: card.approvalStatus || (card.status === "released" ? "approved" : "draft"),
    rollNumber: card.studentId?.rollNumber || "N/A",
    studentName: `${card.studentId?.firstName || ""} ${card.studentId?.lastName || ""}`.trim(),
    className: card.studentId?.classId?.name || "N/A",
    sectionName: card.studentId?.sectionId?.name || "All",
  }));
};

export const getStudentReleasedAdmitCardsService = async (
  user: any,
  studentId?: string,
) => {
  const query: any = {
    schoolId: user.schoolId,
    status: "active",
  };

  if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
    query._id = studentId;
  } else if (user.role === "STUDENT" && user.id) {
    query.userId = user.id;
  } else {
    query.parentPhone = { $in: getPhoneVariants(user.phone) };
  }

  const student = await StudentModel.findOne(query).select("_id").lean();

  if (!student) {
    throw new Error("Student not found");
  }

  return AdmitCardModel.find({
    schoolId: user.schoolId,
    studentId: student._id,
    $or: [
      { approvalStatus: "approved" },
      { approvalStatus: { $exists: false }, status: "released" },
    ],
  })
    .populate("examId", "name examType startDate endDate")
    .sort({ releasedAt: -1 })
    .populate({
      path: "studentId",
      select: "firstName lastName rollNumber classId sectionId parentPhone",
      populate: [
        { path: "classId", select: "name" },
        { path: "sectionId", select: "name" },
      ],
    })
    .lean()
    .then((cards: any[]) =>
      cards.map((card: any) => ({
        _id: card._id,
        examName: card.examId?.name || "Exam",
        examType: card.examId?.examType || "-",
        pdfUrl: card.pdfUrl,
        releasedAt: card.releasedAt,
        approvalStatus: card.approvalStatus || (card.status === "released" ? "approved" : "draft"),
        rollNumber: card.studentId?.rollNumber || "N/A",
        studentName: `${card.studentId?.firstName || ""} ${card.studentId?.lastName || ""}`.trim(),
        className: card.studentId?.classId?.name || "N/A",
        sectionName: card.studentId?.sectionId?.name || "All",
      })),
    );
};
