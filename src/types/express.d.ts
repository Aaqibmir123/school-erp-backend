import { JwtPayload } from "../../shared-types/jwt.types";
import type { UploadedFile } from "./upload.types";

declare global {
  namespace Express {
    interface Request {
      file?: UploadedFile;
      files?: Record<string, UploadedFile[]> | UploadedFile[];
      user: JwtPayload & {
        accessModules?: string[];
      };
    }
  }
}
