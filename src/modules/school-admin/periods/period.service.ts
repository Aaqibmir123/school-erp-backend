import Timetable from "../timetable/timetable.model";
import { PeriodModel } from "./period.model";
export const createPeriod = async (schoolId: string, data: any) => {
  const existing = await PeriodModel.find({ schoolId });

  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const newStart = toMinutes(data.startTime);
  const newEnd = toMinutes(data.endTime);

  const isOverlap = existing.some((p) => {
    const pStart = toMinutes(p.startTime);
    const pEnd = toMinutes(p.endTime);

    return newStart < pEnd && newEnd > pStart;
  });

  if (isOverlap) {
    throw new Error("Time overlaps with existing slot");
  }

  return await PeriodModel.create({
    ...data,
    schoolId,
  });
};
export const getPeriods = async (schoolId: string) => {
  return PeriodModel.find({ schoolId }).sort({ periodNumber: 1 });
};

export const deletePeriod = async (
  id: string,
  schoolId: string,
  forceDelete = false,
) => {
  const isUsed = await Timetable.exists({
    periodId: id,
    schoolId,
  });

  // 💣 STEP 1: CHECK LINK
  if (isUsed && !forceDelete) {
    return {
      success: false,
      isLinked: true,
      message: "This period is used in timetable",
    };
  }

  // 💣 STEP 2: CASCADE DELETE
  if (isUsed && forceDelete) {
    await Timetable.deleteMany({
      periodId: id,
      schoolId,
    });
  }

  // ✅ DELETE PERIOD
  await PeriodModel.findOneAndDelete({
    _id: id,
    schoolId,
  });

  return {
    success: true,
    message: "Period deleted successfully",
  };
};
