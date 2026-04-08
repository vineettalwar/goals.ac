import { db, industriesTable, locationsTable } from "./index";

const industries = [
  { name: "SaaS", slug: "saas" },
  { name: "FinTech", slug: "fintech" },
  { name: "HealthTech", slug: "healthtech" },
  { name: "DeepTech", slug: "deeptech" },
  { name: "EdTech", slug: "edtech" },
  { name: "LegalTech", slug: "legaltech" },
  { name: "PropTech", slug: "proptech" },
  { name: "InsurTech", slug: "insurtech" },
  { name: "CleanTech", slug: "cleantech" },
  { name: "AgriTech", slug: "agritech" },
  { name: "RetailTech", slug: "retailtech" },
  { name: "LogisticsTech", slug: "logisticstech" },
  { name: "CyberSecurity", slug: "cybersecurity" },
  { name: "AI/ML", slug: "ai-ml" },
  { name: "Marketplace", slug: "marketplace" },
  { name: "eCommerce", slug: "ecommerce" },
  { name: "BioTech", slug: "biotech" },
  { name: "MedTech", slug: "medtech" },
  { name: "HRTech", slug: "hrtech" },
  { name: "MarTech", slug: "martech" },
];

const locations = [
  { name: "London", slug: "london", country: "UK" },
  { name: "New York", slug: "new-york", country: "USA" },
  { name: "San Francisco", slug: "san-francisco", country: "USA" },
  { name: "Berlin", slug: "berlin", country: "Germany" },
  { name: "Paris", slug: "paris", country: "France" },
  { name: "Amsterdam", slug: "amsterdam", country: "Netherlands" },
  { name: "Singapore", slug: "singapore", country: "Singapore" },
  { name: "Dubai", slug: "dubai", country: "UAE" },
  { name: "Toronto", slug: "toronto", country: "Canada" },
  { name: "Sydney", slug: "sydney", country: "Australia" },
  { name: "Tel Aviv", slug: "tel-aviv", country: "Israel" },
  { name: "Stockholm", slug: "stockholm", country: "Sweden" },
  { name: "Zurich", slug: "zurich", country: "Switzerland" },
  { name: "Barcelona", slug: "barcelona", country: "Spain" },
  { name: "Austin", slug: "austin", country: "USA" },
  { name: "Boston", slug: "boston", country: "USA" },
  { name: "Chicago", slug: "chicago", country: "USA" },
  { name: "Miami", slug: "miami", country: "USA" },
  { name: "Munich", slug: "munich", country: "Germany" },
  { name: "Dublin", slug: "dublin", country: "Ireland" },
  { name: "Lisbon", slug: "lisbon", country: "Portugal" },
  { name: "Warsaw", slug: "warsaw", country: "Poland" },
  { name: "Bangalore", slug: "bangalore", country: "India" },
  { name: "Mumbai", slug: "mumbai", country: "India" },
  { name: "Hong Kong", slug: "hong-kong", country: "Hong Kong" },
  { name: "Tokyo", slug: "tokyo", country: "Japan" },
  { name: "Seoul", slug: "seoul", country: "South Korea" },
  { name: "São Paulo", slug: "sao-paulo", country: "Brazil" },
  { name: "Mexico City", slug: "mexico-city", country: "Mexico" },
  { name: "Lagos", slug: "lagos", country: "Nigeria" },
];

async function seed() {
  console.log("Seeding industries...");
  for (const industry of industries) {
    await db
      .insert(industriesTable)
      .values(industry)
      .onConflictDoNothing({ target: industriesTable.slug });
  }

  console.log("Seeding locations...");
  for (const location of locations) {
    await db
      .insert(locationsTable)
      .values(location)
      .onConflictDoNothing({ target: locationsTable.slug });
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
