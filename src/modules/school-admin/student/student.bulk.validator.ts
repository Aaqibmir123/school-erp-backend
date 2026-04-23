export const validateStudentRow = (row: any) => {

  const errors: string[] = []

  if (!row.FirstName) errors.push("FirstName required")
  if (!row.ClassName) errors.push("ClassName required")
  if (!row.RollNumber) errors.push("RollNumber required")
  if (!row.ParentPhone) errors.push("ParentPhone required")

  return errors
}