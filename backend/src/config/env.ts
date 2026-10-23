import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

const isTest = process.env.NODE_ENV === "test";

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  isProduction: process.env.NODE_ENV === "production",
  isTest,
  port: Number(optional("PORT", "4000")),
  frontendUrls: optional("FRONTEND_URL", "http://localhost:8080")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  backendUrl: optional("BACKEND_URL", "http://localhost:4000"),
  // In test mode the DB URI is supplied at runtime by mongodb-memory-server, so it's not required here.
  mongodbUri: isTest ? optional("MONGODB_URI", "") : required("MONGODB_URI"),
  jwt: {
    accessSecret: isTest ? optional("JWT_ACCESS_SECRET", "test-access-secret") : required("JWT_ACCESS_SECRET"),
    refreshSecret: isTest ? optional("JWT_REFRESH_SECRET", "test-refresh-secret") : required("JWT_REFRESH_SECRET"),
    accessExpiresIn: optional("JWT_ACCESS_EXPIRES_IN", "15m"),
    refreshExpiresIn: optional("JWT_REFRESH_EXPIRES_IN", "30d"),
  },
  cloudinary: {
    cloudName: optional("CLOUDINARY_CLOUD_NAME", ""),
    apiKey: optional("CLOUDINARY_API_KEY", ""),
    apiSecret: optional("CLOUDINARY_API_SECRET", ""),
  },
  initialAdmin: {
    email: process.env.INITIAL_ADMIN_EMAIL,
    password: process.env.INITIAL_ADMIN_PASSWORD,
    name: process.env.INITIAL_ADMIN_NAME,
  },
};

export const isCloudinaryConfigured = Boolean(
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret,
);
