import AcademicYear from "./academicYear.model";

/* CREATE */

export const createAcademicYearService = async (
  schoolId: string,
  name: string
) => {
  const shouldAutoActivate = !(await AcademicYear.exists({
    schoolId,
    isActive: true,
  }));

  if (shouldAutoActivate) {
    await AcademicYear.updateMany(
      { schoolId },
      { $set: { isActive: false } },
    );
  }

  return await AcademicYear.create({
    schoolId,
    name,
    isActive: shouldAutoActivate,
  });

};

/* GET ALL */

export const getAcademicYearsService = async (
  schoolId: string
) => {

  return await AcademicYear.find({
    schoolId,
  }).sort({ createdAt: -1 });

};

/* GET ACTIVE */

export const getActiveAcademicYearService = async (
  schoolId: string
) => {

  return await AcademicYear.findOne({
    schoolId,
    isActive: true,
  });

};

export const setActiveAcademicYearService = async (
  schoolId: string,
  id: string
) => {
  await AcademicYear.updateMany(
    { schoolId },
    { $set: { isActive: false } }
  );

  return AcademicYear.findOneAndUpdate(
    { _id: id, schoolId },
    { $set: { isActive: true } },
    { new: true }
  );
};
