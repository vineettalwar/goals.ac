import "./load-workspace-env";
import { seedReferenceData } from "./seed-reference-data";

async function seed() {
  console.log("Seeding reference data (industries, locations)...");
  await seedReferenceData();
  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
