const path = require("path");
const multer = require("multer");

const DEFAULT_FILE_SIZE_LIMIT = 5 * 1024 * 1024;

const FILE_RULES: Record<
  string,
  { extensions: string[]; mimeTypes: string[] }
> = {
  school: {
    extensions: [".jpg", ".jpeg", ".png", ".svg", ".webp"],
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/svg+xml",
      "image/webp",
    ],
  },
  students: {
    extensions: [".jpg", ".jpeg", ".png", ".webp"],
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  teachers: {
    extensions: [".jpg", ".jpeg", ".png", ".webp"],
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  "student-bulk": {
    extensions: [".csv", ".xls", ".xlsx"],
    mimeTypes: [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  },
};

const normalizeExtension = (fileName: string) =>
  path.extname(fileName || "").toLowerCase();

const createFileFilter = (folderName: string): multer.Options["fileFilter"] => {
  const rules = FILE_RULES[folderName];

  if (!rules) {
    return (_req, _file, cb) => cb(null, true);
  }

  return (_req, file, cb) => {
    const extension = normalizeExtension(file.originalname);
    const mimeType = String(file.mimetype || "").toLowerCase();
    const extensionAllowed = rules.extensions.includes(extension);
    const mimeAllowed = rules.mimeTypes.includes(mimeType);

    if (!extensionAllowed || !mimeAllowed) {
      return cb(new Error("Unsupported file type"));
    }

    return cb(null, true);
  };
};

export const uploadFile = (folderName: string) =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: DEFAULT_FILE_SIZE_LIMIT,
    },
    fileFilter: createFileFilter(folderName),
  });
