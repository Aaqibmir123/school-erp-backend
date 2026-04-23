import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

type ValidateTarget = "body" | "params" | "query";

export const validate =
  (schema: ZodTypeAny, target: ValidateTarget = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const source = req[target];
    const result = schema.safeParse(source);

    if (!result.success) {
      return next(result.error);
    }

    // WHY: We write the parsed payload back so controllers always receive the
    // sanitized version instead of re-trimming or re-validating inputs.
    (req as any)[target] = result.data;

    return next();
  };
