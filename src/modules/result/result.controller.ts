import {
  createResultsService,
  getResultsByExamService,
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
