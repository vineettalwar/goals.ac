import { db } from "@workspace/db";
import { roadmapsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

interface Combo {
  industry: string;
  location: string;
  stage: string;
}

const COMBOS: Combo[] = [
  { industry: "FinTech", location: "London", stage: "seed" },
  { industry: "FinTech", location: "New York", stage: "seed" },
  { industry: "FinTech", location: "Singapore", stage: "series-a" },
  { industry: "FinTech", location: "Berlin", stage: "seed" },
  { industry: "SaaS", location: "London", stage: "seed" },
  { industry: "SaaS", location: "San Francisco", stage: "series-a" },
  { industry: "SaaS", location: "Berlin", stage: "seed" },
  { industry: "SaaS", location: "Toronto", stage: "seed" },
  { industry: "HealthTech", location: "London", stage: "seed" },
  { industry: "HealthTech", location: "Berlin", stage: "seed" },
  { industry: "HealthTech", location: "Boston", stage: "series-a" },
  { industry: "HealthTech", location: "Singapore", stage: "seed" },
  { industry: "DeepTech", location: "London", stage: "seed" },
  { industry: "DeepTech", location: "Paris", stage: "seed" },
  { industry: "DeepTech", location: "San Francisco", stage: "series-a" },
  { industry: "AI/ML", location: "London", stage: "seed" },
  { industry: "AI/ML", location: "San Francisco", stage: "series-a" },
  { industry: "AI/ML", location: "Berlin", stage: "seed" },
  { industry: "AI/ML", location: "Toronto", stage: "seed" },
  { industry: "EdTech", location: "London", stage: "seed" },
  { industry: "EdTech", location: "New York", stage: "seed" },
  { industry: "EdTech", location: "Sydney", stage: "seed" },
  { industry: "PropTech", location: "London", stage: "seed" },
  { industry: "PropTech", location: "Dubai", stage: "seed" },
  { industry: "PropTech", location: "Berlin", stage: "seed" },
  { industry: "CyberSecurity", location: "London", stage: "seed" },
  { industry: "CyberSecurity", location: "Tel Aviv", stage: "series-a" },
  { industry: "CyberSecurity", location: "Austin", stage: "seed" },
  { industry: "MarTech", location: "London", stage: "seed" },
  { industry: "MarTech", location: "New York", stage: "series-a" },
  { industry: "MarTech", location: "Amsterdam", stage: "seed" },
  { industry: "LegalTech", location: "London", stage: "seed" },
  { industry: "LegalTech", location: "New York", stage: "seed" },
  { industry: "InsurTech", location: "London", stage: "seed" },
  { industry: "InsurTech", location: "Singapore", stage: "seed" },
  { industry: "CleanTech", location: "London", stage: "seed" },
  { industry: "CleanTech", location: "Stockholm", stage: "seed" },
  { industry: "CleanTech", location: "Amsterdam", stage: "series-a" },
  { industry: "HRTech", location: "London", stage: "seed" },
  { industry: "HRTech", location: "Amsterdam", stage: "seed" },
  { industry: "Marketplace", location: "London", stage: "seed" },
  { industry: "Marketplace", location: "Berlin", stage: "series-a" },
  { industry: "Marketplace", location: "Dubai", stage: "seed" },
  { industry: "BioTech", location: "London", stage: "series-a" },
  { industry: "BioTech", location: "Boston", stage: "series-a" },
  { industry: "MedTech", location: "London", stage: "seed" },
  { industry: "MedTech", location: "Zurich", stage: "seed" },
  { industry: "eCommerce", location: "London", stage: "seed" },
  { industry: "LogisticsTech", location: "London", stage: "seed" },
  { industry: "LogisticsTech", location: "Singapore", stage: "seed" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function generateSlug(industry: string, location: string, stage: string): string {
  const base = `${slugify(industry)}-${slugify(location)}`;
  return stage === "seed" ? base : `${base}-${slugify(stage)}`;
}

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8080/api";

async function seedRoadmaps() {
  console.log(`Starting roadmap seed — ${COMBOS.length} combos to process`);
  console.log(`API base: ${API_BASE}\n`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const [i, combo] of COMBOS.entries()) {
    const { industry, location, stage } = combo;
    const slug = generateSlug(industry, location, stage);

    const existing = await db
      .select({ id: roadmapsTable.id })
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      console.log(`[${i + 1}/${COMBOS.length}] SKIP  ${slug}`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${COMBOS.length}] GEN   ${slug}...`);

    try {
      const response = await fetch(`${API_BASE}/roadmaps/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, location, stage }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      console.log(`[${i + 1}/${COMBOS.length}] OK    ${slug}`);
      generated++;

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`[${i + 1}/${COMBOS.length}] FAIL  ${slug}:`, err);
      failed++;
    }
  }

  console.log(`\nSeed complete: ${generated} generated, ${skipped} skipped, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

seedRoadmaps().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
