import { NextFunction, Request, Response } from "express";

import { successResponse } from "../../../utils/apiResponse";
import * as service from "./deleteAccount.service";

export const createDeleteAccountRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = await service.createDeleteAccountRequest({
      fullName: req.body.fullName,
      ipAddress: req.ip,
      reason: req.body.reason,
      registeredPhoneNumber: req.body.registeredPhoneNumber,
      role: req.body.role,
      schoolName: req.body.schoolName,
      source: req.body.source || "web",
      userAgent: req.headers["user-agent"] || "",
    });

    return successResponse(
      res,
      {
        requestId: payload.requestId,
        storage: payload.storage,
      },
      "Delete account request submitted successfully",
      201,
    );
  } catch (error) {
    return next(error);
  }
};
