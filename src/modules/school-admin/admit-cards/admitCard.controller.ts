import {
  getAdmitCardStudentsService,
  getReleasedAdmitCardsService,
  previewAdmitCardService,
  releaseAdmitCardsService,
  toggleAdmitCardApprovalService,
} from "./admitCard.service";

export const previewAdmitCard = async (req: any, res: any) => {
  try {
    const data = await previewAdmitCardService(req, req.body);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const releaseAdmitCards = async (req: any, res: any) => {
  try {
    const data = await releaseAdmitCardsService(req, req.body);
    return res.status(200).json({
      success: true,
      message: "Admit cards approved successfully",
      data,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const toggleAdmitCardApproval = async (req: any, res: any) => {
  try {
    const data = await toggleAdmitCardApprovalService(req, req.body);
    return res.status(200).json({
      success: true,
      message: req.body?.approved
        ? "Admit cards approved successfully"
        : "Admit card approval revoked successfully",
      data,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const getAdmitCardStudents = async (req: any, res: any) => {
  try {
    const data = await getAdmitCardStudentsService(req, req.params.examId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

export const getReleasedAdmitCards = async (req: any, res: any) => {
  try {
    const data = await getReleasedAdmitCardsService(req);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
