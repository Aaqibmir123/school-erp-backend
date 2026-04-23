export const validateSchedule = (data: any, isUpdate = false) => {
  const { examId, classId, subjectId, date, startTime, endTime } = data;

  if (!classId || !subjectId || !date || !startTime || !endTime) {
    throw new Error("All fields are required");
  }

  // 🔥 only for create
  if (!isUpdate && !examId) {
    throw new Error("ExamId is required");
  }
};
