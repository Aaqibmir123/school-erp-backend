import nodemailer from "nodemailer";

import { env } from "../config/env";

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    if (!env.EMAIL_USER || !env.EMAIL_PASS) {
      throw new Error(
        "Email configuration is missing. Set EMAIL_USER and EMAIL_PASS in backend/.env",
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"School ERP" <${env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent successfully");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("Email sending failed");
    console.error(error);

    throw new Error("Email not sent");
  }
};
