import { Request, Response } from "express";
import { createClasses, getClasses } from "./class.service";

export const createClassesController = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const result = await createClasses(req.user.schoolId, req.body);

  res.json({
    success: true,
    message: "Classes Created Successfully",
    data: result,
  });
};

export const getClassesController = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const classes = await getClasses(req.user.schoolId);

  res.json({
    success: true,
    data: classes,
  });
};
