require("dotenv").config();
const mongoose = require("mongoose");

const LEGACY_INDEX_NAME = "classId_1_subjectId_1_academicYearId_1";

async function run() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is required in backend/.env");
  }

  await mongoose.connect(mongoUri);

  const collection = mongoose.connection.collection("teacherassignments");
  const indexes = await collection.indexes();
  const legacyIndex = indexes.find((index) => index.name === LEGACY_INDEX_NAME);

  if (!legacyIndex) {
    console.log(`Legacy index '${LEGACY_INDEX_NAME}' was not found. Nothing to change.`);
    return;
  }

  await collection.dropIndex(LEGACY_INDEX_NAME);
  console.log(`Dropped legacy index '${LEGACY_INDEX_NAME}'.`);
}

run()
  .catch((error) => {
    console.error("Teacher assignment index migration failed:", error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
