import mongoose from "mongoose";
import { ClassModel } from "../classes/class.model";
import academicExamModel from "../exams/academicExam.model";
import { SectionModel } from "../sections/sections.model";
import { SubjectModel } from "../subjects/subjects.model";
import { TeacherModel } from "../teacher/teacher.model";
import teacherAssignmentModel from "../teacher/teacherAssignment.model";
import Schedule from "./schedule.model";

const normalizeExamType = (value?: string) =>
  value?.toLowerCase().replace(/[^a-z0-9]+/g, "") || "";

const isSectionBasedExam = (value?: string) => {
  const normalized = normalizeExamType(value);

  return (
    normalized.includes("classtest") || normalized.includes("unittest")
  );
};

/* ================= CREATE SCHEDULE ================= */
export const createScheduleService = async (data: any, user: any) => {
  const { examId, classId, subjectId, sectionId, date, startTime, endTime } = data;

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    throw new Error("Invalid examId");
  }

  /* ================= GET EXAM ================= */
  const exam = await academicExamModel.findById(examId).lean();
  if (!exam) throw new Error("Exam not found");
  const sectionBasedExam = isSectionBasedExam((exam as any).examType);

  /* ================= GET SECTIONS ================= */
  const sections = await SectionModel.find({
    classId,
    schoolId: user.schoolId,
  }).lean();
  const targetSections = sectionId
    ? await SectionModel.find({
      _id: sectionId,
      classId,
      schoolId: user.schoolId,
      }).lean()
    : sections;

  if (sectionId && !targetSections.length) {
    throw new Error("Section not found");
  }

  if (sectionBasedExam && !sectionId) {
    throw new Error("Section is required for this exam type");
  }

  /* ================= GET TEACHER ASSIGNMENTS ================= */
  const assignments = await teacherAssignmentModel
    .find({
      classId,
      subjectId,
      schoolId: user.schoolId,
    })
    .lean();

  if (!assignments.length) {
    throw new Error("No teacher assigned for this subject");
  }

  /* ================= MAP ================= */
  const teacherMap = new Map();

  assignments.forEach((a: any) => {
    const key = `${a.classId}-${a.sectionId || "null"}`;
    teacherMap.set(key, a.teacherId);
  });

  /* ================= PREFETCH ================= */
  const existingSchedules = await Schedule.find({
    date,
    classId,
    schoolId: user.schoolId,
  }).lean();

  const teacherSchedules = await Schedule.find({
    date,
    schoolId: user.schoolId,
  }).lean();

  const operations: any[] = [];

  /* ================= CASE 1: WITH SECTIONS ================= */
  if (targetSections.length > 0) {
    for (const sec of targetSections) {
      const keyWithSection = `${classId}-${sec._id}`;
      const keyWithoutSection = `${classId}-null`;

      const teacherId =
        teacherMap.get(keyWithSection) || teacherMap.get(keyWithoutSection);

      if (!teacherId) continue;

      /* ===== SECTION CONFLICT ===== */
      const sectionConflict = existingSchedules.find(
        (s: any) =>
          s.sectionId?.toString() === sec._id.toString() &&
          startTime < s.endTime &&
          endTime > s.startTime,
      );

      if (sectionConflict) {
        throw new Error(`Time conflict in section`);
      }

      /* ===== TEACHER CONFLICT ===== */
      const teacherConflict = teacherSchedules.find(
        (s: any) =>
          s.teacherId?.toString() === teacherId.toString() &&
          startTime < s.endTime &&
          endTime > s.startTime,
      );

      if (teacherConflict) {
        throw new Error("Teacher already busy at this time");
      }

      operations.push({
        updateOne: {
          filter: {
            examId,
            classId,
            sectionId: sec._id,
            subjectId,
          },
          update: {
            examId,
            classId,
            sectionId: sec._id,
            subjectId,
            teacherId,
            date,
            startTime,
            endTime,
            schoolId: user.schoolId,
          },
          upsert: true,
        },
      });
    }
  } else {
    throw new Error("No section found for this class");
  }

  if (!operations.length) {
    throw new Error("No teacher mapping found (check TeacherAssignment)");
  }

  await Schedule.bulkWrite(operations);

  return { success: true };
};

/* ================= GET SCHEDULE ================= */
export const getSchedulesService = async (examId: string) => {
  return await Schedule.find({ examId })
    .populate("classId", "name")
    .populate("subjectId", "name")
    .populate("sectionId", "name")
    .populate("teacherId", "firstName lastName")
    .sort({ date: 1, startTime: 1 })
    .lean();
};

/* ================= UPDATE ================= */
export const updateScheduleService = async (id: string, data: any) => {
  const schedule = await Schedule.findById(id);
  if (!schedule) throw new Error("Schedule not found");

  return await Schedule.findByIdAndUpdate(id, data, { new: true });
};

/* ================= DELETE ================= */
export const deleteScheduleService = async (id: string) => {
  return await Schedule.findByIdAndDelete(id);
};

/* ================= CLASSES + SUBJECTS ================= */
export const getClassesWithSubjectsService = async (schoolId: string) => {
  const [classes, subjects] = await Promise.all([
    ClassModel.find({ schoolId })
      .select("_id name order")
      .sort({ order: 1 })
      .lean(),

    SubjectModel.find({ schoolId }).select("_id name classId").lean(),
  ]);

  return classes.map((cls) => ({
    ...cls,
    subjects: subjects.filter(
      (sub) => sub.classId.toString() === cls._id.toString(),
    ),
  }));
};

