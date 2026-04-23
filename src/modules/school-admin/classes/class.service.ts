import { ClassModel } from "./class.model"
import { CreateClassesDTO } from "../../../../../shared-types/class.types"
import { CLASS_ORDER } from "./class.constants"

export const createClasses = async (
  schoolId: string,
  data: CreateClassesDTO
) => {

  const existing = await ClassModel.find({
    schoolId,
    name: { $in: data.classes },
  }).lean();

  const existingNames = existing.map(c => c.name);

  const newClasses = data.classes.filter(
    c => !existingNames.includes(c)
  );

  const docs = newClasses.map(c => ({
    schoolId,
    name: c,
    order: CLASS_ORDER[c],
  }));

  if (docs.length > 0) {
    await ClassModel.insertMany(docs);
  }

  return {
    created: newClasses,
    skipped: existingNames
  };
};

export const getClasses = async (schoolId: string) => {
  return ClassModel.find({ schoolId })
    .sort({ order: 1 })
    .lean()
}