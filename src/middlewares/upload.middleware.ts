import fs from "fs";
import multer from "multer";
import path from "path";

const baseUploadPath = path.join(__dirname, "../../uploads");

fs.mkdirSync(baseUploadPath, { recursive: true });

const createStorage = (folderName: string) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(baseUploadPath, folderName);
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
      const uniqueName =
        Date.now() + "-" + file.originalname.replace(/\s/g, "_");
      cb(null, uniqueName);
    },
  });

// ✅ GENERIC UPLOAD
export const uploadFile = (folderName: string) =>
  multer({
    storage: createStorage(folderName),
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });
