export enum PeriodType {
  CLASS = "class",
  BREAK = "break",
  LUNCH = "lunch",
  ACTIVITY = "ACTIVITY",
}

export interface Period {
  _id: string;
  schoolId?: string;
  name: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  type: PeriodType;
}

export interface CreatePeriodDTO {
  name: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  type: PeriodType;
}
