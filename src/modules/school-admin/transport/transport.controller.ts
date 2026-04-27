import { Response } from "express";

import { errorResponse, successResponse } from "../../../utils/apiResponse";
import {
  createTransportService,
  deleteTransportService,
  listTransportService,
  updateTransportService,
} from "./transport.service";

export const createTransport = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const transport = await createTransportService(schoolId, req.body);

    return successResponse(res, transport, "Transport added successfully", 201);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to add transport");
  }
};

export const getTransports = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const transports = await listTransportService(schoolId);

    return successResponse(res, transports, "Transports loaded successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to load transports");
  }
};

export const updateTransport = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const transport = await updateTransportService(
      schoolId,
      req.params.id,
      req.body,
    );

    if (!transport) {
      return errorResponse(res, "Transport not found", 404);
    }

    return successResponse(res, transport, "Transport updated successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to update transport");
  }
};

export const deleteTransport = async (req: any, res: Response) => {
  try {
    const schoolId = req.user.schoolId;
    const transport = await deleteTransportService(schoolId, req.params.id);

    if (!transport) {
      return errorResponse(res, "Transport not found", 404);
    }

    return successResponse(res, null, "Transport deleted successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to delete transport");
  }
};
