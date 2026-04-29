import { NextFunction, Request, Response } from "express";

import { ApiError } from "../../utils/apiError";
import { successResponse } from "../../utils/apiResponse";
import * as authService from "./auth.service";

const REFRESH_COOKIE_NAME = "school_erp_refresh_token";

const serializeCookie = (
  name: string,
  value: string,
  maxAgeSeconds: number,
) => {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite = isProduction ? "None" : "Lax";
  const secure = isProduction ? "; Secure" : "";

  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/api/auth",
    "HttpOnly",
    `SameSite=${sameSite}`,
    `Max-Age=${maxAgeSeconds}`,
    secure,
  ]
    .filter(Boolean)
    .join("; ");
};

const setRefreshCookie = (res: Response, refreshToken?: string) => {
  if (!refreshToken) return;

  res.setHeader(
    "Set-Cookie",
    serializeCookie(REFRESH_COOKIE_NAME, refreshToken, 60 * 60 * 24 * 30),
  );
};

const clearRefreshCookie = (res: Response) => {
  res.setHeader("Set-Cookie", serializeCookie(REFRESH_COOKIE_NAME, "", 0));
};

const readRefreshToken = (req: Request) => {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${REFRESH_COOKIE_NAME}=`));

  if (!match) return req.body.refreshToken as string | undefined;

  return decodeURIComponent(match.split("=").slice(1).join("="));
};

/* ================= CHECK USER ================= */
export const checkUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await authService.checkUser(req.body.phone);
    return successResponse(res, data, "User found");
  } catch (error) {
    return next(error);
  }
};


/* ================= PASSWORD LOGIN ================= */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await authService.login(req.body);
    setRefreshCookie(res, (data as any).refreshToken);
    return successResponse(res, data, "Login successful");
  } catch (error) {
    return next(error);
  }
};

/* ================= SET PASSWORD ================= */
export const setPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await authService.setPassword(
      req.body.token,
      req.body.password,
    );
    return successResponse(res, data, "Password updated");
  } catch (error) {
    return next(error);
  }
};

/* ================= APPLY SCHOOL ================= */
export const applySchool = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await authService.applySchool(req.body);
    return successResponse(res, data, "Application submitted", 201);
  } catch (error) {
    return next(error);
  }
};

/* ================= FIREBASE LOGIN ================= */
export const firebaseLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await authService.firebaseLoginService(req.body.idToken);
    setRefreshCookie(res, (data as any).refreshToken);
    return successResponse(res, data, "Login successful");
  } catch (error) {
    return next(error);
  }
};

/* ================= REFRESH SESSION ================= */
export const refreshSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const refreshToken = readRefreshToken(req);

    if (!refreshToken) {
      return next(new ApiError(401, "Refresh token missing"));
    }

    const data = await authService.refreshSession(refreshToken);
    setRefreshCookie(res, (data as any).refreshToken);
    return successResponse(res, data, "Session refreshed");
  } catch (error) {
    return next(error);
  }
};

/* ================= LOGOUT ================= */
export const logout = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    clearRefreshCookie(res);
    return successResponse(res, { loggedOut: true }, "Logged out");
  } catch (error) {
    return next(error);
  }
};

