import { Router, type IRouter } from "express";
import { db, industriesTable, locationsTable } from "@workspace/db";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/industries", async (req, res) => {
  try {
    const industries = await db
      .select()
      .from(industriesTable)
      .orderBy(asc(industriesTable.name));
    res.json(industries);
  } catch (err) {
    req.log.error(err, "Failed to list industries");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/locations", async (req, res) => {
  try {
    const locations = await db
      .select()
      .from(locationsTable)
      .orderBy(asc(locationsTable.name));
    res.json(locations);
  } catch (err) {
    req.log.error(err, "Failed to list locations");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
