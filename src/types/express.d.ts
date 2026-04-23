import { JwtPayload } from "../../../shared-types/jwt.types";

declare global {
  namespace Express {
    interface Request {
       user?: JwtPayload 
    }
  }
}