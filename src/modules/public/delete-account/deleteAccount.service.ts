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
  return DeleteAccountRequest.create({
    fullName: input.fullName.trim(),
    ipAddress: input.ipAddress || "",
    reason: input.reason.trim(),
    registeredPhoneNumber: input.registeredPhoneNumber.trim(),
    role: input.role.trim(),
    schoolName: input.schoolName.trim(),
    source: input.source || "web",
    userAgent: input.userAgent || "",
  });
};

