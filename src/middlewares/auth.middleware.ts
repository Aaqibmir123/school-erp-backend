import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { JwtPayload } from "../../shared-types/jwt.types";
import { env } from "../config/env";
import { User } from "../modules/user/user.model";
import { ensureUserRoleAccess } from "../utils/accountAccess";
import { ApiError } from "../utils/apiError";

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  (async () => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new ApiError(401, "Unauthorized"));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await User.findById(decoded.id)
      .select("_id phone role schoolId status")
      .lean();

    if (!user || user.status === "disabled") {
      return next(new ApiError(403, "Your account is disabled by school admin"));
    }

    const roleAccess = await ensureUserRoleAccess(user);

    req.user = {
      ...decoded,
      id: user._id.toString(),
      phone: user.phone,
      role: user.role as JwtPayload["role"],
      schoolId: user.schoolId?.toString?.() || decoded.schoolId,
      studentId:
        (roleAccess as any)?.student?._id?.toString?.() || decoded.studentId,
      teacherId:
        (roleAccess as any)?.teacher?._id?.toString?.() || decoded.teacherId,
    };

    return next();
  })().catch(() => next(new ApiError(401, "Invalid token")));
};
