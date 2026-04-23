import { Request, Response } from "express";
import * as schoolService from "./school.service";

export const getSchool = async (req: Request, res: Response) => {
  try {
    const school = await schoolService.getSchoolProfile();
    res.json(school);
  } catch (err) {
    res.status(500).json({ message: "Error fetching school" });
  }
};

// 🔥 helper function
const cleanPath = (filePath: string) => {
  return filePath.split("uploads")[1].replace(/\\/g, "/");
};

export const saveSchool = async (req: Request, res: Response) => {
  try {
    const { name, address } = req.body;

    const files = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    const data: any = {
      name,
      address,
      schoolId: req?.user?.schoolId,
    };

    // 🔥 FIX PATHS HERE
    if (files?.logo) {
      data.logo = `/uploads${cleanPath(files.logo[0].path)}`;
    }

    if (files?.signature) {
      data.signature = `/uploads${cleanPath(files.signature[0].path)}`;
    }

    if (files?.seal) {
      data.seal = `/uploads${cleanPath(files.seal[0].path)}`;
    }

    const school = await schoolService.upsertSchoolProfile(
      req.user.schoolId,
      data,
    );

    res.json(school);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error saving school" });
  }
};
