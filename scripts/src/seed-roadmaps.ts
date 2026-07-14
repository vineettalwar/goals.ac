import { db, generateRoadmapSlug, roadmapsTable } from "@workspace/db";
import { generateRoadmap } from "@workspace/content-engine/strategy/roadmap-generator";
import { eq } from "drizzle-orm";

interface Combo {
  industry: string;
  location: string;
  stage: string;
}

const COMBOS: Combo[] = [
  { industry: "BioTech", location: "Austin", stage: "pre-seed" },
  { industry: "BioTech", location: "London", stage: "series-a" },
  { industry: "BioTech", location: "Boston", stage: "series-a" },
  { industry: "SaaS", location: "San Francisco", stage: "pre-seed" },
  { industry: "SaaS", location: "San Francisco", stage: "series-a" },
  { industry: "AI/ML", location: "San Francisco", stage: "pre-seed" },
  { industry: "FinTech", location: "London", stage: "seed" },
  { industry: "FinTech", location: "New York", stage: "seed" },
  { industry: "FinTech", location: "Singapore", stage: "series-a" },
  { industry: "FinTech", location: "Berlin", stage: "seed" },
  { industry: "SaaS", location: "London", stage: "seed" },
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
  { industry: "MedTech", location: "London", stage: "seed" },
  { industry: "MedTech", location: "Zurich", stage: "seed" },
  { industry: "eCommerce", location: "London", stage: "seed" },
  { industry: "LogisticsTech", location: "London", stage: "seed" },
  { industry: "LogisticsTech", location: "Singapore", stage: "seed" },
];

const DELAY_MS = Number(process.env.SEED_ROADMAP_DELAY_MS ?? 1000);

async function seedRoadmaps() {
  if (!process.env.GEMINI_API_KEY && !process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
    console.error(
      "GEMINI_API_KEY or AI_INTEGRATIONS_GEMINI_API_KEY is required to seed roadmaps.",
    );
    process.exit(1);
  }

  console.log(`Starting roadmap seed — ${COMBOS.length} combos to process`);
  console.log(`Delay between generations: ${DELAY_MS}ms\n`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const [i, combo] of COMBOS.entries()) {
    const { industry, location, stage } = combo;
    const slug = generateRoadmapSlug(industry, location, stage);

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
      const content = await generateRoadmap(industry, location, stage);

      await db
        .insert(roadmapsTable)
        .values({ slug, industry, location, stage, content })
        .onConflictDoNothing({ target: roadmapsTable.slug });

      console.log(`[${i + 1}/${COMBOS.length}] OK    ${slug}`);
      generated++;

      if (DELAY_MS > 0 && i < COMBOS.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
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
