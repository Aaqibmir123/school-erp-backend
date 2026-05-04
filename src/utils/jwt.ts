import jwt from "jsonwebtoken"
import { env } from "../config/env"

export const generateToken = (payload: object) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "7d"
  })
}

export const generateRefreshToken = (payload: object) => {
  return jwt.sign(payload, env.REFRESH_JWT_SECRET, {
    expiresIn: "30d",
  })
}

export const verifyToken = (token: string) => {
  return jwt.verify(token, env.JWT_SECRET)
}

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, env.REFRESH_JWT_SECRET)
}
