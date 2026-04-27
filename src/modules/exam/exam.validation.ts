const ALL_EXAM_TYPES = new Set([
  "class_test",
  "unit_test",
  "mid_term",
  "final",
  "written",
  "oral",
  "quiz",
]);

const TEACHER_EXAM_TYPES = new Set(["class_test", "unit_test"]);

const normalizeRole = (role?: string) => String(role || "").toUpperCase();

const getAllowedExamTypes = (role?: string) => {
  return normalizeRole(role) === "SCHOOL_ADMIN" ? ALL_EXAM_TYPES : TEACHER_EXAM_TYPES;
};

const validateExamTypeAccess = (examType: any, role?: string) => {
  if (!examType) return;

  const normalized = String(examType).toLowerCase();
  const allowedExamTypes = getAllowedExamTypes(role);

  if (!allowedExamTypes.has(normalized)) {
    if (normalizeRole(role) === "SCHOOL_ADMIN") {
      throw new Error("Invalid exam type");
    }

    throw new Error("Teachers can only create class test or unit test");
  }
};

export const validateCreateExam = (data: any, role?: string) => {
  const { name, examType, classId, subjectId, totalMarks, date } = data;

  if (!name) throw new Error("Exam name required");
  if (name.length > 20) throw new Error("Max 20 chars");

  if (!examType) throw new Error("Exam type required");
  if (!classId) throw new Error("Class required");
  validateExamTypeAccess(examType, role);

  if (!totalMarks || totalMarks <= 0) throw new Error("Invalid marks");

  if (!date) throw new Error("Date required");

  // 🔥 RULE
  if (
    ["class_test", "unit_test", "written", "oral", "quiz"].includes(
      String(examType).toLowerCase(),
  ) &&
    !subjectId
  ) {
    throw new Error("Subject required");
  }
};

export const validateUpdateExam = (data: any, role?: string) => {
  if (data.examType) {
    validateExamTypeAccess(data.examType, role);
  }
};
