import mongoose from "mongoose";
import { ClassModel } from "../classes/class.model";
import { SubjectModel } from "./subjects.model";
/* CREATE SUBJECTS (BULK) */

export const createSubjectsService = async ({
  classId,
  subjects,
  schoolId,
}: {
  classId: string;
  subjects: string[];
  schoolId: string;
}) => {
  const docs = subjects.map((name: string) => ({
    name: name.trim(),
    classId,
    schoolId,
  }));

  return await SubjectModel.insertMany(docs);
};

/* GET SUBJECTS BY CLASS */

export const getSubjectsByClassService = async (
  classId: string,
  schoolId: string,
) => {
  const classObjectId = new mongoose.Types.ObjectId(classId);
  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

  const result = await SubjectModel.find({
    classId: classObjectId,
    schoolId: schoolObjectId,
  });

  return result;
};

/* DELETE SUBJECT */

export const deleteSubjectService = async (subjectId: string) => {
  return await SubjectModel.findByIdAndDelete(subjectId);
};

/* GET ALL CLASSES WITH SUBJECTS */

export const getSubjectsBySchoolService = async (schoolId: string) => {
  const classes = await ClassModel.find({ schoolId }).sort({ order: 1 }).lean();

  const subjects = await SubjectModel.find({ schoolId })
    .sort({ name: 1 })
    .lean();

  const map: Record<string, any[]> = {};

  for (const sub of subjects) {
    const key = sub.classId.toString();

    if (!map[key]) {
      map[key] = [];
    }

    map[key].push(sub);
  }

  return classes.map((cls) => ({
    classId: cls._id,
    className: cls.name,
    subjects: map[cls._id.toString()] || [],
  }));
};
