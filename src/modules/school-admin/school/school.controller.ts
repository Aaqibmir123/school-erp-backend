import { Request, Response } from "express";
import * as schoolService from "./school.service";
import { uploadBufferToCloudinary } from "../../../utils/cloudinary";

export const getSchool = async (req: Request, res: Response) => {
  try {
    const school = await schoolService.getSchoolProfile(req.user.schoolId);
    res.json(school);
  } catch {
    res.status(500).json({ message: "Error fetching school" });
  }
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

const TIMING_FIELDS = [
  "checkInOpenTime",
  "schoolStartTime",
  "lateMarkAfterTime",
  "checkInCloseTime",
  "schoolEndTime",
  "checkOutCloseTime",
  "workingDays",
] as const;

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

    const hasTimingUpdate = TIMING_FIELDS.some((field) =>
      Object.prototype.hasOwnProperty.call(req.body, field),
    );

    if (hasTimingUpdate) {
      const existingSchool = await schoolService.getSchoolProfile(req.user.schoolId);

      validateTimeOrder({
        checkInOpenTime: checkInOpenTime ?? existingSchool?.checkInOpenTime,
        schoolStartTime: schoolStartTime ?? existingSchool?.schoolStartTime,
        lateMarkAfterTime: lateMarkAfterTime ?? existingSchool?.lateMarkAfterTime,
        checkInCloseTime: checkInCloseTime ?? existingSchool?.checkInCloseTime,
        schoolEndTime: schoolEndTime ?? existingSchool?.schoolEndTime,
        checkOutCloseTime: checkOutCloseTime ?? existingSchool?.checkOutCloseTime,
      });
    }

    const files = req.files as {
      [fieldname: string]: Express.Multer.File[];
    };

    const data: any = {
      schoolId: req?.user?.schoolId,
    };

    if (name !== undefined) data.name = name;
    if (address !== undefined) data.address = address;
    if (checkInOpenTime !== undefined) data.checkInOpenTime = checkInOpenTime;
    if (schoolStartTime !== undefined) data.schoolStartTime = schoolStartTime;
    if (lateMarkAfterTime !== undefined) data.lateMarkAfterTime = lateMarkAfterTime;
    if (checkInCloseTime !== undefined) data.checkInCloseTime = checkInCloseTime;
    if (schoolEndTime !== undefined) data.schoolEndTime = schoolEndTime;
    if (checkOutCloseTime !== undefined) data.checkOutCloseTime = checkOutCloseTime;
    if (workingDays !== undefined) {
      data.workingDays =
        typeof workingDays === "string"
          ? (() => {
              try {
                return JSON.parse(workingDays);
              } catch {
                return [];
              }
            })()
          : workingDays;
    }

    // 🔥 FIX PATHS HERE
    if (files?.logo?.[0]) {
      data.logo = await uploadBufferToCloudinary(files.logo[0], "school/logo");
    }

    if (files?.signature?.[0]) {
      data.signature = await uploadBufferToCloudinary(
        files.signature[0],
        "school/signature",
      );
    }

    if (files?.seal?.[0]) {
      data.seal = await uploadBufferToCloudinary(files.seal[0], "school/seal");
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
