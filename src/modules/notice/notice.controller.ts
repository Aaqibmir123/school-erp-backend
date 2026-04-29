import { Response } from "express";

import { ApiError } from "../../utils/apiError";
import * as service from "./notice.service";

export const createNotice = async (req: any, res: Response) => {
  const schoolId = req.user?.schoolId;
  const createdById = req.user?.id;
  const createdByRole = req.user?.role;
  const { title, body, audience, academicYearId } = req.body;

  if (!schoolId || !createdById || !createdByRole) {
    throw new ApiError(401, "Unauthorized");
  }

  if (!title?.trim() || !body?.trim() || !audience?.trim()) {
    throw new ApiError(400, "Title, notice text, and audience are required");
  }

  const data = await service.createNoticeService({
    schoolId,
    createdById,
    createdByRole,
    title: title.trim(),
    body: body.trim(),
    audience: audience.trim(),
    academicYearId,
  });

  res.json({
    success: true,
    message: "Notice created successfully",
    data,
  });
};

export const getNotices = async (req: any, res: Response) => {
  const schoolId = req.user?.schoolId;

  if (!schoolId) {
    throw new ApiError(401, "Unauthorized");
  }

  const data = await service.getNoticesService({
    schoolId,
    academicYearId: req.query.academicYearId as string | undefined,
  });

  res.json({
    success: true,
    data,
  });
};

export const getNoticeFeed = async (req: any, res: Response) => {
  const schoolId = req.user?.schoolId;
  const role = req.user?.role;

  if (!schoolId || !role) {
    throw new ApiError(401, "Unauthorized");
  }

  const data = await service.getNoticeFeedService({
    schoolId,
    role,
  });

  res.json({
    success: true,
    data,
  });
};

export const updateNotice = async (req: any, res: Response) => {
  const schoolId = req.user?.schoolId;
  const noticeId = req.params.id;
  const { title, body, audience, academicYearId } = req.body;

  if (!schoolId) {
    throw new ApiError(401, "Unauthorized");
  }

  if (!title?.trim() || !body?.trim() || !audience?.trim()) {
    throw new ApiError(400, "Title, notice text, and audience are required");
  }

  const data = await service.updateNoticeService({
    noticeId,
    schoolId,
    title: title.trim(),
    body: body.trim(),
    audience: audience.trim(),
    academicYearId,
  });

  if (!data) {
    throw new ApiError(404, "Notice not found");
  }

  res.json({
    success: true,
    message: "Notice updated successfully",
    data,
  });
};

export const deleteNotice = async (req: any, res: Response) => {
  const schoolId = req.user?.schoolId;
  const noticeId = req.params.id;

  if (!schoolId) {
    throw new ApiError(401, "Unauthorized");
  }

  const data = await service.deleteNoticeService({
    noticeId,
    schoolId,
  });

  if (!data) {
    throw new ApiError(404, "Notice not found");
  }

  res.json({
    success: true,
    message: "Notice deleted successfully",
  });
};
