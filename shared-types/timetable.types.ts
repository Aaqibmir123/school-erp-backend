export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export interface CreateTimetableDTO {
  classId: string;
  sectionId?: string;
  subjectId: string;
  teacherId: string;
  period: number;
  day: DayOfWeek;
}

export interface TimetableDocument extends CreateTimetableDTO {
  schoolId: string;
  academicYearId: string;
}

export interface TimetableItem {
  _id: string;
  day: DayOfWeek;
  subjectId: Subject;
  teacherId: Teacher;
  periodId: Period;
}

export interface Subject {
  _id: string;
  name: string;
}

export interface Teacher {
  _id: string;
  firstName: string;
  lastName: string;
}

export interface Period {
  _id: string;
  startTime: string;
  endTime: string;
  periodNumber: number;
}
export interface TimetableCell {
  _id: string;
  name: string;
  teacher: string;
  teacherId: string;
}
export interface ClassItem {
  _id: string;
  name: string;
}

export type TimetableGrid = Record<string, TimetableCell>;
