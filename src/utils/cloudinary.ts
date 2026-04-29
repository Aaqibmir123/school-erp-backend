import type { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

import { env } from "../config/env";

let cloudinaryConfigured = false;

const ensureCloudinaryConfigured = () => {
  if (cloudinaryConfigured) return;

  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  cloudinaryConfigured = true;
};

const inferResourceType = (mimeType?: string) => {
  if (!mimeType) return "auto";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "raw";
};

export const uploadBufferToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
) => {
  if (!file?.buffer?.length) {
    throw new Error("Upload file buffer is missing");
  }

  ensureCloudinaryConfigured();

  const publicIdBase = file.originalname
    ? file.originalname.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_")
    : `upload_${Date.now()}`;

  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `school-erp/${folder}`,
        public_id: `${Date.now()}-${publicIdBase}`,
        resource_type: inferResourceType(file.mimetype),
      },
      (
        error: UploadApiErrorResponse | undefined,
        result: UploadApiResponse | undefined,
      ) => {
        if (error || !result?.secure_url) {
          reject(error || new Error("Cloudinary upload failed"));
          return;
        }

        resolve(result.secure_url);
      },
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });
};
