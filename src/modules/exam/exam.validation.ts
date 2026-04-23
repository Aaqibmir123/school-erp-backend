export const validateCreateExam = (data: any) => {
  const { name, examType, classId, subjectId, totalMarks, date } = data;

  if (!name) throw new Error("Exam name required");
  if (name.length > 20) throw new Error("Max 20 chars");

  if (!examType) throw new Error("Exam type required");
  if (!classId) throw new Error("Class required");

  if (!totalMarks || totalMarks <= 0) throw new Error("Invalid marks");

  if (!date) throw new Error("Date required");

  // 🔥 RULE
  if ((examType === "class_test" || examType === "unit_test") && !subjectId) {
    throw new Error("Subject required");
  }
};
