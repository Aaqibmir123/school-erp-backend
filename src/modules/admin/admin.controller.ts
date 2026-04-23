import { Request, Response } from "express"
import * as adminService from "./admin.service"

export const getPendingSchools = async (req: Request, res: Response) => {

  const schools = await adminService.getPendingSchools()

  res.json({
    success: true,
    data: schools
  })
}

export const approveSchool = async (
  req: Request<{ id: string }>,
  res: Response
) => {

  const school = await adminService.approveSchool(req.params.id)

  res.json({
    success: true,
    data: school
  })
}