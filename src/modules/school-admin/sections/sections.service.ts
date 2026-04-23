import { SectionModel } from "./sections.model";

/* CREATE SECTIONS */

export const createSections = async (
  schoolId: string,
  classId: string,
  sections: string[],
) => {

  const existing = await SectionModel.find({
    schoolId,
    classId,
  }).select("name");

  const existingNames = existing.map((s) => s.name);

  const filtered = sections.filter(
    (s) => !existingNames.includes(s)
  );

  if (!filtered.length) return [];

  /* FIND LAST ORDER */

  const lastSection = await SectionModel
    .findOne({ schoolId, classId })
    .sort({ order: -1 });

  const startOrder = lastSection ? lastSection.order : 0;

  const newSections = filtered.map((name, index) => ({
    name,
    order: startOrder + index + 1,
    schoolId,
    classId,
  }));

  return SectionModel.insertMany(newSections);

};


/* GET SECTIONS */

export const getSections = async (
  schoolId: string,
  classId?: string
) => {

  const query: any = { schoolId };

  if (classId) {
    query.classId = classId;
  }

  return SectionModel
    .find(query)
    .sort({ order: 1 })
    .populate("classId", "name");

};


/* DELETE SECTION */

export const deleteSection = async (
  sectionId: string
) => {

  return SectionModel.findByIdAndDelete(sectionId);

};

export const getSectionsByClassService = async (
  classId: string,
  schoolId: string
) => {
  return await SectionModel.find({
    classId,
    schoolId,
  }).sort({ name: 1 });
};