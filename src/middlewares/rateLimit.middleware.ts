import { NextFunction, Request, Response } from "express";

import { ApiError } from "../utils/apiError";

type RateLimiterOptions = {
  keyPrefix: string;
  max: number;
  message: string;
  windowMs: number;
};

type RateLimiterEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimiterEntry>();

export const createRateLimiter =
  ({ keyPrefix, max, message, windowMs }: RateLimiterOptions) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      // WHY: Resetting the counter per window keeps the limiter predictable
      // without adding an external data store for this small SaaS baseline.
      store.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });

      return next();
    }

    if (current.count >= max) {
      return next(new ApiError(429, message));
    }

    current.count += 1;
    store.set(key, current);

    return next();
  };
