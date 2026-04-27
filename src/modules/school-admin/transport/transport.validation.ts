import { z } from "zod";

const transportVehicleTypeSchema = z.enum([
  "bus",
  "van",
  "car",
  "mini-bus",
  "other",
]);

const transportSalaryStatusSchema = z.enum(["paid", "partial", "pending"]);

const transportStatusSchema = z.enum(["active", "inactive"]);

const phoneSchema = z
  .string()
  .trim()
  .min(7, "Driver phone is required")
  .max(20, "Enter a valid phone number");

const transportBodySchema = z.object({
  routeName: z.string().trim().min(2, "Route name is required"),
  vehicleNumber: z.string().trim().min(2, "Vehicle number is required"),
  vehicleType: transportVehicleTypeSchema,
  capacity: z.coerce.number().int().min(1, "Capacity is required"),
  driverName: z.string().trim().min(2, "Driver name is required"),
  driverPhone: phoneSchema,
  driverSalary: z.coerce.number().min(0, "Driver salary is required"),
  salaryPaidAmount: z.coerce.number().min(0).default(0),
  salaryStatus: transportSalaryStatusSchema.default("pending"),
  status: transportStatusSchema.default("active"),
  notes: z.string().trim().optional().or(z.literal("")),
});

export const createTransportSchema = transportBodySchema;

export const updateTransportSchema = transportBodySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
