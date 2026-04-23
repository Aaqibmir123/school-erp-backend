import XLSX from "xlsx";

export const parseStudentExcel = (filePath: string) => {
  const workbook = XLSX.readFile(filePath);

  const worksheet =
    workbook.Sheets["Students"] || workbook.Sheets[workbook.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json(worksheet);

  console.log("parsed rows", rows);

  return rows;
};
