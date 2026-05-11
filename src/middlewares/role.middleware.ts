import { Request, Response, NextFunction } from "express";

export const roleMiddleware = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = String(req.user?.role || "").toUpperCase();
    const normalizedAllowed = allowedRoles.map((role) => String(role || "").toUpperCase());
    const accessModules = Array.isArray(req.user?.accessModules)
      ? req.user.accessModules.map((m) => String(m).toLowerCase())
      : [];
    const reviewerAllowed =
      userRole === "REVIEWER" &&
      ((normalizedAllowed.includes("TEACHER") && accessModules.includes("teacher")) ||
        (normalizedAllowed.includes("PARENT") && accessModules.includes("parent")));

    if (!userRole || (!normalizedAllowed.includes(userRole) && !reviewerAllowed)) {
      console.warn("[roleMiddleware] access denied", {
        allowedRoles: normalizedAllowed,
        path: req.originalUrl,
        userRole,
      });

      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    next();
  };
};
