import { NextFunction, Request, Response } from "express";

import { successResponse } from "../../utils/apiResponse";
import * as authService from "./auth.service";

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

/* ================= SEND OTP ================= */
export const sendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await authService.sendOtp(req.body.phone);
    return successResponse(res, data, "OTP sent");
  } catch (error) {
    return next(error);
  }
};

/* ================= VERIFY OTP ================= */
export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await authService.verifyOtp(req.body.phone, req.body.otp);
    return successResponse(res, data, "Login successful");
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
    const data = await authService.setPassword(req.body.token, req.body.password);
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
    return successResponse(res, data, "Login successful");
  } catch (error) {
    return next(error);
  }
};
