import { Request, Response } from "express";
import * as schoolService from "./school.service";

export const getSchool = async (req: Request, res: Response) => {
  try {
    const school = await schoolService.getSchoolProfile(req.user.schoolId);
    res.json(school);
  } catch {
    res.status(500).json({ message: "Error fetching school" });
  }
};

// 🔥 helper function
const cleanPath = (filePath: string) => {
  return filePath.split("uploads")[1].replace(/\\/g, "/");
};

const isValidTime = (value?: string) =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(value || "");

const toMinutes = (value?: string) => {
  if (!isValidTime(value)) return null;
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
};

const validateTimeOrder = (data: {
  checkInOpenTime?: string;
  schoolStartTime?: string;
  lateMarkAfterTime?: string;
  checkInCloseTime?: string;
  schoolEndTime?: string;
  checkOutCloseTime?: string;
}) => {
  const sequence = [
    ["Check-in opens", data.checkInOpenTime],
    ["School starts", data.schoolStartTime],
    ["Late mark after", data.lateMarkAfterTime],
    ["Check-in closes", data.checkInCloseTime],
    ["School ends", data.schoolEndTime],
    ["Check-out closes", data.checkOutCloseTime],
  ] as const;

  for (const [label, time] of sequence) {
    if (!isValidTime(time)) {
      throw new Error(`${label} must use HH:mm format`);
    }
  }

  const open = toMinutes(data.checkInOpenTime);
  const start = toMinutes(data.schoolStartTime);
  const late = toMinutes(data.lateMarkAfterTime);
  const closeIn = toMinutes(data.checkInCloseTime);
  const end = toMinutes(data.schoolEndTime);
  const closeOut = toMinutes(data.checkOutCloseTime);

  if (
    open === null ||
    start === null ||
    late === null ||
    closeIn === null ||
    end === null ||
    closeOut === null
  ) {
    throw new Error("Please fill all school time settings");
  }

  if (!(open <= start && start <= late && late <= closeIn && closeIn <= end && end <= closeOut)) {
    throw new Error("Please keep the time order from check-in to check-out");
  }
};

export const saveSchool = async (req: Request, res: Response) => {
  try {
    const {
      name,
      address,
      checkInOpenTime,
      schoolStartTime,
      lateMarkAfterTime,
      checkInCloseTime,
      schoolEndTime,
      checkOutCloseTime,
      workingDays,
    } = req.body;

    validateTimeOrder({
      checkInOpenTime,
      schoolStartTime,
      lateMarkAfterTime,
      checkInCloseTime,
      schoolEndTime,
      checkOutCloseTime,
    });

    const files = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    const data: any = {
      name,
      address,
      schoolId: req?.user?.schoolId,
      checkInOpenTime,
      schoolStartTime,
      lateMarkAfterTime,
      checkInCloseTime,
      schoolEndTime,
      checkOutCloseTime,
      workingDays: typeof workingDays === "string"
        ? (() => {
            try {
              return JSON.parse(workingDays);
            } catch {
              return [];
            }
          })()
        : workingDays,
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
    const message = err instanceof Error ? err.message : "Error saving school";
    const statusCode =
      message === "Please keep the time order from check-in to check-out" ||
      message.endsWith("must use HH:mm format") ||
      message === "Please fill all school time settings"
        ? 400
        : 500;
    console.error(err);
    res.status(statusCode).json({ message });
  }
};
