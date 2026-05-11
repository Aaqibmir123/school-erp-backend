import multer from "multer";

// ✅ GENERIC UPLOAD
export const uploadFile = (_folderName: string) =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: DEFAULT_FILE_SIZE_LIMIT,
    },
    fileFilter: createFileFilter(folderName),
  });
