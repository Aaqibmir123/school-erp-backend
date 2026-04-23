import cors from "cors";
import express from "express";
import "module-alias/register";
import path from "path";

import { env } from "./config/env";
import { errorHandler } from "./middlewares/error.middleware";
import { ApiError } from "./utils/apiError";

/* ================= AUTH ================= */
import authRoutes from "./modules/auth/auth.routes";

/* ================= ADMIN ================= */
import adminRoutes from "./modules/admin/admin.routes";

/* ================= SCHOOL ADMIN ================= */
import academicYearRoutes from "./modules/academicYears/academicYear.routes";
import classRoutes from "./modules/school-admin/classes/class.routes";
import createExamsRoutesByAdmin from "./modules/school-admin/exams/exam.routes";
import feeAdminRoutes from "./modules/school-admin/Fee/fee.routes";
import periodRoutes from "./modules/school-admin/periods/period.routes";
import receiptRoutes from "./modules/school-admin/receipt/receipt.routes";
import examScheduleRoutesByAdmin from "./modules/school-admin/schedule/schedule.routes";
import schoolRoutes from "./modules/school-admin/school/school.routes";
import sectionRoutes from "./modules/school-admin/sections/sections.routes";
import studentRoutes from "./modules/school-admin/student/student.routes";
import subjectRoutes from "./modules/school-admin/subjects/subjects.routes";
import schoolAdminRoutes from "./modules/school-admin/teacher/teacher.routes";
import timeTableRoutes from "./modules/school-admin/timetable/timetable.routes";

/* ================= TEACHER ================= */
import midTermAttendanceRoutes from "./modules/acdamicData/attendance/attendance.routes";
import midTermMarksRoutes from "./modules/acdamicData/marks/marks.routes";
import teacherRoutes from "./modules/teacher/teacher.routes";
import teacherTimeTablesRoutes from "./teachers/timetable/teacher.routes";

/* ================= STUDENT ================= */
import studentSideRoutes from "./modules/students/student.route";

/* ================= ACADEMIC ================= */
import attendanceRoute from "./modules/attendance/attendance.routes";
import createExamRoutes from "./modules/exam/exam.routes";
import homeworkRoutes from "./modules/homework/homework.route";
import teacherResultRoutes from "./modules/result/result.routes";

const app = express();

/* ================= MIDDLEWARE ================= */

app.set("trust proxy", 1);
app.use(
  cors({
    origin: "*", // ✅ DEV MODE (production me restrict karna)
    credentials: true,
  }),
);
app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // WHY: Native mobile requests often have no Origin header, so we allow
      // origin-less requests while still enforcing the configured web origins.
      if (!origin) {
        return callback(null, true);
      }

      if (env.clientOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new ApiError(403, "CORS origin not allowed"));
    },
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use((_, res, next) => {
  // WHY: These headers add baseline hardening without pulling in another
  // dependency while we keep the middleware stack intentionally lightweight.
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

/* ================= STATIC FILES ================= */

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(
  "/receipts",
  express.static(path.join(process.cwd(), "public/receipts")),
);

/* ================= ROUTES ================= */

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/school-admin", schoolAdminRoutes);
app.use("/api/school-admin/classes", classRoutes);
app.use("/api/school-admin/sections", sectionRoutes);
app.use("/api/school-admin/subjects", subjectRoutes);
app.use("/api/school-admin/academic-years", academicYearRoutes);
app.use("/api/school-admin/periods", periodRoutes);
app.use("/api/school-admin/timetable", timeTableRoutes);
app.use("/api/school-admin/students", studentRoutes);
app.use("/api/school-admin", createExamsRoutesByAdmin);
app.use("/api/school-admin/schedule", examScheduleRoutesByAdmin);
app.use("/api/school", schoolRoutes);
app.use("/api/school-admin/fee", feeAdminRoutes);
app.use("/api/school-admin/fees", receiptRoutes);

app.use("/api/teacher", teacherRoutes);
app.use("/api/teacher", teacherTimeTablesRoutes);
app.use("/api/teacher/marks", midTermMarksRoutes);
app.use("/api/teacher/attendance", midTermAttendanceRoutes);

app.use("/api/student", studentSideRoutes);

app.use("/api/attendance", attendanceRoute);
app.use("/api/homework", homeworkRoutes);
app.use("/api/exam", createExamRoutes);
app.use("/api/result", teacherResultRoutes);

/* ================= ERROR HANDLER ================= */
app.use(errorHandler);

export default app;
