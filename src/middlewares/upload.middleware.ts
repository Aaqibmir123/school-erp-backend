import type { RequestHandler } from "express";

/**
 * Temporary Hostinger-safe placeholder.
 *
 * Upload handling is disabled for now so the backend can boot cleanly while we
 * fix the rest of the runtime issues. Restore the real multer-based middleware
 * after deployment stabilizes.
 */
export const uploadFile = (_folderName: string): RequestHandler => {
  return (_req, _res, next) => next();
};
