export interface IExam {
  _id: string;
  name: string;
  examType: string;
  totalMarks: number;
  isPublished?: boolean;
  startDate: string;
  endDate: string;
  academicYearId?: string;
}

export interface ICreateExam {
  name: string;
  examType: string;
  totalMarks: number;
  startDate: string;
  endDate: string;
}
