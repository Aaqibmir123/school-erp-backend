export type FeeStatus = "pending" | "partial" | "paid";

export interface Fee {
  _id: string;
  studentName: string;

  title: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;

  dueDate: string;
  status: FeeStatus;

  admitCardUrl?: string;

  createdAt: string;
}