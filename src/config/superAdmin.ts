import { env } from "./env";

// WHY: Super admin access must be configured from secrets/env so it never has
// to live in source control or be hardcoded into the auth flow.
export const SUPER_ADMIN_PHONE = String(env.SUPER_ADMIN_PHONE || "")
  .replace(/\D/g, "")
  .slice(-10);
export const SUPER_ADMIN_PASSWORD = String(env.SUPER_ADMIN_PASSWORD || "").trim();
