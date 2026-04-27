export interface ApplySchoolDTO {
  schoolName: string;
  principalName: string;
  email: string;
  phone: string;
  address?: string;
  password: string;
}

export interface LoginDTO {
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginResponse {
  user: {
    _id: string;
    email: string;
    role: "SUPER_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT" | "STUDENT";
  };
  token: string;
  refreshToken?: string;
}
