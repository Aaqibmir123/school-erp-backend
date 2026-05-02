import { sendEmail } from "../../../utils/email";
import { env } from "../../../config/env";
import { DeleteAccountRequest } from "./deleteAccount.model";

export type CreateDeleteAccountRequestInput = {
  fullName: string;
  ipAddress?: string;
  reason: string;
  registeredPhoneNumber: string;
  role: string;
  schoolName: string;
  source?: string;
  userAgent?: string;
};

export const createDeleteAccountRequest = async (
  input: CreateDeleteAccountRequestInput,
) => {
  const payload = {
    fullName: input.fullName.trim(),
    ipAddress: input.ipAddress || "",
    reason: input.reason.trim(),
    registeredPhoneNumber: input.registeredPhoneNumber.trim(),
    role: input.role.trim(),
    schoolName: input.schoolName.trim(),
    source: input.source || "web",
    userAgent: input.userAgent || "",
  };

  const supportEmail =
    env.DELETE_ACCOUNT_SUPPORT_EMAIL || env.EMAIL_USER;

  const emailHtml = `
    <h2>Delete account request</h2>
    <p><strong>Name:</strong> ${payload.fullName}</p>
    <p><strong>Phone:</strong> ${payload.registeredPhoneNumber}</p>
    <p><strong>School:</strong> ${payload.schoolName}</p>
    <p><strong>Role:</strong> ${payload.role}</p>
    <p><strong>Reason:</strong> ${payload.reason}</p>
    <p><strong>Source:</strong> ${payload.source}</p>
    <p><strong>User Agent:</strong> ${payload.userAgent}</p>
    <p><strong>IP Address:</strong> ${payload.ipAddress}</p>
  `;

  try {
    const request = await DeleteAccountRequest.create(payload);

    if (supportEmail) {
      await sendEmail(
        supportEmail,
        `Delete account request: ${payload.fullName}`,
        emailHtml,
      ).catch((error) => {
        console.error("Delete account notification email failed", error);
      });
    }

    return {
      requestId: request._id.toString(),
      storage: "database" as const,
    };
  } catch (error) {
    if (!supportEmail) {
      throw error;
    }

    await sendEmail(
      supportEmail,
      `Delete account request: ${payload.fullName}`,
      emailHtml,
    );

    return {
      requestId: `email-${Date.now()}`,
      storage: "email" as const,
    };
  }
};
