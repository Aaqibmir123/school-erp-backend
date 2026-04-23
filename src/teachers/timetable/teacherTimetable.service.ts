import Timetable from "../../modules/school-admin/timetable/timetable.model";

export const getTeacherTimetableService = async (teacherId: string) => {
  const data = await Timetable.find({ teacherId })
    .populate("subjectId", "name")
    .populate("periodId", "startTime endTime periodNumber")
    .populate("classId", "name")
    .populate("sectionId", "name")
    .lean();
  const result: any = {
    Mon: [],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: [],
  };

  data.forEach((t: any) => {
    const day = t.day;

    if (!result[day]) return; // safety

    result[day].push({
      _id: t._id,
      classId: t.classId?._id,
      className: t.classId?.name,
      sectionId: t.sectionId,
      subjectId: t.subjectId?._id,
      subjectName: t.subjectId?.name,
      periodId: t.periodId?._id,
      startTime: t.periodId?.startTime,
      endTime: t.periodId?.endTime,
    });
  });

  // 🔥 SORT BY TIME
  Object.keys(result).forEach((day) => {
    result[day].sort((a: any, b: any) =>
      a.startTime.localeCompare(b.startTime),
    );
  });

  return result;
};
