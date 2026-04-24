import { env } from "./env";

// WHY: Super admin access must be configured from secrets/env so it never has
// to live in source control or be hardcoded into the auth flow.
export const SUPER_ADMIN_PHONE = env.SUPER_ADMIN_PHONE;
export const SUPER_ADMIN_PASSWORD = env.SUPER_ADMIN_PASSWORD;
