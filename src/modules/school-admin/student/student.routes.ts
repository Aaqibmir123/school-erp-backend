import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import * as bulkController from "./student.bulk.controller";
import * as controller from "./student.controller";

const router = Router();

const upload = multer({ dest: "uploads/" });

router.post("/", authMiddleware, controller.createStudent);

router.get("/", authMiddleware, controller.getStudents);

router.get("/template", authMiddleware, controller.downloadStudentTemplate);

/* BULK PREVIEW */

router.post(
  "/bulk-preview",
  authMiddleware,
  upload.single("file"),
  bulkController.previewStudentBulk,
);

/* BULK IMPORT */

router.post("/bulk-import", authMiddleware, bulkController.bulkImportStudents);

router.get("/by-class", authMiddleware, controller.getStudentsByClass);

router.put("/:id", authMiddleware, controller.updateStudent);
router.delete("/:id", authMiddleware, controller.deleteStudent);
router.get("/students/all", authMiddleware, controller.getAllStudentsByClass);

export default router;
