import { ClassModel } from "../classes/class.model";
import FeeModel from "../Fee/Fee.model";
import { SectionModel } from "../sections/sections.model";
import { StudentModel } from "../student/student.model";
import { School } from "../../school/school.model";
import { generateReceiptPDF } from "./pdf.service";
import ReceiptModel from "./receipt.model";

/* ================= MAIN ================= */

export const generateReceiptService = async ({
  studentId,
  feeIds,
  schoolId,
  adminId,
}: any) => {
  if (!feeIds || !feeIds.length) {
    throw new Error("No fees selected");
  }

  /* ================= CHECK EXISTING ================= */

  const existingReceipt = await ReceiptModel.findOne({
    schoolId,
    feeIds: { $in: feeIds },
  });

  if (existingReceipt) {
    return existingReceipt; // ✅ avoid duplicate
  }

  /* ================= FETCH FEES ================= */

  const fees = await FeeModel.find({
    _id: { $in: feeIds },
    isDeleted: { $ne: true },
  })
    .select("studentId schoolId totalAmount paidAmount feeType month")
    .lean();

  if (!fees.length) {
    throw new Error("Fees not found");
  }

  /* ================= VALIDATE STUDENT ================= */

  for (const f of fees) {
    if (f.studentId.toString() !== studentId) {
      throw new Error("Fee student mismatch");
    }

    if (f.schoolId?.toString?.() !== String(schoolId)) {
      throw new Error("Fee school mismatch");
    }
  }

  /* ================= FETCH STUDENT ================= */

  const student = await StudentModel.findById(studentId).lean();

  if (!student) {
    throw new Error("Student not found");
  }

  const school = await School.findById(schoolId)
    .select("schoolName address")
    .lean();

  if (!school) {
    throw new Error("School not found");
  }

  const studentName = `${student.firstName} ${student.lastName}`;

  /* ================= FETCH CLASS ================= */

  const classData = await ClassModel.findById(student.classId).lean();

  /* ================= FETCH SECTION ================= */

  let sectionData = null;

  if (student.sectionId) {
    sectionData = await SectionModel.findById(student.sectionId).lean();
  }

  /* ================= CALCULATE ================= */

  let totalAmount = 0;
  let paidAmount = 0;

  for (const f of fees) {
    totalAmount += f.totalAmount;
    paidAmount += f.paidAmount;
  }

  const remainingAmount = totalAmount - paidAmount;

  /* ================= CREATE RECEIPT ================= */

  const receiptNumber = `RCPT-${Date.now()}`;

  const receipt = await ReceiptModel.create({
    receiptNumber,
    schoolId,
    studentId,
    feeIds,
    totalAmount,
    paidAmount,
    createdBy: adminId,
  });

  /* ================= PDF DATA ================= */

  const pdfData = {
    receiptNumber,

    schoolName: school.schoolName || "School",
    schoolAddress: school.address || "N/A",

    studentName,
    fatherName: student.fatherName || "N/A",
    rollNumber: student.rollNumber ?? "N/A",
    address: student.address || "N/A",

    className: classData?.name || "N/A",
    sectionName: sectionData?.name || "-",

    date: new Date().toLocaleDateString(),

    fees: fees.map((f) => ({
      feeType: f.feeType,
      month: f.month,
      totalAmount: f.totalAmount,
      paidAmount: f.paidAmount,
      remainingAmount: f.totalAmount - f.paidAmount,
    })),

    totalAmount,
    paidAmount,
    remainingAmount,
  };

  /* ================= GENERATE PDF ================= */

  const pdfUrl = await generateReceiptPDF(pdfData);

  receipt.pdfUrl = pdfUrl;
  await receipt.save();

  /* ================= LINK FEES ================= */

  await FeeModel.updateMany(
    { _id: { $in: feeIds } },
    { receiptId: receipt._id },
  );

  return receipt;
};
