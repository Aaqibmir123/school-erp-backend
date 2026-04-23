import mongoose from "mongoose";
import { ISchoolProfile, SchoolProfile } from "./schoolProfile.model";
// ✅ GET SCHOOL PROFILE
export const getSchoolProfile = async (): Promise<ISchoolProfile | null> => {
  return await SchoolProfile.findOne().lean();
};

export const upsertSchoolProfile = async (
  schoolId: string,
  data: Partial<ISchoolProfile>,
): Promise<ISchoolProfile | null> => {
  try {
    // 🔥 VALIDATION
    if (!schoolId) {
      throw new Error("schoolId is required");
    }

    if (!data || typeof data !== "object") {
      throw new Error("Invalid data object");
    }

    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

    const updated = await SchoolProfile.findOneAndUpdate(
      { schoolId: schoolObjectId }, // 🔥 FILTER
      {
        $set: {
          ...data,
          schoolId: schoolObjectId, // 🔥 ENSURE SAVE
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true, // 🔥 good practice
      },
    ).lean();

    return updated;
  } catch (error) {
    console.error("UPSERT SCHOOL ERROR:", error);
    throw error;
  }
};
