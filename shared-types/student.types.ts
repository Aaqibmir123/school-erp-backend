export interface Student {
  _id: string;

  schoolId: string;
  academicYearId: string;

  firstName: string;
  lastName?: string;
  gender: "male" | "female" | "other";

  classId: string;
  sectionId?: string;

  dateOfBirth?: string;
  admissionDate?: string;

  rollNumber: number;

  fatherName: string;
  motherName?: string;
  parentPhone: string;

  address?: string;

  createdAt: string;
}

// ================== CREATE ==================

export interface CreateStudentDTO {
  firstName: string;
  lastName?: string;

  gender: "male" | "female";

  dateOfBirth?: string;
  admissionDate?: string;

  classId: string;
  sectionId?: string;

  rollNumber: number;

  fatherName: string;
  motherName?: string;

  parentPhone: string;
  address?: string;
}

// ================== LIST PARAMS ==================

export interface GetStudentsParams {
  page?: number;
  limit?: number;
  search?: string;
  classId?: string;
}

// ================== LIST RESPONSE ==================

export interface GetStudentsResponse {
  success: boolean;
  data: Student[];
  total: number;
  students: Student[];
}

// ================== BULK ==================

export interface StudentBulkTemplateRow {
  FirstName: string;
  LastName: string;
  Gender: "male" | "female" | "other";
  ClassName: string;
  SectionName: string;
  RollNumber: number;
  FatherName: string;
  ParentPhone: string;
}

export interface BulkImportResponse {
  success: boolean;
  message: string;
  inserted: number;
  failed: number;
  errors: any[];
}

export interface PreviewError {
  row: number;
  message: string;
}

export interface PreviewStudentsResponse {
  success: boolean;
  students: StudentBulkTemplateRow[];
  errors: PreviewError[];
  preview: StudentBulkTemplateRow[];
}

// ================== LIGHT DTO ==================

export interface StudentDTO {
  _id: string;
  name: string;
  rollNumber: number;
}

export interface StudentPopulated {
  _id: string;

  firstName: string;
  lastName?: string;

  gender: "male" | "female" | "other";

  dateOfBirth?: string;
  admissionDate?: string;

  classId: {
    _id: string;
    name: string;
  };

  sectionId?: {
    _id: string;
    name: string;
  };

  rollNumber: number;
  parentPhone: string;
}
