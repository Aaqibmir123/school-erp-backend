import { Response } from "express";

import { errorResponse, successResponse } from "../../../utils/apiResponse";
import {
  getDashboardOverviewService,
  getDashboardSummaryService,
} from "./dashboard.service";

export const getDashboardSummary = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const summary = await getDashboardSummaryService(schoolId);

    return successResponse(res, summary, "Dashboard summary loaded successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to load dashboard");
  }
};

export const getDashboardOverview = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const overview = await getDashboardOverviewService(schoolId);

    return successResponse(res, overview, "Dashboard overview loaded successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to load dashboard");
  }
};
