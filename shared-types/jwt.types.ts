export interface JwtPayload {
  id: string;
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  schoolId: string;
  academicYearId: string;

  teacherId?: string;
  classId?: string;
  sectionId?: string;
  phone?: string;
  studentId?: string;
}
