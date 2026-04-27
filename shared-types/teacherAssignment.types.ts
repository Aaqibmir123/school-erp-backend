export interface TeacherAssignment {
  _id: string;

  teacherId: {
    _id: string;
    firstName: string;
    lastName: string;
  };

  subjectId: {
    _id: string;
    name: string;
  };

  classId: {
    _id: string;
    name: string;
  };

  academicYearId: string;
}
export interface AssignSubjectPayload {
  teacherId: string;
  subjectId: string;
  classId: string;
  academicYearId: string;
}
