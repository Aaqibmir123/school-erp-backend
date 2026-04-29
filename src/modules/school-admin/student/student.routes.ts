import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { roleMiddleware } from "../../../middlewares/role.middleware";
import { uploadFile } from "../../../middlewares/upload.middleware";
import * as bulkController from "./student.bulk.controller";
import * as controller from "./student.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post(
  "/",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  controller.createStudent,
);

router.get("/", authMiddleware, roleMiddleware("SCHOOL_ADMIN"), controller.getStudents);
router.get(
  "/template",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  controller.downloadStudentTemplate,
);
router.get("/:id", authMiddleware, roleMiddleware("SCHOOL_ADMIN"), controller.getStudentById);

/* BULK PREVIEW */

router.post(
  "/bulk-preview",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  upload.single("file"),
  bulkController.previewStudentBulk,
);

/* BULK IMPORT */

router.post(
  "/bulk-import",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  bulkController.bulkImportStudents,
);

router.get("/by-class", authMiddleware, roleMiddleware("SCHOOL_ADMIN"), controller.getStudentsByClass);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN", "PARENT"),
  uploadFile("students").single("profileImage"),
  controller.updateStudent,
);
router.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  controller.updateStudentStatus,
);
router.delete("/:id", authMiddleware, roleMiddleware("SCHOOL_ADMIN"), controller.deleteStudent);
router.get(
  "/students/all",
  authMiddleware,
  roleMiddleware("SCHOOL_ADMIN"),
  controller.getAllStudentsByClass,
);

export default router;