/* ================= TEACHERS ================= */
export const getTeachersBySubjectService = async (
  subjectId: string,
  classId: string,
  schoolId: string,
) => {
  const mappings = await teacherAssignmentModel
    .find({ subjectId, classId, schoolId })
    .select("teacherId");

  const ids = mappings.map((m) => m.teacherId);

  return await TeacherModel.find({ _id: { $in: ids } })
    .select("_id firstName lastName")
    .lean();
};

/* ================= PUBLISH ================= */
export const publishExamService = async (examId: string, schoolId: string) => {
  const exam = await academicExamModel.findOne({ _id: examId, schoolId });

  if (!exam) throw new Error("Exam not found");

  const count = await Schedule.countDocuments({ examId, schoolId });

  if (count === 0) {
    throw new Error("Cannot publish exam without schedule");
  }

  exam.isPublished = true;
  await exam.save();

  return exam;
};

/* ================= STUDENT ================= */
export const getPublishedExamsService = async (schoolId: string) => {
  return await academicExamModel
    .find({ schoolId, isPublished: true })
    .select("name examType startDate endDate")
    .sort({ startDate: 1 })
    .lean();
};

export const previewScheduleService = async (data: any, user: any) => {
  const { examId, classId, subjectId, sectionId, date, startTime, endTime } =
    data;

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    throw new Error("Invalid examId");
  }

  const exam = await academicExamModel.findById(examId).lean();
  if (!exam) throw new Error("Exam not found");
  const sectionBasedExam = isSectionBasedExam((exam as any).examType);

  const [sections, assignments, schedules, teachers] = await Promise.all([
    SectionModel.find({
      classId,
      schoolId: user.schoolId,
    }).lean(),

    teacherAssignmentModel
      .find({
        classId,
        subjectId,
        schoolId: user.schoolId,
      })
      .lean(),

    Schedule.find({
      date,
      schoolId: user.schoolId,
    }).lean(),

    TeacherModel.find({ schoolId: user.schoolId })
      .select("_id firstName lastName")
      .lean(),
  ]);

  /* ================= TEACHER MAP ================= */
  const teacherNameMap = new Map();

  teachers.forEach((t: any) => {
    teacherNameMap.set(t._id.toString(), `${t.firstName} ${t.lastName}`);
  });

  /* ================= ASSIGNMENT MAP ================= */
  const teacherMap = new Map();

  assignments.forEach((a: any) => {
    const key = `${a.classId}-${a.sectionId || "null"}`;
    teacherMap.set(key, a.teacherId);
  });

  const result: any[] = [];

  const targetSections = sectionId
    ? sections.filter((sec) => sec._id.toString() === sectionId.toString())
    : sections.length
      ? sections
      : [{ _id: null, name: "No Section" }];

  if (sectionBasedExam && !sectionId) {
    throw new Error("Section is required for this exam type");
  }

  for (const sec of targetSections) {
    const keyWith = `${classId}-${sec._id}`;
    const keyWithout = `${classId}-null`;

    const teacherId = teacherMap.get(keyWith) || teacherMap.get(keyWithout);

    let conflict = false;

    if (teacherId) {
      conflict = schedules.some(
        (s: any) =>
          s.teacherId?.toString() === teacherId.toString() &&
          startTime < s.endTime &&
          endTime > s.startTime,
      );
    }

    result.push({
      section: sec.name || "No Section",
      teacherName: teacherId ? teacherNameMap.get(teacherId.toString()) : null,
      conflict,
      hasTeacher: !!teacherId,
    });
  }

  return result;
};

export const suggestTimeSlotsService = async (data: any, user: any) => {
  const { classId, subjectId, date } = data;

  /* ================= FETCH ================= */
  const [sections, assignments, schedules] = await Promise.all([
    SectionModel.find({
      classId,
      schoolId: user.schoolId,
    }).lean(),

    teacherAssignmentModel
      .find({
        classId,
        subjectId,
        schoolId: user.schoolId,
      })
      .lean(),

    Schedule.find({ date, schoolId: user.schoolId }).lean(),
  ]);

  /* ================= MAP ================= */
  const teacherMap = new Map();

  assignments.forEach((a: any) => {
    const key = `${a.classId}-${a.sectionId || "null"}`;
    teacherMap.set(key, a.teacherId);
  });

  /* ================= TIME SLOTS ================= */
  const slots = [];

  for (let hour = 9; hour <= 15; hour++) {
    const startTime = `${hour}:00`;
    const endTime = `${hour + 1}:00`;

    let isValid = true;

    for (const sec of sections.length ? sections : [{ _id: null }]) {
      const keyWith = `${classId}-${sec._id}`;
      const keyWithout = `${classId}-null`;

      const teacherId = teacherMap.get(keyWith) || teacherMap.get(keyWithout);

      if (!teacherId) {
        isValid = false;
        break;
      }

      const conflict = schedules.some(
        (s: any) =>
          s.teacherId?.toString() === teacherId.toString() &&
          startTime < s.endTime &&
          endTime > s.startTime,
      );

      if (conflict) {
        isValid = false;
        break;
      }
    }

    if (isValid) {
      slots.push({
        startTime,
        endTime,
      });
    }
  }

  return slots;
};
