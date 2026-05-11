import fs from "fs";
import path from "path";
import { Router } from "express";
import jwt from "jsonwebtoken";

import { JwtPayload } from "../../../shared-types/jwt.types";
import { env } from "../../config/env";
import { ensureUserRoleAccess } from "../../utils/accountAccess";
import { ApiError } from "../../utils/apiError";
import { REVIEWER_ACCESS_MODULES } from "../../utils/reviewerAccess";
import { User } from "../user/user.model";
import ReceiptModel from "../school-admin/receipt/receipt.model";
import AdmitCardModel from "../school-admin/admit-cards/admitCard.model";
import { StudentModel } from "../school-admin/student/student.model";

const router = Router();

const DOCUMENT_ROOTS = {
  "admit-cards": path.join(process.cwd(), "public/admit-cards"),
  "marks-cards": path.join(process.cwd(), "public/marks-cards"),
  receipts: path.join(process.cwd(), "public/receipts"),
} as const;

const getPhoneVariants = (phone?: string) => {
  const digits = String(phone || "").replace(/\D/g, "");
  const normalized = digits.slice(-10);

  return Array.from(
    new Set([digits, normalized, `0${normalized}`].filter(Boolean)),
  );
};

const buildRelativePath = (
  category: keyof typeof DOCUMENT_ROOTS,
  parts: string[],
) => `/${category}/${parts.join("/")}`;

const buildDocumentCandidates = (
  category: keyof typeof DOCUMENT_ROOTS,
  parts: string[],
) => {
  const legacyPath = buildRelativePath(category, parts);
  return [legacyPath, `/api/files${legacyPath}`];
};

const resolveUserFromToken = async (token: string) => {
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  const user = await User.findById(decoded.id)
    .select("_id phone role schoolId status")
    .lean();

  if (!user || user.status === "disabled") {
    throw new ApiError(403, "Your account is disabled by school admin");
  }

  const roleAccess = await ensureUserRoleAccess(user);
  const isReviewer =
    String(user.role || decoded.role || "").toUpperCase() === "REVIEWER";
  const reviewerStudents = Array.isArray((roleAccess as any)?.students)
    ? (roleAccess as any).students
    : [];

  return {
    ...decoded,
    id: user._id.toString(),
    accessModules:
      (roleAccess as any)?.accessModules ||
      decoded.accessModules ||
      (isReviewer ? [...REVIEWER_ACCESS_MODULES] : undefined),
    phone: user.phone,
    role: String(user.role || decoded.role || "").toUpperCase() as JwtPayload["role"],
    schoolId: user.schoolId?.toString?.() || decoded.schoolId,
    studentId:
      (roleAccess as any)?.student?._id?.toString?.() ||
      reviewerStudents[0]?._id?.toString?.() ||
      decoded.studentId,
    teacherId:
      (roleAccess as any)?.teacher?._id?.toString?.() || decoded.teacherId,
  };
};

const documentAuth = async (req: any, _res: any, next: any) => {
  try {
    const bearerToken = req.headers.authorization?.split(" ")[1];
    const queryToken =
      typeof req.query.accessToken === "string" ? req.query.accessToken : null;
    const token = bearerToken || queryToken;

    if (!token) {
      throw new ApiError(401, "Unauthorized");
    }

    req.user = await resolveUserFromToken(token);
    next();
  } catch {
    next(new ApiError(401, "Invalid token"));
  }
};

const ensureRoleAccess = (
  userRole: string,
  allowedRoles: string[],
  accessModules: string[],
) => {
  if (allowedRoles.includes(userRole)) {
    return true;
  }

  if (userRole !== "REVIEWER") {
    return false;
  }

  return (
    (allowedRoles.includes("TEACHER") && accessModules.includes("teacher")) ||
    (allowedRoles.includes("PARENT") && accessModules.includes("parent"))
  );
};

const authorizeDocumentRole =
  (allowedRoles: string[]) => (req: any, _res: any, next: any) => {
    const userRole = String(req.user?.role || "").toUpperCase();
    const accessModules = Array.isArray(req.user?.accessModules)
      ? req.user.accessModules.map((item: string) => String(item).toLowerCase())
      : [];

    if (!ensureRoleAccess(userRole, allowedRoles, accessModules)) {
      return next(new ApiError(403, "Access denied"));
    }

    return next();
  };

