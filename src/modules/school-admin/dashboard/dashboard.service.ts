import dayjs from "dayjs";
import { Types } from "mongoose";

import { ClassModel } from "../classes/class.model";
import { SectionModel } from "../sections/sections.model";
import { StudentModel } from "../student/student.model";
import { SubjectModel } from "../subjects/subjects.model";
import { TeacherModel } from "../teacher/teacher.model";
import { TransportModel } from "../transport/transport.model";
import FeeModel from "../Fee/Fee.model";

const MONTH_ORDER = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const normalizeMonth = (month?: string) => {
  if (!month) return "";

  const trimmed = month.trim();
  const short = trimmed.slice(0, 3).toLowerCase();
  const match = MONTH_ORDER.find(
    (entry) => entry.toLowerCase() === short || entry.toLowerCase() === trimmed.toLowerCase(),
  );

  return match || trimmed;
};

export const getDashboardSummaryService = async (schoolId: string) => {
  const schoolObjectId = new Types.ObjectId(schoolId);

  const [
    studentCount,
    teacherCount,
    classCount,
    sectionCount,
    subjectCount,
    transportCount,
    activeTransportCount,
    feeAggregate,
    monthlyFees,
    transports,
  ] = await Promise.all([
    StudentModel.countDocuments({ schoolId: schoolObjectId }),
    TeacherModel.countDocuments({ schoolId: schoolObjectId }),
    ClassModel.countDocuments({ schoolId: schoolObjectId }),
    SectionModel.countDocuments({ schoolId: schoolObjectId }),
    SubjectModel.countDocuments({ schoolId: schoolObjectId }),
    TransportModel.countDocuments({ schoolId: schoolObjectId }),
    TransportModel.countDocuments({
      schoolId: schoolObjectId,
      status: "active",
    }),
    FeeModel.aggregate([
      {
        $match: {
          schoolId: schoolObjectId,
        },
      },
      {
        $group: {
          _id: null,
          collected: { $sum: "$paidAmount" },
          due: { $sum: "$remainingAmount" },
          total: { $sum: "$totalAmount" },
          paidCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "paid"] }, 1, 0],
            },
          },
          partialCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "partial"] }, 1, 0],
            },
          },
          unpaidCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "unpaid"] }, 1, 0],
            },
          },
        },
      },
    ]),
    FeeModel.aggregate([
      {
        $match: {
          schoolId: schoolObjectId,
        },
      },
      {
        $group: {
          _id: "$month",
          collected: { $sum: "$paidAmount" },
          due: { $sum: "$remainingAmount" },
        },
      },
    ]),
    TransportModel.find({ schoolId: schoolObjectId })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
  ]);

  const feeTotals = feeAggregate[0] || {
    collected: 0,
    due: 0,
    total: 0,
    paidCount: 0,
    partialCount: 0,
    unpaidCount: 0,
  };

  const monthMap = new Map<string, { collected: number; due: number }>();

  monthlyFees.forEach((entry: any) => {
    const month = normalizeMonth(entry._id);
    if (!month) return;

    monthMap.set(month, {
      collected: Number(entry.collected || 0),
      due: Number(entry.due || 0),
    });
  });

  const monthlyFeeTrend = MONTH_ORDER.map((month) => ({
    month,
    collected: monthMap.get(month)?.collected || 0,
    due: monthMap.get(month)?.due || 0,
  }));

  const transportStatusBreakdown = [
    {
      name: "Paid",
      value: transports.filter((item: any) => item.salaryStatus === "paid").length,
    },
    {
      name: "Partial",
      value: transports.filter((item: any) => item.salaryStatus === "partial").length,
    },
    {
      name: "Pending",
      value: transports.filter((item: any) => item.salaryStatus === "pending").length,
    },
  ];

  const transportSalaryTotals = transports.reduce(
    (acc: { paid: number; due: number; total: number }, item: any) => {
      const paid = Number(item.salaryPaidAmount || 0);
      const due = Number(item.salaryDueAmount || 0);
      const total = Number(item.driverSalary || 0);

      acc.paid += paid;
      acc.due += due;
      acc.total += total;

      return acc;
    },
    { paid: 0, due: 0, total: 0 },
  );

  return {
    counts: {
      students: studentCount,
      teachers: teacherCount,
      classes: classCount,
      sections: sectionCount,
      subjects: subjectCount,
      transports: transportCount,
      activeTransports: activeTransportCount,
    },
    finance: {
      collected: Number(feeTotals.collected || 0),
      due: Number(feeTotals.due || 0),
      total: Number(feeTotals.total || 0),
      paidCount: Number(feeTotals.paidCount || 0),
      partialCount: Number(feeTotals.partialCount || 0),
      unpaidCount: Number(feeTotals.unpaidCount || 0),
      teacherPayrollEstimate: teacherCount * 12000,
      transportSalaryPaid: transportSalaryTotals.paid,
      transportSalaryDue: transportSalaryTotals.due,
      transportSalaryTotal: transportSalaryTotals.total,
    },
    charts: {
      monthlyFeeTrend,
      transportStatusBreakdown,
      revenueMix: [
        {
          name: "Fee Collection",
          value: Number(feeTotals.collected || 0),
        },
        {
          name: "Teacher Payroll Estimate",
          value: teacherCount * 12000,
        },
        {
          name: "Transport Salary",
          value: transportSalaryTotals.total,
        },
      ],
    },
    recentTransports: transports,
    generatedAt: dayjs().toISOString(),
  };
};
