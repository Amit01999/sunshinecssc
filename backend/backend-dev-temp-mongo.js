const { MongoMemoryReplSet } = require("mongodb-memory-server");
(async () => {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" }, instanceOpts: [{ port: 27117 }] });
  const uri = replSet.getUri();
  console.log("MONGO_READY " + uri);
})();
