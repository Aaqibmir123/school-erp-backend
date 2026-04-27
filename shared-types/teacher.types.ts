export interface CreateTeacherDTO {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender?: string;
  dateOfBirth?: string;
  employeeId?: string;
  qualification?: string;
  experience?: number;
  joiningDate?: string;
  address?: string;
  profileImage?: string;
  _id: string;
}

export interface TeacherClass {
  classId: string;
  className: string;

  sectionId: string;
  sectionName: string;

  subjectId: string;
  subjectName: string;
}

export interface ITeacher {
  _id: string;
  firstName: string;
  lastName: string;
}
