import axios from "axios";
import crypto from "crypto";

import { env } from "../../config/env";

const TWO_FACTOR_BASE_URL = (env.TWO_FACTOR_BASE_URL || "https://2factor.in/API/V1").replace(
  /\/$/,
  "",
);

const buildOtpUrl = (phone: string, otp: string) =>
  `${TWO_FACTOR_BASE_URL}/${env.TWO_FACTOR_API_KEY}/SMS/${phone}/${otp}`;

const buildVerifyUrl = (sessionId: string, otp: string) =>
  `${TWO_FACTOR_BASE_URL}/${env.TWO_FACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${otp}`;

export const normalizeIndianPhone = (phone: string) => {
  const digits = String(phone || "")
    .replace(/\D/g, "")
    .slice(-10);

  if (!/^[6-9]\d{9}$/.test(digits)) {
    throw new Error("Enter a valid Indian mobile number");
  }

  return digits;
};

export const generateOtpCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

export const hashOtpCode = (sessionId: string, otp: string) =>
  crypto
    .createHash("sha256")
    .update(`${sessionId}:${otp}`)
    .digest("hex");

const extractSessionId = (response: any) =>
  String(
    response?.Details ||
      response?.details ||
      response?.SessionId ||
      response?.sessionId ||
      response?.session_id ||
      response?.Id ||
      response?.id ||
      "",
  ).trim() || null;

const isVerifiedResponse = (payload: any) => {
  const status = String(payload?.Status || payload?.status || "").toLowerCase();
  const details = String(
    payload?.Details || payload?.details || payload?.Message || payload?.message || "",
  ).toLowerCase();

  return (
    status === "success" ||
    details.includes("otp matched") ||
    details.includes("verified") ||
    details.includes("success")
  );
};

export const sendOtpVia2Factor = async (phone: string, otp: string) => {
  const attempts = [
    () => axios.post(buildOtpUrl(phone, otp), null, { timeout: 10000 }),
    () => axios.get(buildOtpUrl(phone, otp), { timeout: 10000 }),
  ];

  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      const response = await attempt();

      return {
        providerResponse: response.data,
        providerSessionId: extractSessionId(response.data),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to send OTP via 2Factor");
};

export const verifyOtpVia2Factor = async (sessionId: string, otp: string) => {
  const urls = [
    { method: "post" as const, url: buildVerifyUrl(sessionId, otp) },
    { method: "get" as const, url: buildVerifyUrl(sessionId, otp) },
  ];

  for (const item of urls) {
    try {
      const response =
        item.method === "post"
          ? await axios.post(item.url, null, { timeout: 10000 })
          : await axios.get(item.url, { timeout: 10000 });

      if (isVerifiedResponse(response.data)) {
        return true;
      }
    } catch {
      // Try the next fallback / local verification in the service layer.
    }
  }

  return false;
};
