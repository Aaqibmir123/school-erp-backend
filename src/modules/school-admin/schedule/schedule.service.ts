import mongoose from "mongoose";
import { ClassModel } from "../classes/class.model";
import academicExamModel from "../exams/academicExam.model";
import { SectionModel } from "../sections/sections.model";
import { SubjectModel } from "../subjects/subjects.model";
import { TeacherModel } from "../teacher/teacher.model";
import teacherAssignmentModel from "../teacher/teacherAssignment.model";
import AcademicYear from "../../academicYears/academicYear.model";
import { SchoolProfile } from "../school/schoolProfile.model";
import Schedule from "./schedule.model";

const normalizeExamType = (value?: string) =>
  value?.toLowerCase().replace(/[^a-z0-9]+/g, "") || "";

const isSectionBasedExam = (value?: string) => {
  const normalized = normalizeExamType(value);

  return (
    normalized.includes("classtest") || normalized.includes("unittest")
  );
};

const isValidTime = (value?: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value || "");

const toMinutes = (value?: string) => {
  if (!isValidTime(value)) return null;
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
};

const WEEKDAY_BY_INDEX = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const normalizeWeekday = (value?: string) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";

  const shortMap: Record<string, string> = {
    sunday: "sun",
    monday: "mon",
    tuesday: "tue",
    wednesday: "wed",
    thursday: "thu",
    friday: "fri",
    saturday: "sat",
  };

  if (shortMap[raw]) {
    return shortMap[raw];
  }

  return raw.slice(0, 3);
};

const getWeekdayCode = (date?: string) => {
  const parsed = new Date(date || "");
  if (Number.isNaN(parsed.getTime())) return "";
  return WEEKDAY_BY_INDEX[parsed.getDay()].toLowerCase();
};

const toDateString = (value?: string | Date) => {
  if (!value) return "";

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return String(value);
};

const assertSchoolTiming = async (
  schoolId: string,
  date: string,
  startTime: string,
  endTime: string,
) => {
  const profile = await SchoolProfile.findOne({ schoolId }).lean();

  if (!profile) {
    return;
  }

  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  const schoolStart = toMinutes(profile.schoolStartTime);
  const schoolEnd = toMinutes(profile.schoolEndTime);

  if (start === null || end === null) {
    throw new Error("Time must use HH:mm format");
  }

  if (start >= end) {
    throw new Error("End time must be after start time");
  }

  if (schoolStart !== null && schoolEnd !== null) {
    if (start < schoolStart || end > schoolEnd) {
      throw new Error("Schedule must stay within school timing");
    }
  }

  if (Array.isArray(profile.workingDays) && profile.workingDays.length > 0) {
    const dayName = getWeekdayCode(date);
    const allowed = profile.workingDays.map((day: string) =>
      normalizeWeekday(day),
    );
    if (!allowed.includes(dayName)) {
      throw new Error("Schedule must stay within school working days");
    }
  }
};

const assertScheduleConflicts = async (
  scheduleId: string,
  schoolId: string,
  teacherId: string,
  classId: string,
  sectionId: string,
  date: string,
  startTime: string,
  endTime: string,
) => {
  const sameDaySchedules = await Schedule.find({
    schoolId,
    date,
    _id: { $ne: scheduleId },
  }).lean();

  const sectionConflict = sameDaySchedules.find(
    (s: any) =>
      s.classId?.toString() === classId.toString() &&
      s.sectionId?.toString() === sectionId.toString() &&
      startTime < s.endTime &&
      endTime > s.startTime,
  );

  if (sectionConflict) {
    throw new Error("Time conflict in section");
  }

  const teacherConflict = sameDaySchedules.find(
    (s: any) =>
      s.teacherId?.toString() === teacherId.toString() &&
      startTime < s.endTime &&
      endTime > s.startTime,
  );

  if (teacherConflict) {
    throw new Error("Teacher already busy at this time");
  }
};

