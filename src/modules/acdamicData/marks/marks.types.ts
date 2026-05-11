export interface MarkItemInput {
  studentId: string;
  marks: number | null;
  feedback?: string;
}

export interface BulkMarksInput {
  examId: string;
  subjectId: string;
  classId: string;
  sectionId?: string | null;
  marks: MarkItemInput[];
}

export interface AuthUser {
  _id: string;
  schoolId: string;
}
