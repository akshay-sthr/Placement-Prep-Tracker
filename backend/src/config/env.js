require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production.");
}

module.exports = {
  isProduction,
  PORT: process.env.PORT || 8000,
  JWT_SECRET: process.env.JWT_SECRET || "dev-only-change-this-secret",
  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || "").trim().toLowerCase(),
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/placement-tracker",
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-5-mini",
};
