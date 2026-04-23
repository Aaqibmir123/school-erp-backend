import { z } from "zod";

export const createHomeworkSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),

  classId: z.string().min(1, "Class is required"),
  subjectId: z.string().min(1, "Subject is required"),

  dueDate: z.string().min(1, "Due date is required"),

  isGeneral: z.boolean().optional(),
});