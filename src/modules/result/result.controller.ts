import {
  createResultsService,
  getResultsByExamService,
  getResultsHistoryService,
} from "./result.service";

/* ================= CREATE ================= */
export const createResults = async (req: any, res: any) => {
  try {
    const teacherId = req.user.teacherId;
    const schoolId = req.user.schoolId;

    const data = await createResultsService(teacherId, schoolId, req.body);

    return res.json({
      success: true,
      message: "Results saved successfully",
      data,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= GET RESULTS ================= */
export const getResultsByExamController = async (req: any, res: any) => {
  try {
    const schoolId = req.user.schoolId;
    const { examId } = req.query;

    const data = await getResultsByExamService({
      examId,
      schoolId,
    });

    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: err.message,
    });
  }
};

/* ================= HISTORY ================= */
export const getResultsHistoryController = async (req: any, res: any) => {
  try {
    const schoolId = req.user.schoolId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await getResultsHistoryService({
      schoolId,
      classId: req.query.classId as string | undefined,
      sectionId: req.query.sectionId as string | undefined,
      subjectId: req.query.subjectId as string | undefined,
      studentId: req.query.studentId as string | undefined,
      examId: req.query.examId as string | undefined,
      search: req.query.search as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      page,
      limit,
    });

    return res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
