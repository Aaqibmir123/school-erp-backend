import mongoose, { Document, Schema, Types } from "mongoose";

export type TransportVehicleType = "bus" | "van" | "car" | "mini-bus" | "other";

export type TransportSalaryStatus = "paid" | "partial" | "pending";

export type TransportRecordStatus = "active" | "inactive";

export interface TransportDocument extends Document {
  schoolId: Types.ObjectId;
  routeName: string;
  vehicleNumber: string;
  vehicleType: TransportVehicleType;
  capacity: number;
  driverName: string;
  driverPhone: string;
  driverSalary: number;
  salaryPaidAmount: number;
  salaryDueAmount: number;
  salaryStatus: TransportSalaryStatus;
  salaryPaidDate: Date | null;
  status: TransportRecordStatus;
  notes?: string;
}

const transportSchema = new Schema<TransportDocument>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    routeName: { type: String, required: true, trim: true },
    vehicleNumber: { type: String, required: true, trim: true },
    vehicleType: {
      type: String,
      enum: ["bus", "van", "car", "mini-bus", "other"],
      default: "bus",
      required: true,
    },
    capacity: { type: Number, required: true, min: 1 },
    driverName: { type: String, required: true, trim: true },
    driverPhone: { type: String, required: true, trim: true },
    driverSalary: { type: Number, required: true, min: 0 },
    salaryPaidAmount: { type: Number, required: true, min: 0, default: 0 },
    salaryDueAmount: { type: Number, required: true, min: 0, default: 0 },
    salaryStatus: {
      type: String,
      enum: ["paid", "partial", "pending"],
      default: "pending",
      required: true,
    },
    salaryPaidDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

transportSchema.index(
  {
    schoolId: 1,
    vehicleNumber: 1,
  },
  { unique: true },
);

transportSchema.pre("save", function transportStatusNormalizer(
  this: TransportDocument,
) {
  const doc = this as TransportDocument;
  const salary = Number(doc.driverSalary || 0);
  const paid = Math.max(0, Number(doc.salaryPaidAmount || 0));

  doc.salaryPaidAmount = paid;
  doc.salaryDueAmount = Math.max(salary - paid, 0);

  if (paid <= 0) {
    doc.salaryStatus = "pending";
    doc.salaryPaidDate = null;
  } else if (paid < salary) {
    doc.salaryStatus = "partial";
    doc.salaryPaidDate = new Date();
  } else {
    doc.salaryStatus = "paid";
    doc.salaryPaidDate = new Date();
  }
});

export const TransportModel =
  mongoose.models.Transport ||
  mongoose.model<TransportDocument>("Transport", transportSchema);