const assertInchargeConflicts = async (
  scheduleId: string,
  schoolId: string,
  teacherId: string,
  date: string,
  startTime: string,
  endTime: string,
) => {
  const sameDaySchedules = await Schedule.find({
    schoolId,
    date,
    _id: { $ne: scheduleId },
  }).lean();

  const conflict = sameDaySchedules.find(
    (s: any) =>
      s.inchargeTeacherId?.toString() === teacherId.toString() &&
      startTime < s.endTime &&
      endTime > s.startTime,
  );

  if (conflict) {
    throw new Error("Exam incharge already busy at this time");
  }
};

/* ================= CREATE SCHEDULE ================= */
export const createScheduleService = async (data: any, user: any) => {
  const {
    examId,
    classId,
    subjectId,
    sectionId,
    date,
    startTime,
    endTime,
    inchargeTeacherId,
  } = data;

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    throw new Error("Invalid examId");
  }

  /* ================= GET EXAM ================= */
  const exam = await academicExamModel.findById(examId).lean();
  if (!exam) throw new Error("Exam not found");
  const sectionBasedExam = isSectionBasedExam((exam as any).examType);

  await assertSchoolTiming(user.schoolId, date, startTime, endTime);

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

  const pendingTeacherIds = new Set<string>();
  const pendingInchargeIds = new Set<string>();

  const operations: any[] = [];

  /* ================= CASE 1: WITH SECTIONS ================= */
  if (targetSections.length > 0) {
    for (const sec of targetSections) {
      const keyWithSection = `${classId}-${sec._id}`;
      const keyWithoutSection = `${classId}-null`;

      const teacherId =
        teacherMap.get(keyWithSection) || teacherMap.get(keyWithoutSection) || null;

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
          teacherId &&
          s.teacherId?.toString() === teacherId.toString() &&
          startTime < s.endTime &&
          endTime > s.startTime,
      );

      if (teacherConflict) {
        throw new Error("Teacher already busy at this time");
      }

      if (inchargeTeacherId) {
        const inchargeKey = String(inchargeTeacherId);
        if (pendingInchargeIds.has(inchargeKey)) {
          throw new Error("Exam incharge already busy at this time");
        }
        await assertInchargeConflicts(
          String(examId),
          user.schoolId,
          inchargeKey,
          date,
          startTime,
          endTime,
        );
        pendingInchargeIds.add(inchargeKey);
      }

      if (teacherId) {
        const teacherKey = String(teacherId);
        if (pendingTeacherIds.has(teacherKey)) {
          throw new Error("Teacher already busy at this time");
        }
        pendingTeacherIds.add(teacherKey);
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
            inchargeTeacherId: inchargeTeacherId || null,
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
    throw new Error("No section found for this class");
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
    .populate("inchargeTeacherId", "firstName lastName")
    .sort({ date: 1, startTime: 1 })
    .lean();
};

/* ================= UPDATE ================= */
export const updateScheduleService = async (id: string, data: any, user: any) => {
  const schedule = await Schedule.findOne({
    _id: id,
    schoolId: user?.schoolId,
  });
  if (!schedule) throw new Error("Schedule not found");

  const merged = {
    ...schedule.toObject(),
    ...data,
  };

  const exam = await academicExamModel.findById(merged.examId).lean();
  if (!exam) throw new Error("Exam not found");

  const date = toDateString(merged.date);
  const startTime = String(merged.startTime || "");
  const endTime = String(merged.endTime || "");
  const inchargeTeacherId = merged.inchargeTeacherId
    ? String(merged.inchargeTeacherId)
    : null;
  const schoolId = String(user?.schoolId || merged.schoolId || schedule.schoolId || "");

  await assertSchoolTiming(schoolId, date, startTime, endTime);

  const sectionId = String(merged.sectionId || "");
  if (isSectionBasedExam((exam as any).examType) && !sectionId) {
    throw new Error("Section is required for this exam type");
  }

  if (merged.teacherId && merged.classId && sectionId) {
    await assertScheduleConflicts(
      id,
      schoolId,
      String(merged.teacherId),
      String(merged.classId),
      sectionId,
      date,
      startTime,
      endTime,
    );
  }

  if (inchargeTeacherId) {
    await assertInchargeConflicts(
      id,
      schoolId,
      inchargeTeacherId,
      date,
      startTime,
      endTime,
    );
  }

  schedule.set({
    ...data,
    date: merged.date,
    startTime,
    endTime,
    inchargeTeacherId,
  });

  await schedule.save();

  return schedule;
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

  if (!exam.academicYearId) {
    const academicYear =
      (await AcademicYear.findOne({ schoolId, isActive: true }).lean()) ||
      (await AcademicYear.findOne({ schoolId }).sort({ createdAt: -1 }).lean());

    if (!academicYear?._id) {
      throw new Error("No academic year found");
    }

    exam.academicYearId = academicYear._id as any;
  }

  const schedules = await Schedule.find({ examId, schoolId }).lean();

  if (schedules.length === 0) {
    throw new Error("Cannot publish exam without schedule");
  }

  for (const schedule of schedules) {
    await assertSchoolTiming(
      schoolId,
      toDateString(schedule.date),
      schedule.startTime,
      schedule.endTime,
    );
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
  const inchargeTeacherId = data?.inchargeTeacherId ? String(data.inchargeTeacherId) : null;

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    throw new Error("Invalid examId");
  }

  const exam = await academicExamModel.findById(examId).lean();
  if (!exam) throw new Error("Exam not found");
  const sectionBasedExam = isSectionBasedExam((exam as any).examType);

  await assertSchoolTiming(user.schoolId, date, startTime, endTime);

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

    const teacherId = teacherMap.get(keyWith) || teacherMap.get(keyWithout) || null;

    let conflict = false;
    let inchargeConflict = false;

    if (teacherId) {
      conflict = schedules.some(
        (s: any) =>
          s.teacherId?.toString() === teacherId.toString() &&
          startTime < s.endTime &&
          endTime > s.startTime,
      );
    }

    if (inchargeTeacherId) {
      inchargeConflict = schedules.some(
        (s: any) =>
          s.inchargeTeacherId?.toString() === inchargeTeacherId &&
          startTime < s.endTime &&
          endTime > s.startTime,
      );
    }

    result.push({
      section: sec.name || "No Section",
      teacherName: teacherId ? teacherNameMap.get(teacherId.toString()) : null,
      inchargeName: inchargeTeacherId
        ? teacherNameMap.get(inchargeTeacherId) || null
        : null,
      conflict,
      inchargeConflict,
      hasTeacher: !!teacherId,
      hasIncharge: !!inchargeTeacherId,
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

  const profile = await SchoolProfile.findOne({ schoolId: user.schoolId }).lean();
  const schoolStart = toMinutes(profile?.schoolStartTime);
  const schoolEnd = toMinutes(profile?.schoolEndTime);
  const allowedDays =
    Array.isArray(profile?.workingDays) && profile.workingDays.length > 0
      ? profile.workingDays.map((day: string) => String(day).toLowerCase())
      : [];
  const selectedDay = getWeekdayCode(date).toLowerCase();

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

    if (schoolStart !== null && schoolEnd !== null) {
      const startMinutes = toMinutes(startTime);
      const endMinutes = toMinutes(endTime);
      if (
        startMinutes === null ||
        endMinutes === null ||
        startMinutes < schoolStart ||
        endMinutes > schoolEnd
      ) {
        continue;
      }
    }

    if (allowedDays.length > 0 && !allowedDays.includes(selectedDay)) {
      continue;
    }

    let isValid = true;

    for (const sec of sections.length ? sections : [{ _id: null }]) {
      const keyWith = `${classId}-${sec._id}`;
      const keyWithout = `${classId}-null`;

      const teacherId = teacherMap.get(keyWith) || teacherMap.get(keyWithout) || null;

      if (teacherId) {
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
