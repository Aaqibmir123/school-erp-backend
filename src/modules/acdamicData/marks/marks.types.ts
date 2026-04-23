export interface MarkItemInput {
  studentId: string;
  marks: number | null;
}

export interface BulkMarksInput {
  examId: string;
  subjectId: string;
  classId: string;
  marks: MarkItemInput[];
}

export interface AuthUser {
  _id: string;
  schoolId: string;
}
