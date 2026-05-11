import { StudentModel } from "./student.model";
import { ClassModel } from "../classes/class.model";
import { SectionModel } from "../sections/sections.model";
import { User } from "../../user/user.model";

import { parseStudentExcel } from "./student.bulk.parser";
import { validateStudentRow } from "./student.bulk.validator";

const normalizePhone = (phone: string) =>
  phone.toString().replace(/\D/g, "").slice(-10);

/* ================= IMPORT SERVICE ================= */

export const importStudentBulkService = async (students: any[], user: any) => {
  const schoolId = user.schoolId;

  /* LOAD CLASSES */

  const classes = await ClassModel.find({ schoolId });

  const classMap: Record<string, any> = {};

  classes.forEach((c: any) => {
    const name = c.name.trim().toLowerCase();
    classMap[name] = c._id;
  });

  /* LOAD SECTIONS */

  const sections = await SectionModel.find({ schoolId });

  const sectionMap: Record<string, any> = {};

  sections.forEach((s: any) => {
    const sectionName = s.name.trim().toLowerCase();

    const key = `${s.classId.toString()}_${sectionName}`;

    sectionMap[key] = s._id;
  });

  /* EXISTING STUDENTS (DUPLICATE ROLL CHECK) */

  const existingStudents = await StudentModel.find({ schoolId });

  const rollSet = new Set(
    existingStudents.map(
      (s: any) => `${s.classId.toString()}_${s.sectionId}_${s.rollNumber}`,
    ),
  );

  /* ===== PARENT BATCHING ===== */

  const phones = [
    ...new Set(
      students
        .map((s) => normalizePhone(s.parentPhone || ""))
        .filter((p) => p),
    ),
  ];

  const existingParents = await User.find({
    phone: { $in: phones.flatMap((phone) => [phone, `0${phone}`]) },
  });

  const parentMap: Record<string, any> = {};

  existingParents.forEach((p: any) => {
    parentMap[p.phone] = p;
  });

  /* FIND NEW PARENTS */

  const newParents: any[] = [];

  phones.forEach((phone) => {
    if (!parentMap[phone]) {
      newParents.push({
        phone,
        role: "PARENT",
        schoolId,
      });
    }
  });

  /* CREATE NEW PARENTS */

  if (newParents.length) {
    const createdParents = await User.insertMany(newParents);

    createdParents.forEach((p: any) => {
      parentMap[p.phone] = p;
    });
  }

  /* ===== PREPARE STUDENTS ===== */

  const studentsToInsert: any[] = [];
  const errors: any[] = [];

  for (let i = 0; i < students.length; i++) {
    const row = students[i];

    const className = row.className?.trim().toLowerCase();

    const classId = classMap[className];

    if (!classId) {
      errors.push({
        row: i + 1,
        message: "Invalid class",
      });

      continue;
    }

    const sectionName = row.sectionName?.trim().toLowerCase();

    const sectionId =
      sectionMap[`${classId.toString()}_${sectionName}`] || null;

    if (row.sectionName && !sectionId) {
      errors.push({
        row: i + 1,
        message: "Invalid section",
      });

      continue;
    }

    const rollKey = `${classId.toString()}_${sectionId}_${row.rollNumber}`;

    if (rollSet.has(rollKey)) {
      errors.push({
        row: i + 1,
        message: "Duplicate roll number",
      });

      continue;
    }

    rollSet.add(rollKey);

    const parentUser = parentMap[row.parentPhone];

      studentsToInsert.push({
        schoolId,

      firstName: row.firstName,
      lastName: row.lastName,

      gender: row.gender,

      classId,
      sectionId,

      rollNumber: row.rollNumber,

      fatherName: row.fatherName,
      parentPhone: normalizePhone(row.parentPhone),

      parentUserId: parentUser?._id || null,
    });
  }

  /* INSERT STUDENTS */

  let inserted: any[] = [];

  if (studentsToInsert.length) {
    inserted = await StudentModel.insertMany(studentsToInsert, {
      ordered: false,
    });
  }

  return {
    inserted: inserted.length,
    failed: errors.length,
    errors,
  };
};

/* ================= PREVIEW SERVICE ================= */

export const previewStudentBulkService = async (fileBuffer: Buffer) => {
  const rows = parseStudentExcel(fileBuffer);

  const preview: any[] = [];
  const errors: any[] = [];

  rows.forEach((row: any, index: number) => {
    const validation = validateStudentRow(row);

    if (validation.length) {
      errors.push({
        row: index + 2,
        errors: validation,
      });
    }

    preview.push({
      firstName: row.FirstName || "",
      lastName: row.LastName || "",

      gender: row.Gender || "",

      className: row.ClassName || "",
      sectionName: row.SectionName || "",

      rollNumber: row.RollNumber || "",

      fatherName: row.FatherName || "",
      parentPhone: row.ParentPhone || "",
    });
  });

  return {
    preview,
    errors,
    totalRows: rows.length,
  };
};
