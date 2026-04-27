export type SchoolClass =
  | "Nursery"
  | "LKG"
  | "UKG"
  | "1st"
  | "2nd"
  | "3rd"
  | "4th"
  | "5th"
  | "6th"
  | "7th"
  | "8th"
  | "9th"
  | "10th";

export interface IClass {
  _id: string;
  name: SchoolClass;
  order: number;
}

export interface CreateClassesDTO {
  classes: SchoolClass[];
}

export interface ClassResponse {
  _id: string;
  name: SchoolClass;
  order: number;
  sections: any;
}
