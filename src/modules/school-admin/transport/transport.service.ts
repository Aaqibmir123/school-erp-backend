import { Types } from "mongoose";

import { TransportModel } from "./transport.model";

type TransportPayload = {
  capacity?: number;
  driverName?: string;
  driverPhone?: string;
  driverSalary?: number;
  notes?: string;
  routeName?: string;
  salaryPaidAmount?: number;
  salaryStatus?: "paid" | "partial" | "pending";
  status?: "active" | "inactive";
  vehicleNumber?: string;
  vehicleType?: "bus" | "van" | "car" | "mini-bus" | "other";
};

export const createTransportService = async (
  schoolId: string,
  payload: TransportPayload,
) => {
  return TransportModel.create({
    ...payload,
    schoolId: new Types.ObjectId(schoolId),
  });
};

export const listTransportService = async (schoolId: string) => {
  return TransportModel.find({ schoolId })
    .sort({ createdAt: -1 })
    .lean();
};

export const updateTransportService = async (
  schoolId: string,
  transportId: string,
  payload: TransportPayload,
) => {
  return TransportModel.findOneAndUpdate(
    { _id: transportId, schoolId },
    payload,
    {
      new: true,
      runValidators: true,
    },
  );
};

export const deleteTransportService = async (
  schoolId: string,
  transportId: string,
) => {
  return TransportModel.findOneAndDelete({ _id: transportId, schoolId });
};
