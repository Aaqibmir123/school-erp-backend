import mongoose from "mongoose";
import Schedule from "../school-admin/schedule/schedule.model";
import { StudentModel } from "../school-admin/student/student.model";

import Timetable from "../school-admin/timetable/timetable.model";

export const getTeacherClasses = async (
  teacherId: string,
  schoolId: string,
) => {
  const timetable = await Timetable.find({
    teacherId,
    schoolId,
  })
    .populate("classId", "name")
    .populate("sectionId", "name")
    .populate("subjectId", "name")
    .lean();

  if (!timetable.length) return [];

  const map = new Map();

  for (const item of timetable) {
    const classData = item.classId as any;
    const sectionData = item.sectionId as any;
    const subjectData = item.subjectId as any;

    if (!classData || !sectionData) continue;

    const classId = classData._id.toString();
    const sectionId = sectionData._id.toString();
    const subjectId = subjectData?._id?.toString();

    const key = `${classId}-${sectionId}`;

    if (!map.has(key)) {
      map.set(key, {
        classId,
        className: classData.name,
        sections: [
          {
            _id: sectionId,
            name: sectionData.name,
          },
        ],
        subjects: [],
        subjectSet: new Set(),
      });
    }

    const cls = map.get(key);

    if (subjectId && !cls.subjectSet.has(subjectId)) {
      cls.subjectSet.add(subjectId);
      cls.subjects.push({
        subjectId,
        subjectName: subjectData.name,
      });
    }
  }

  return Array.from(map.values()).map((i) => {
    delete i.subjectSet;
    return i;
  });
};

