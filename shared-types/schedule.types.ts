export interface ISchedule {
  _id: string;

  schoolId: string;
  examId: string;
  classId: string;
  subjectId: string;
  sectionId?: { _id: string; name: string } | string | null;

  date: string;
  startTime: string;
  endTime: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface ICreateSchedule {
  examId: string;
  classId: string;
  subjectId: string;
  sectionId?: string;
  date: string;
  startTime: string;
  endTime: string;
}
