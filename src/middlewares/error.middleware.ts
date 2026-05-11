import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { ApiError } from "../utils/apiError";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof ZodError) {
    console.error("[api-error]", {
      method: req.method,
      path: req.originalUrl,
      status: 400,
      type: "zod",
      message: err.issues[0]?.message || "Validation error",
    });

    return res.status(400).json({
      success: false,
      message: err.issues[0]?.message || "Validation error",
      data: null,
    });
  }

  if (err instanceof ApiError) {
    console.error("[api-error]", {
      method: req.method,
      path: req.originalUrl,
      status: err.statusCode,
      type: "api",
      message: err.message,
    });

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: err.details ?? null,
    });
  }

  if (typeof err === "object" && err && "code" in err && err.code === 11000) {
    console.error("[api-error]", {
      method: req.method,
      path: req.originalUrl,
      status: 409,
      type: "duplicate",
      message: "Duplicate record found",
    });

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
    console.error("[api-error]", {
      method: req.method,
      path: req.originalUrl,
      status: 413,
      type: "file_size",
      message: "Image is too large. Please choose a file under 5 MB.",
    });

    return res.status(413).json({
      success: false,
      message: "Image is too large. Please choose a file under 5 MB.",
      data: null,
    });
  }

  console.error("[api-error]", {
    method: req.method,
    path: req.originalUrl,
    status: 500,
    type: "unhandled",
    err,
  });

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    data: null,
  });
};
