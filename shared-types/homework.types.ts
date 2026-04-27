/* ================= ENUMS ================= */

export type HomeworkStatus = "PENDING" | "SUBMITTED" | "CHECKED";

/* ================= BASE ================= */

export interface HomeworkBase {
  title: string;
  description?: string;
  classId?: string;
  sectionId?: string | null;
  subjectId?: string;
  dueDate: string;
  isGeneral?: boolean;
}

/* ================= CREATE ================= */

export type CreateHomeworkPayload = HomeworkBase;

/* ================= UPDATE ================= */

export type UpdateHomeworkPayload = Partial<HomeworkBase>;

/* ================= ENTITY ================= */

export interface Homework extends HomeworkBase {
  _id: string;

  // relations (optional depending backend)
  class?: {
    _id: string;
    name: string;
  };

  section?: {
    _id: string;
    name: string;
  };

  subject?: {
    _id: string;
    name: string;
  };

  createdAt: string;
  updatedAt: string;
}

/* ================= STUDENT VIEW ================= */

export interface StudentHomework extends Homework {
  status?: HomeworkStatus;
  marks?: number;
  feedback?: string;
}
