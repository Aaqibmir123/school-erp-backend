import { Types } from "mongoose";
import { PeriodModel } from "../periods/period.model";
import Timetable from "./timetable.model";

/* ====================================== */
/* 🔧 UTILS */
/* ====================================== */

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const formatTime = (min: number) => {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

const normalize = (id: any) => id?.toString();

export const createTimetableEntries = async (
  schoolId: string,
  entries: any[],
) => {
  try {
    if (!entries.length) throw new Error("No data provided");

    const periods = await PeriodModel.find({ schoolId }).lean();

    const bulkOps: any[] = [];

    for (let index = 0; index < entries.length; index++) {
      const e = entries[index];

      console.log(`🔎 Processing [${index}]`, e);

      /* ====================================== */
      /* 🕒 PERIOD */
      /* ====================================== */

      const period = periods.find(
        (p: any) => p._id.toString() === normalize(e.periodId),
      );

      if (!period) throw new Error("Invalid period");

      const startMinutes = timeToMinutes(period.startTime);
      const endMinutes = timeToMinutes(period.endTime);

      /* ====================================== */
      /* 💣 DB CONFLICT CHECK */
      /* ====================================== */

      const dbConflict = await Timetable.findOne({
        schoolId: new Types.ObjectId(schoolId),
        teacherId: new Types.ObjectId(e.teacherId),
        day: e.day,
        startMinutes: { $lt: endMinutes },
        endMinutes: { $gt: startMinutes },
      })
        .populate("teacherId", "firstName lastName")
        .populate("subjectId", "name")
        .populate("classId", "name")
        .populate("sectionId", "name");

      if (dbConflict) {
        console.log("⚠️ Conflict Found:", dbConflict);

        const teacher = dbConflict.teacherId;
        const teacherName = teacher
          ? `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim()
          : "Teacher";

        const subjectName = dbConflict.subjectId?.name || "";
        const className = dbConflict.classId?.name || "";
        const sectionName = dbConflict.sectionId?.name || "";

        const fullClass = sectionName
          ? `${className}-${sectionName}`
          : className;

        throw new Error(
          `❌ ${teacherName} ${
            subjectName ? `(${subjectName})` : ""
          } already teaching ${fullClass} on ${
            dbConflict.day
          } (${formatTime(dbConflict.startMinutes)} - ${formatTime(
            dbConflict.endMinutes,
          )})`,
        );
      }

      /* ====================================== */
      /* ✅ UPSERT */
      /* ====================================== */

      bulkOps.push({
        updateOne: {
          filter: {
            schoolId: new Types.ObjectId(schoolId),
            classId: new Types.ObjectId(e.classId),
            sectionId: e.sectionId ? new Types.ObjectId(e.sectionId) : null,
            day: e.day,
            periodId: new Types.ObjectId(e.periodId),
          },
          update: {
            $set: {
              subjectId: new Types.ObjectId(e.subjectId),
              teacherId: new Types.ObjectId(e.teacherId),
              startMinutes,
              endMinutes,
            },
          },
          upsert: true,
        },
      });

      console.log("✅ Added to bulkOps");
    }

    /* ====================================== */
    /* 💾 SAVE */
    /* ====================================== */

    if (bulkOps.length) {
      console.log("🚀 bulkWrite:", bulkOps.length);
      await Timetable.bulkWrite(bulkOps);
    }

    return { success: true };
  } catch (error: any) {
    console.log("🔥 SERVICE ERROR:", error.message);
    throw error;
  }
};
/* =========================
   GET TIMETABLE
========================= */
export const getTimetable = async ({ schoolId, classId, sectionId }: any) => {
  const query: any = {
    schoolId: new Types.ObjectId(schoolId),
  };

  if (classId) query.classId = new Types.ObjectId(classId);

  if (sectionId) {
    query.sectionId = new Types.ObjectId(sectionId);
  } else {
    query.sectionId = null;
  }

  const data = await Timetable.find(query)
    .populate("subjectId", "name")
    .populate("teacherId", "firstName lastName status")
    .populate("periodId", "startTime endTime periodNumber")
    .lean();

  return data.map((t: any) => ({
    _id: t._id,
    classId: t.classId,
    sectionId: t.sectionId,
    periodId: t.periodId,
    subjectId: t.subjectId?._id,
    subjectName: t.subjectId?.name,
    day: t.day,

    // 🔥 FIX HERE
    teacherId: t.teacherId?._id,
    teacherName: t.teacherId
      ? `${t.teacherId.firstName || ""} ${t.teacherId.lastName || ""}`.trim()
      : null,
  }));
};

/* =========================
   UPDATE
========================= */
export const updateTimetableEntry = async (schoolId: string, data: any) => {
  const { classId, sectionId, subjectId, teacherId, periodId, day } = data;

  if (!classId || !teacherId || !periodId || !day) {
    throw new Error("Missing required fields");
  }

  const period = await PeriodModel.findById(periodId);
  if (!period) throw new Error("Invalid period");

  const startMinutes = timeToMinutes(period.startTime);
  const endMinutes = timeToMinutes(period.endTime);

  /* 💣 CONFLICT CHECK */
  const conflict = await Timetable.findOne({
    schoolId: new Types.ObjectId(schoolId),
    teacherId: new Types.ObjectId(teacherId),
    day,
    startMinutes: { $lt: endMinutes },
    endMinutes: { $gt: startMinutes },
    $nor: [
      {
        classId: new Types.ObjectId(classId),
        periodId: new Types.ObjectId(periodId),
      },
    ],
  });

  if (conflict) {
    throw new Error("Teacher already assigned at this time");
  }

  const updated = await Timetable.findOneAndUpdate(
    {
      schoolId: new Types.ObjectId(schoolId),
      classId: new Types.ObjectId(classId),
      sectionId: sectionId ? new Types.ObjectId(sectionId) : null,
      day,
      periodId: new Types.ObjectId(periodId),
    },
    {
      $set: {
        subjectId: new Types.ObjectId(subjectId),
        teacherId: new Types.ObjectId(teacherId),
        startMinutes,
        endMinutes,
      },
    },
    { new: true },
  );

  if (!updated) {
    throw new Error("Slot not found");
  }

  return updated;
};
