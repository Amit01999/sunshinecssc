import mongoose from "mongoose";
import { env } from "./env";

mongoose.set("strictQuery", true);

export async function connectDB(uri: string = env.mongodbUri): Promise<void> {
  if (!uri) {
    throw new Error("Cannot connect to MongoDB: no connection URI provided");
  }
  mongoose.connection.on("error", (err) => {
    console.error("[mongodb] connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[mongodb] disconnected");
  });
  await mongoose.connect(uri);
  console.log(`[mongodb] connected -> ${mongoose.connection.name}`);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
