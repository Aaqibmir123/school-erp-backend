import multer from "multer";

// ✅ GENERIC UPLOAD
export const uploadFile = (_folderName: string) =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });
