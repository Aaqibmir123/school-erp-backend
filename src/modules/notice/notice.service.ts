import Notice from "./notice.model";

type CreateNoticeInput = {
  academicYearId?: string;
  audience: string;
  body: string;
  createdById: string;
  createdByRole: string;
  schoolId: string;
  title: string;
};

export const createNoticeService = async ({
  academicYearId,
  audience,
  body,
  createdById,
  createdByRole,
  schoolId,
  title,
}: CreateNoticeInput) => {
  return Notice.create({
    schoolId,
    academicYearId: academicYearId || null,
    title,
    body,
    audience,
    createdById,
    createdByRole,
  });
};

export const getNoticesService = async ({
  schoolId,
  academicYearId,
}: {
  schoolId: string;
  academicYearId?: string;
}) => {
  return Notice.find({
    schoolId,
    ...(academicYearId ? { academicYearId } : {}),
  })
    .populate("academicYearId", "name isActive")
    .sort({ createdAt: -1 })
    .lean();
};

export const getNoticeFeedService = async ({
  schoolId,
  role,
}: {
  schoolId: string;
  role: string;
}) => {
  const allowedAudience =
    role === "TEACHER"
      ? ["Teachers", "All School Users"]
      : role === "PARENT"
        ? ["Parents", "Students & Parents", "All School Users"]
        : role === "STUDENT"
          ? ["Students", "Students & Parents", "All School Users"]
          : ["Teachers", "Students", "Parents", "Students & Parents", "All School Users"];

  return Notice.find({
    schoolId,
    audience: { $in: allowedAudience },
  })
    .populate("academicYearId", "name isActive")
    .sort({ createdAt: -1 })
    .lean();
};

export const updateNoticeService = async ({
  noticeId,
  schoolId,
  academicYearId,
  audience,
  body,
  title,
}: {
  noticeId: string;
  schoolId: string;
  academicYearId?: string;
  audience: string;
  body: string;
  title: string;
}) => {
  return Notice.findOneAndUpdate(
    { _id: noticeId, schoolId },
    {
      $set: {
        title,
        body,
        audience,
        academicYearId: academicYearId || null,
      },
    },
    { new: true },
  );
};

export const deleteNoticeService = async ({
  noticeId,
  schoolId,
}: {
  noticeId: string;
  schoolId: string;
}) => {
  return Notice.findOneAndDelete({
    _id: noticeId,
    schoolId,
  });
};
