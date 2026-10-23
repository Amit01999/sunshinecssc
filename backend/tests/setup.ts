import { afterAll, beforeAll, afterEach } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

// A single-node replica set (not a plain standalone server) because several
// write paths use multi-document transactions, which MongoDB only supports
// on a replica set - this keeps tests faithful to the production target (Atlas).
let memoryServer: MongoMemoryReplSet | null = null;

beforeAll(async () => {
  memoryServer = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  await mongoose.connect(memoryServer.getUri());
}, 120000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await memoryServer?.stop();
});
