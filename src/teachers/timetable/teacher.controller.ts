import { getTeacherTimetableService } from "./teacherTimetable.service";
export const getTeacherTimetable = async (req: any, res: any) => {
  try {
    const teacherId = req.user.teacherId;

    const data = await getTeacherTimetableService(teacherId);

    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
