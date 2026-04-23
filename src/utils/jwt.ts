import jwt from "jsonwebtoken"
import { env } from "../config/env"

export const generateToken = (payload: object) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "7d"
  })
}

export const generateSetPasswordToken = (userId: string) => {
  return jwt.sign(
    { id: userId, type: "SET_PASSWORD" },
    env.JWT_SECRET,
    { expiresIn: "1d" }
  )
}

export const verifyToken = (token: string) => {
  return jwt.verify(token, env.JWT_SECRET)
}