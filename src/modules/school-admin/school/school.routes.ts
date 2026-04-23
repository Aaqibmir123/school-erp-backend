import { Router } from "express";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { uploadFile } from "../../../middlewares/upload.middleware";
import { getSchool, saveSchool } from "./school.controller";

const router = Router();

const upload = uploadFile("school");

const multiUpload = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "signature", maxCount: 1 },
  { name: "seal", maxCount: 1 },
]);

router.get("/", authMiddleware, getSchool);
router.post("/", authMiddleware, multiUpload, saveSchool);

export default router;
