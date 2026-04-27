import dayjs from "dayjs";
import mongoose from "mongoose";

import { TeacherModel } from "../school-admin/teacher/teacher.model";
import { SchoolProfile } from "../school-admin/school/schoolProfile.model";
import TeacherAttendance from "./teacherAttendance.model";

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

const toMinutes = (value?: string) => {
  if (!value || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const nowMinutes = () => {
  const now = dayjs();
  return now.hour() * 60 + now.minute();
};

const todayDate = () => dayjs().format("YYYY-MM-DD");

const WEEKDAY_BY_INDEX = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getWeekdayFromDate = (date: string) => {
  const parsed = dayjs(date);
  if (!parsed.isValid()) return null;
  return WEEKDAY_BY_INDEX[parsed.day()];
};

const getSchoolTimings = async (schoolId: string) => {
  const school = await SchoolProfile.findOne({
    schoolId: new mongoose.Types.ObjectId(schoolId),
  })
    .select(
      "checkInOpenTime schoolStartTime lateMarkAfterTime checkInCloseTime schoolEndTime checkOutCloseTime workingDays",
    )
    .lean();

  return {
    checkInOpenTime: school?.checkInOpenTime || "",
    schoolStartTime: school?.schoolStartTime || "",
    lateMarkAfterTime: school?.lateMarkAfterTime || "",
    checkInCloseTime: school?.checkInCloseTime || "",
    schoolEndTime: school?.schoolEndTime || "",
    checkOutCloseTime: school?.checkOutCloseTime || "",
    workingDays: school?.workingDays || [],
  };
};

export const markTeacherCheckInService = async (
  schoolId: string,
  user: any,
  body: any,
) => {
  const teacherId = user?.teacherId;

  if (!teacherId) {
    throw new Error("Invalid teacher");
  }

  const date = String(body?.date || todayDate());
  const note = String(body?.note || "").trim();
  const timings = await getSchoolTimings(schoolId);
  const current = nowMinutes();
  const weekday = getWeekdayFromDate(date);
  const open = toMinutes(timings.checkInOpenTime);
  const close = toMinutes(timings.checkInCloseTime);
  const start = toMinutes(timings.schoolStartTime);
  const late = toMinutes(timings.lateMarkAfterTime);

  if (weekday && timings.workingDays.length > 0 && !timings.workingDays.includes(weekday)) {
    throw new Error("School is closed today");
  }

  if (open !== null && current < open) {
    throw new Error("Check-in has not opened yet");
  }

  if (close !== null && current > close) {
    throw new Error("Check-in window closed");
  }

  const existing = await TeacherAttendance.findOne({
    schoolId: toObjectId(schoolId),
    teacherId: toObjectId(teacherId),
    date,
  });

  if (existing?.checkInAt) {
    return existing;
  }

  let status: "PRESENT" | "LATE" = "PRESENT";
  if (start !== null && current > start) {
    status = "LATE";
  }
  if (late !== null && current > late) {
    status = "LATE";
  }

  const record = await TeacherAttendance.findOneAndUpdate(
    {
      schoolId: toObjectId(schoolId),
      teacherId: toObjectId(teacherId),
      date,
    },
    {
      $set: {
        schoolId,
        teacherId: toObjectId(teacherId),
        date,
        checkInAt: new Date(),
        checkOutAt: null,
        status,
        note,
        markedBy: toObjectId(user.id || teacherId),
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    },
  ).lean();

  return record;
};

export const markTeacherCheckOutService = async (
  schoolId: string,
  user: any,
  body: any,
) => {
  const teacherId = user?.teacherId;

  if (!teacherId) {
    throw new Error("Invalid teacher");
  }

  const date = String(body?.date || todayDate());
  const note = String(body?.note || "").trim();
  const timings = await getSchoolTimings(schoolId);
  const current = nowMinutes();
  const weekday = getWeekdayFromDate(date);
  const closeOut = toMinutes(timings.checkOutCloseTime);
  const schoolEnd = toMinutes(timings.schoolEndTime);

  if (weekday && timings.workingDays.length > 0 && !timings.workingDays.includes(weekday)) {
    throw new Error("School is closed today");
  }

  const record = await TeacherAttendance.findOne({
    schoolId: toObjectId(schoolId),
    teacherId: toObjectId(teacherId),
    date,
  });

  if (!record?.checkInAt) {
    throw new Error("Check in first before checking out");
  }

  if (record.checkOutAt) {
    return record;
  }

  if (closeOut !== null && current > closeOut) {
    throw new Error("Check-out window closed");
  }

  const status =
    schoolEnd !== null && current < schoolEnd ? "HALF_DAY" : "CHECKED_OUT";

  const updated = await TeacherAttendance.findOneAndUpdate(
    {
      schoolId: toObjectId(schoolId),
      teacherId: toObjectId(teacherId),
      date,
    },
    {
      $set: {
        checkOutAt: new Date(),
        status,
        note: note || record.note || "",
      },
    },
    {
      new: true,
    },
  ).lean();

  return updated;
};

export const markTeacherLeaveService = async (
  schoolId: string,
  user: any,
  body: any,
) => {
  const teacherId = user?.teacherId;

  if (!teacherId) {
    throw new Error("Invalid teacher");
  }

  const date = String(body?.date || todayDate());
  const note = String(body?.note || "").trim();
  const timings = await getSchoolTimings(schoolId);
  const weekday = getWeekdayFromDate(date);

  if (weekday && timings.workingDays.length > 0 && !timings.workingDays.includes(weekday)) {
    throw new Error("School is closed today");
  }

  const record = await TeacherAttendance.findOneAndUpdate(
    {
      schoolId: toObjectId(schoolId),
      teacherId: toObjectId(teacherId),
      date,
    },
    {
      $set: {
        schoolId: toObjectId(schoolId),
        teacherId: toObjectId(teacherId),
        date,
        checkInAt: null,
        checkOutAt: null,
        status: "LEAVE",
        note,
        markedBy: toObjectId(user.id || teacherId),
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    },
  ).lean();

  return record;
};

export const getTeacherAttendanceHistoryService = async ({
  schoolId,
  teacherId,
  page = 1,
  limit = 20,
  from,
  to,
  search,
  status,
}: {
  schoolId: string;
  teacherId?: string;
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  search?: string;
  status?: string;
}) => {
  const query: any = {
    schoolId: new mongoose.Types.ObjectId(schoolId),
  };

  if (teacherId) {
    query.teacherId = new mongoose.Types.ObjectId(teacherId);
  }

  if (status) {
    query.status = status.toUpperCase();
  }

  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = from;
    if (to) query.date.$lte = to;
  }

  if (search) {
    const teachers = await TeacherModel.find({
      schoolId,
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    })
      .select("_id")
      .lean();

    const ids = teachers.map((item: any) => item._id);

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

    query.teacherId = { $in: ids };
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    TeacherAttendance.find(query)
      .populate("teacherId", "firstName lastName employeeId phone")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TeacherAttendance.countDocuments(query),
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
