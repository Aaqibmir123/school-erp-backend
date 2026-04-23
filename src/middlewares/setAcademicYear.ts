import AcademicYear from "../modules/academicYears/academicYear.model";

export const attachAcademicYear = async (req: any, res: any, next: any) => {
  try {
    const schoolId = req.user.schoolId;

    const year = await AcademicYear.findOne({
      schoolId,
      isActive: true,
    }).lean();

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "No active academic year found",
      });
    }

    req.academicYearId = year._id;

    next(); // 🔥 MUST
  } catch (err) {
    next(err); // 🔥 MUST
  }
};
