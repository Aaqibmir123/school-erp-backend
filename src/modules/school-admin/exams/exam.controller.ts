import {
  createExamService,
  deleteExamService,
  getExamsService,
  updateExamService,
} from "./exam.service";

/* ================= CREATE ================= */
export const createExam = async (req: any, res: any) => {
  try {
    const exam = await createExamService({
      data: req.body,
      user: req.user,
    });

    return res.status(201).json({
      success: true,
      message: "Exam created successfully",
      data: exam,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= GET ================= */
export const getExams = async (req: any, res: any) => {
  try {
    const exams = await getExamsService({
      schoolId: req.user.schoolId,
    });

    return res.status(200).json({
      success: true,
      data: exams,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= UPDATE ================= */
export const updateExam = async (req: any, res: any) => {
  try {
    const exam = await updateExamService({
      id: req.params.id,
      data: req.body,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Exam updated successfully",
      data: exam,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= DELETE ================= */
export const deleteExam = async (req: any, res: any) => {
  try {
    await deleteExamService({
      id: req.params.id,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Exam deleted successfully",
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
