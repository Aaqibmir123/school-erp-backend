import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { JwtPayload } from "../../shared-types/jwt.types";
import { env } from "../config/env";
import { ApiError } from "../utils/apiError";

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new ApiError(401, "Unauthorized"));
    }

    req.user = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    return next();
  } catch {
    return next(new ApiError(401, "Invalid token"));
  }
};
