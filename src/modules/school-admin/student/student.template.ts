import XLSX from "xlsx";

export const generateStudentTemplate = () => {
  const data = [
    {
      FirstName: "Mir",
      LastName: "Aaqib",
      Gender: "male",
      ClassName: "LKG",
      SectionName: "A",
      RollNumber: 1,
      FatherName: "Bashir Ahmad",
      ParentPhone: "9596523404",
      AdmissionDate: "2026-04-01",
      Address: "Kupwara",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);

  // COLUMN WIDTH FIX
  worksheet["!cols"] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return buffer;
};