const sendResolvedFile = (
  req: any,
  res: any,
  next: any,
  category: keyof typeof DOCUMENT_ROOTS,
  pathParts: string[],
) => {
  const rootDir = DOCUMENT_ROOTS[category];
  const resolvedPath = path.resolve(rootDir, ...pathParts);

  if (!resolvedPath.startsWith(rootDir)) {
    return next(new ApiError(400, "Invalid file path"));
  }

  if (!fs.existsSync(resolvedPath)) {
    return next(new ApiError(404, "Document not found"));
  }

  return res.sendFile(resolvedPath);
};

const authorizeReceiptOwnership = async (req: any, _res: any, next: any) => {
  const receipt = await ReceiptModel.findOne({
    pdfUrl: {
      $in: buildDocumentCandidates("receipts", [req.params.fileName]),
    },
  })
    .select("schoolId studentId")
    .lean();

  if (!receipt) {
    throw new ApiError(404, "Receipt not found");
  }

  if (String(receipt.schoolId) !== String(req.user.schoolId)) {
    throw new ApiError(403, "Access denied");
  }

  const role = String(req.user.role || "").toUpperCase();
  if (role === "SCHOOL_ADMIN") {
    return next();
  }

  const student = await StudentModel.findById(receipt.studentId)
    .select("_id userId parentPhone parentUserId schoolId")
    .lean();

  if (!student || String(student.schoolId) !== String(req.user.schoolId)) {
    throw new ApiError(403, "Access denied");
  }

  const phoneMatches = getPhoneVariants(req.user.phone);
  const hasAccess =
    String(student.userId || "") === String(req.user.id || "") ||
    String(student.parentUserId || "") === String(req.user.id || "") ||
    phoneMatches.includes(String(student.parentPhone || ""));

  if (!hasAccess) {
    throw new ApiError(403, "Access denied");
  }

  return next();
};

const authorizeAdmitCardOwnership = async (req: any, _res: any, next: any) => {
  const card = await AdmitCardModel.findOne({
    pdfUrl: {
      $in: buildDocumentCandidates("admit-cards", [req.params.fileName]),
    },
  })
    .select("schoolId studentId")
    .lean();

  if (!card) {
    throw new ApiError(404, "Admit card not found");
  }

  if (String(card.schoolId) !== String(req.user.schoolId)) {
    throw new ApiError(403, "Access denied");
  }

  const role = String(req.user.role || "").toUpperCase();
  if (role === "SCHOOL_ADMIN") {
    return next();
  }

  const student = await StudentModel.findById(card.studentId)
    .select("_id userId parentPhone parentUserId schoolId")
    .lean();

  if (!student || String(student.schoolId) !== String(req.user.schoolId)) {
    throw new ApiError(403, "Access denied");
  }

  const phoneMatches = getPhoneVariants(req.user.phone);
  const hasAccess =
    String(student.userId || "") === String(req.user.id || "") ||
    String(student.parentUserId || "") === String(req.user.id || "") ||
    phoneMatches.includes(String(student.parentPhone || ""));

  if (!hasAccess) {
    throw new ApiError(403, "Access denied");
  }

  return next();
};

router.get(
  "/receipts/:fileName",
  documentAuth,
  authorizeDocumentRole(["SCHOOL_ADMIN", "PARENT", "STUDENT"]),
  authorizeReceiptOwnership,
  (req, res, next) =>
    sendResolvedFile(req, res, next, "receipts", [req.params.fileName]),
);

router.get(
  "/admit-cards/previews/:fileName",
  documentAuth,
  authorizeDocumentRole(["SCHOOL_ADMIN"]),
  (req, res, next) =>
    sendResolvedFile(req, res, next, "admit-cards", [
      "previews",
      req.params.fileName,
    ]),
);

router.get(
  "/admit-cards/:fileName",
  documentAuth,
  authorizeDocumentRole(["SCHOOL_ADMIN", "PARENT", "STUDENT"]),
  authorizeAdmitCardOwnership,
  (req, res, next) =>
    sendResolvedFile(req, res, next, "admit-cards", [req.params.fileName]),
);

router.get(
  "/marks-cards/previews/:fileName",
  documentAuth,
  authorizeDocumentRole(["SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"]),
  (req, res, next) =>
    sendResolvedFile(req, res, next, "marks-cards", [
      "previews",
      req.params.fileName,
    ]),
);

router.get(
  "/marks-cards/:fileName",
  documentAuth,
  authorizeDocumentRole(["SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"]),
  (req, res, next) =>
    sendResolvedFile(req, res, next, "marks-cards", [req.params.fileName]),
);

export default router;
