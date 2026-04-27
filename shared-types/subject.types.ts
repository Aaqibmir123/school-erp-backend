export interface Subject {
  _id: string;
  name: string;
}

export interface ClassSubjects {
  classId: string;
  className: string;
  subjects: Subject[];
}

export interface ISubject {
  _id: string;
  name: string;
}

export interface IClassSubjects {
  classId: string;
  className: string;
  subjects: ISubject[];
}
