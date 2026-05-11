export interface JwtPayload {
  _id?: string;
  id: string;
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "REVIEWER";
  schoolId: string;
  academicYearId: string;

  teacherId?: string;
  classId?: string;
  sectionId?: string;
  phone?: string;
  studentId?: string;
  accessModules?: Array<"parent" | "teacher">;
}
