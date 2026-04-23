import { HomeworkModel } from "./homework.model";

/* =========================
   CREATE
========================= */
export const createHomeworkService = async (
  teacherId: string,
  schoolId: string,
  data: any,
) => {
  return await HomeworkModel.create({
    ...data,
    teacherId,
    schoolId,
  });
};

/* =========================
   TEACHER LIST (FIXED 🔥)
========================= */

export const getTeacherHomeworkService = async (
  teacherId: string,
  schoolId: string,
) => {
  const homeworkList = await HomeworkModel.find({
    teacherId,
    schoolId,
  })
    .populate("classId", "name")
    .populate("subjectId", "name")
    .populate("sectionId", "name") // 💣 FIXED
    .sort({ createdAt: -1 })
    .lean();

  /* ================= FORMAT RESPONSE ================= */

  const finalData = homeworkList.map((hw: any) => ({
    ...hw,

    className: hw.classId?.name || "",
    subjectName: hw.subjectId?.name || "",
    sectionName: hw.sectionId?.name || "", // 💣 NEW

    // clean ids (optional but good)
    classId: hw.classId?._id,
    subjectId: hw.subjectId?._id,
    sectionId: hw.sectionId?._id,
  }));

  return finalData;
};

/* =========================
   UPDATE
========================= */
export const updateHomeworkService = async (
  teacherId: string,
  schoolId: string,
  homeworkId: string,
  data: any,
) => {
  const allowedFields = ["title", "description", "dueDate", "maxMarks"];

  const updateData: any = {};

  allowedFields.forEach((field) => {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  });

  const updated = await HomeworkModel.findOneAndUpdate(
    {
      _id: homeworkId,
      teacherId,
      schoolId,
    },
    updateData,
    { new: true },
  )
    .populate("classId", "name")
    .populate("subjectId", "name");

  if (!updated) {
    throw new Error("Homework not found or unauthorized");
  }

  return updated;
};

/* =========================
   DELETE 🔥
========================= */
export const deleteHomeworkService = async (
  teacherId: string,
  schoolId: string,
  homeworkId: string,
) => {
  const deleted = await HomeworkModel.findOneAndDelete({
    _id: homeworkId,
    teacherId,
    schoolId,
  });

  if (!deleted) {
    throw new Error("Homework not found or unauthorized");
  }

  return deleted;
};

/* =========================
   STUDENT LIST
========================= */

export const getStudentHomeworkService = async (
  schoolId: string,
  classId: string,
  sectionId?: string,
) => {
  /* ================= QUERY ================= */

  let classSectionQuery: any = {
    classId,
  };

  // 🔥 SECTION LOGIC (CORRECT)
  if (sectionId) {
    classSectionQuery.$or = [
      { sectionId }, // section specific
      { sectionId: null }, // common
    ];
  } else {
    classSectionQuery.sectionId = null;
  }

  /* ================= FINAL QUERY ================= */

  const homework = await HomeworkModel.find({
    schoolId,
    status: "active",
    $or: [{ isGeneral: true }, classSectionQuery],
  })
    .populate("subjectId", "name")
    .populate("teacherId", "firstName lastName")
    .populate("classId", "name")
    .populate("sectionId", "name")
    .sort({ dueDate: 1 })
    .lean();

  /* ================= RESPONSE ================= */

  return homework.map((item: any) => {
    const now = new Date();
    const due = item.dueDate ? new Date(item.dueDate) : null;

    return {
      id: item._id,

      title: item.title,
      description: item.description,

      subject: item.subjectId?.name || "N/A",

      teacher: item.teacherId
        ? `${item.teacherId.firstName} ${item.teacherId.lastName}`
        : "N/A",

      className: item.classId?.name || "N/A",
      sectionName: item.sectionId?.name || "All",

      // 🔥 DATES
      dueDate: item.dueDate,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,

      // 🔥 EXPIRY LOGIC
      isExpired: due ? due < now : false,

      // 🔥 MARKS
      maxMarks: item.maxMarks || 0,

      // 🔥 TYPE
      isGeneral: item.isGeneral || false,
    };
  });
};
