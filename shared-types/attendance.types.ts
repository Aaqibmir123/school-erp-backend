export type AttendanceStatus = "PRESENT" | "ABSENT";

export interface AttendanceStudentDTO {
  studentId: string;
  status: AttendanceStatus;
}

export interface CreateAttendanceDTO {
  classId: string;
  sectionId?: string;
  date: string;
  students: AttendanceStudentDTO[];
}

export interface MarkAttendancePayload {
  classId: string;
  sectionId?: string | null;
  periodId: string;
  date: string;
  subjectId: string;
  students: {
    studentId: string;
    status: "PRESENT" | "ABSENT";
  }[];
}

export interface AttendanceItem {
  _id: string;
  date: string;
  status: "PRESENT" | "ABSENT";
  subjectId: string;
}