export const getStudentProgressService = async ({
  classId,
  subjectId,
  schoolId,
  sectionId,
  page = 1,
  limit = 10,
}: any) => {
  const skip = (page - 1) * limit;

  /* ================= OBJECT IDS ================= */
  const classObjectId = new mongoose.Types.ObjectId(classId);
  const subjectObjectId = new mongoose.Types.ObjectId(subjectId);
  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);
  const sectionObjectId = sectionId
    ? new mongoose.Types.ObjectId(sectionId)
    : null;

  console.log(classObjectId, "classObjectId");
  console.log(subjectObjectId, "subjectObjectId");
  console.log(sectionObjectId, "sectionObjectId");

  /* ================= MATCH ================= */
  const matchStage: any = {
    classId: classObjectId,
    schoolId: schoolObjectId,
  };

  if (sectionObjectId) {
    matchStage.sectionId = sectionObjectId;
  }

  /* ================= COMMON FILTER ================= */
  const commonFilter = {
    classId: classObjectId,
    subjectId: subjectObjectId,
    ...(sectionObjectId && { sectionId: sectionObjectId }),
  };

  const [data, total] = await Promise.all([
    StudentModel.aggregate([
      { $match: matchStage },

      /* ================= ATTENDANCE ================= */
      {
        $lookup: {
          from: "attendances",
          let: { studentId: "$_id" },
          pipeline: [
            {
              $match: {
                ...commonFilter,
                schoolId: schoolObjectId,
                $expr: { $eq: ["$studentId", "$$studentId"] },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                present: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0],
                  },
                },
              },
            },
          ],
          as: "attendanceStats",
        },
      },

      /* ================= HOMEWORK TOTAL ================= */
      {
        $lookup: {
          from: "homeworks",
          pipeline: [
            {
              $match: {
                ...commonFilter,
                schoolId: schoolObjectId,
              },
            },
            {
              $count: "total",
            },
          ],
          as: "homeworkStats",
        },
      },

      /* ================= HOMEWORK CHECKED (FIXED 💣) ================= */
      {
        $lookup: {
          from: "homeworkchecks", // 💣 IMPORTANT FIX
          let: { studentId: "$_id" },
          pipeline: [
            {
              $match: {
                schoolId: schoolObjectId,
                subjectId: subjectObjectId,
                ...(sectionObjectId && { sectionId: sectionObjectId }),
                $expr: { $eq: ["$studentId", "$$studentId"] },
              },
            },
            {
              $match: {
                status: "DONE", // 💣 ONLY COUNT DONE
              },
            },
            {
              $count: "submitted",
            },
          ],
          as: "submissionStats",
        },
      },

      /* ================= FLATTEN ================= */
      {
        $addFields: {
          attendanceStats: { $arrayElemAt: ["$attendanceStats", 0] },
          homeworkStats: { $arrayElemAt: ["$homeworkStats", 0] },
          submissionStats: { $arrayElemAt: ["$submissionStats", 0] },
        },
      },

      /* ================= SAFE VALUES ================= */
      {
        $addFields: {
          totalAttendance: { $ifNull: ["$attendanceStats.total", 0] },
          presentCount: { $ifNull: ["$attendanceStats.present", 0] },

          totalHomework: { $ifNull: ["$homeworkStats.total", 0] },
          submittedHomework: {
            $ifNull: ["$submissionStats.submitted", 0],
          },
        },
      },

      /* ================= PERCENTAGES ================= */
      {
        $addFields: {
          attendancePercentage: {
            $cond: [
              { $eq: ["$totalAttendance", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$presentCount", "$totalAttendance"] },
                  100,
                ],
              },
            ],
          },

          homeworkPercentage: {
            $cond: [
              { $eq: ["$totalHomework", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$submittedHomework", "$totalHomework"] },
                  100,
                ],
              },
            ],
          },
        },
      },

      /* ================= STATUS ================= */
      {
        $addFields: {
          status: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [
                      { $gte: ["$attendancePercentage", 80] },
                      { $gte: ["$homeworkPercentage", 80] },
                    ],
                  },
                  then: "excellent",
                },
                {
                  case: { $lt: ["$attendancePercentage", 50] },
                  then: "irregular",
                },
                {
                  case: { $lt: ["$homeworkPercentage", 50] },
                  then: "careless",
                },
              ],
              default: "average",
            },
          },
        },
      },

      /* ================= FINAL RESPONSE ================= */
      {
        $project: {
          _id: 0,
          studentId: "$_id",

          name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$firstName", ""] },
                  " ",
                  { $ifNull: ["$lastName", ""] },
                ],
              },
            },
          },

          attendancePercentage: {
            $round: ["$attendancePercentage", 0],
          },

          homework: {
            total: "$totalHomework",
            submitted: "$submittedHomework",
          },

          status: 1,
        },
      },

      /* ================= SORT ================= */
      {
        $sort: { attendancePercentage: 1 },
      },

      /* ================= PAGINATION ================= */
      { $skip: skip },
      { $limit: limit },
    ]),

    StudentModel.countDocuments(matchStage),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getStudentsByClassService = async ({
  classId,
  sectionId,
  schoolId,
}: any) => {
  /* ================= VALIDATION ================= */
  console.log(classId, sectionId, schoolId, "idddd");
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    throw new Error("Invalid classId");
  }

  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
    throw new Error("Invalid schoolId");
  }

  /* ================= BASE QUERY ================= */

  const query: any = {
    classId: new mongoose.Types.ObjectId(classId),
    schoolId: new mongoose.Types.ObjectId(schoolId),
  };

  /* ================= SECTION LOGIC (FIXED 💣) ================= */

  const isValidSection =
    sectionId &&
    sectionId !== "null" &&
    sectionId !== "undefined" &&
    mongoose.Types.ObjectId.isValid(sectionId);

  if (isValidSection) {
    query.sectionId = new mongoose.Types.ObjectId(sectionId);
  }

  /* ================= FETCH ================= */

  const students = await StudentModel.find(query)
    .select("_id firstName lastName rollNumber sectionId")
    .sort({ rollNumber: 1 })
    .lean();

  return students;
};

export const getTeacherAcademicExamsService = async (teacher: any) => {
  const schedules = await Schedule.find({
    teacherId: teacher.teacherId,
  })
    .populate("examId", "name examType startDate endDate")
    .populate("subjectId", "name")
    .populate("classId", "name")
    .sort({ date: 1 })
    .lean();

  const grouped: Record<string, any> = {};

  for (const s of schedules) {
    const examId = s.examId?._id?.toString(); // 🔥 FIX (use id)

    if (!examId) continue;

    if (!grouped[examId]) {
      grouped[examId] = {
        examId,
        examName: s.examId?.name,
        examType: s.examId?.examType,
        startDate: s.examId?.startDate,
        endDate: s.examId?.endDate,
        subjects: [],
      };
    }

    // 🔥 prevent duplicate entries
    const alreadyExists = grouped[examId].subjects.some(
      (sub: any) =>
        sub.subjectId.toString() === s.subjectId?._id?.toString() &&
        sub.classId.toString() === s.classId?._id?.toString(),
    );

    if (alreadyExists) continue;

    grouped[examId].subjects.push({
      subject: s.subjectId?.name,
      class: s.classId?.name,
      date: s.date,

      // 🔥 RAW DATA (BEST)
      startTime: s.startTime,
      endTime: s.endTime,

      examId: s.examId?._id,
      subjectId: s.subjectId?._id,
      classId: s.classId?._id,
    });
  }

  return Object.values(grouped);
};
