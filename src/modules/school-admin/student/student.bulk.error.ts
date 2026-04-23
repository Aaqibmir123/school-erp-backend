import XLSX from "xlsx"

export const generateErrorExcel = (errors: any[]) => {

  const rows = errors.map((e) => ({
    Row: e.row,
    Error: e.message,
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)

  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, worksheet, "Errors")

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  })

  return buffer
}