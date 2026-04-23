export const validateCreateExam = (data) => {
  const requiredFields = [
    "name",
    "examType",
    "classId",
    "subjectId",
    "totalMarks",
    "date",
  ];

  for (let field of requiredFields) {
    if (!data[field]) {
      throw new Error(`${field} is required`);
    }
  }
};
