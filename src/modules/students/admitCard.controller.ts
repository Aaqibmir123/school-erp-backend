import { successResponse } from "../../utils/apiResponse";
import { getStudentReleasedAdmitCardsService } from "../school-admin/admit-cards/admitCard.service";

export const getMyAdmitCards = async (req: any, res: any, next: any) => {
  try {
    const studentId = req.query.studentId as string | undefined;
    const data = await getStudentReleasedAdmitCardsService(req.user, studentId);
    return successResponse(res, data, "Admit cards fetched");
  } catch (error) {
    return next(error);
  }
};
