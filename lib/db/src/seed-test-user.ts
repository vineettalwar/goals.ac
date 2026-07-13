/**
 * Seeds a fully-onboarded demo user for GoldSuite AC / goals.ac testing.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/goalsac \
 *     pnpm --filter @workspace/db run seed-test-user
 *
 * Credentials (dev/test only — never use in production):
 *   Email:    demo@gold.edu
 *   Password: GoldSuite2026!
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, companiesTable, marketingPersonasTable } from "./index";

const DEMO_EMAIL = "demo@gold.edu";
const DEMO_PASSWORD = "GoldSuite2026!";
const DEMO_NAME = "Demo User";

async function seedTestUser() {
  console.log("Seeding demo test user...");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, DEMO_EMAIL))
    .limit(1);

  let userId: number;

  if (existing) {
    await db
      .update(usersTable)
      .set({ name: DEMO_NAME, passwordHash, role: "super_admin" })
      .where(eq(usersTable.id, existing.id));
    userId = existing.id;
    console.log(`Updated existing user id=${userId}`);
  } else {
    const [user] = await db
      .insert(usersTable)
      .values({ name: DEMO_NAME, email: DEMO_EMAIL, passwordHash, role: "super_admin" })
      .returning({ id: usersTable.id });
    userId = user.id;
    console.log(`Created user id=${userId}`);
  }

  const [existingCompany] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.userId, userId))
    .limit(1);

  let companyId: number;

  if (existingCompany) {
    await db
      .update(companiesTable)
      .set({
        name: "GoldSuite Demo Co",
        websiteUrl: "https://goldsuite.ac",
        industry: "SaaS / Software",
        description:
          "GoldSuite AC helps businesses create well-researched, AI-generated articles and publish them automatically to WordPress and other CMS platforms.",
        targetAudience:
          "Marketing managers, content leads, and founders at B2B SaaS companies who need consistent SEO content without hiring a full agency.",
        competitorUrls: ["https://jasper.ai", "https://surferseo.com"],
        onboardingComplete: true,
      })
      .where(eq(companiesTable.id, existingCompany.id));
    companyId = existingCompany.id;
    console.log(`Updated company id=${companyId}`);
  } else {
    const [company] = await db
      .insert(companiesTable)
      .values({
        userId,
        name: "GoldSuite Demo Co",
        websiteUrl: "https://goldsuite.ac",
        industry: "SaaS / Software",
        description:
          "GoldSuite AC helps businesses create well-researched, AI-generated articles and publish them automatically to WordPress and other CMS platforms.",
        targetAudience:
          "Marketing managers, content leads, and founders at B2B SaaS companies who need consistent SEO content without hiring a full agency.",
        competitorUrls: ["https://jasper.ai", "https://surferseo.com"],
        onboardingComplete: true,
      })
      .returning({ id: companiesTable.id });
    companyId = company.id;
    console.log(`Created company id=${companyId}`);
  }

  const [existingPersona] = await db
    .select({ id: marketingPersonasTable.id })
    .from(marketingPersonasTable)
    .where(eq(marketingPersonasTable.companyId, companyId))
    .limit(1);

  if (!existingPersona) {
    await db.insert(marketingPersonasTable).values({
      companyId,
      name: "Sarah Chen",
      ageRange: "32-45",
      jobTitle: "Head of Content Marketing",
      painPoints: [
        "Struggling to publish consistent SEO content",
        "Limited budget for freelance writers",
        "Hard to keep up with competitor content velocity",
      ],
      goals: [
        "Publish 4+ high-quality articles per month",
        "Improve organic traffic by 30% in 6 months",
        "Reduce content production cost by 60%",
      ],
      preferredContent: ["How-to guides", "Industry trend analysis", "Case studies"],
      isActive: true,
    });
    console.log("Created marketing persona");
  } else {
    console.log("Marketing persona already exists — skipped");
  }

  console.log("\n✅ Demo account ready:\n");
  console.log(`   User ID:  ${userId}`);
  console.log(`   Email:    ${DEMO_EMAIL}`);
  console.log(`   Password: ${DEMO_PASSWORD}`);
  console.log(`   Role:     super_admin`);
  console.log(`   Company:  GoldSuite Demo Co (id=${companyId})`);
  console.log("\n   Login at marketing-persona-app /login or goals-ac /login\n");

  process.exit(0);
}

seedTestUser().catch((err) => {
  console.error("Seed test user failed:", err);
  process.exit(1);
});
