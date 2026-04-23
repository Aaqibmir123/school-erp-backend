import FeeModel from "./Fee.model";

/* ================= UTILS ================= */

const calculateStatus = (total: number, paid: number) => {
  if (paid <= 0) return "unpaid";
  if (paid < total) return "partial";
  return "paid";
};

/* ================= CREATE ================= */

export const createFeeService = async (data: any) => {
  const totalAmount = Number(data.totalAmount);
  const paidAmount = Number(data.paidAmount || 0);

  // 🔥 BASIC VALIDATION
  if (!data.studentId) throw new Error("Student is required");
  if (!data.classId) throw new Error("Class is required");
  if (!data.feeType) throw new Error("Fee type is required");
  if (!totalAmount) throw new Error("Total amount is required");

  // 🔥 NEGATIVE CHECK
  if (totalAmount < 0 || paidAmount < 0) {
    throw new Error("Amount cannot be negative");
  }

  // 🔥 PAID > TOTAL
  if (paidAmount > totalAmount) {
    throw new Error("Paid amount cannot exceed total");
  }

  // 🔥 DUPLICATE CHECK (same student + month + type + year)
  const exists = await FeeModel.findOne({
    studentId: data.studentId,
    month: data.month,
    academicYearId: data.academicYearId,
    feeType: data.feeType,
  }).lean();

  if (exists) {
    throw new Error("Fee already exists for this month and type");
  }

  const remainingAmount = totalAmount - paidAmount;
  const status = calculateStatus(totalAmount, paidAmount);

  const fee = await FeeModel.create({
    ...data,
    totalAmount,
    paidAmount,
    remainingAmount,
    status,
  });

  return fee;
};

/* ================= UPDATE ================= */

export const updateFeeService = async (id: string, data: any) => {
  const totalAmount = Number(data.totalAmount);
  const paidAmount = Number(data.paidAmount);

  if (totalAmount < 0 || paidAmount < 0) {
    throw new Error("Amount cannot be negative");
  }

  if (paidAmount > totalAmount) {
    throw new Error("Invalid amount");
  }

  data.remainingAmount = totalAmount - paidAmount;
  data.status = calculateStatus(totalAmount, paidAmount);

  const updated = await FeeModel.findByIdAndUpdate(id, data, {
    returnDocument: "after",
  }).lean();

  if (!updated) {
    throw new Error("Fee not found");
  }

  return updated;
};

/* ================= DELETE ================= */

export const deleteFeeService = async (id: string) => {
  const deleted = await FeeModel.findByIdAndDelete(id);

  if (!deleted) {
    throw new Error("Fee not found");
  }

  return true;
};

/* ================= GET ================= */

export const getFeesByStudentService = async (studentId: string) => {
  return FeeModel.find({ studentId, isDeleted: { $ne: true } })
    .select(
      `
      month
      feeType
      totalAmount
      paidAmount
      remainingAmount
      status
      paidDate
      receiptId
    `,
    )
    .populate("receiptId", "pdfUrl")
    .sort({ createdAt: -1 })
    .lean();
};
