import XLSX from "xlsx";

export const parseStudentExcel = (fileBuffer: Buffer) => {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });

  const worksheet =
    workbook.Sheets["Students"] || workbook.Sheets[workbook.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json(worksheet);

  return rows;
};
