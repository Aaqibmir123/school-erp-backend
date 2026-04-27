import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { ApiError } from "../utils/apiError";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: err.issues[0]?.message || "Validation error",
      data: null,
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: err.details ?? null,
    });
  }

  if (typeof err === "object" && err && "code" in err && err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate record found",
      data: null,
    });
  }

  if (
    typeof err === "object" &&
    err &&
    "code" in err &&
    err.code === "LIMIT_FILE_SIZE"
  ) {
    return res.status(413).json({
      success: false,
      message: "Image is too large. Please choose a file under 5 MB.",
      data: null,
    });
  }

  console.error("Unhandled error:", err);

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    data: null,
  });
};
