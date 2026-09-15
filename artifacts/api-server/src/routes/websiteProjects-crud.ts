import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  websiteProjectsTable,
  brandProfilesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { runBrandScrapeWithDiscovery } from "@workspace/content-engine/support/brand/brand-scrape-orchestrator";

const router: IRouter = Router();

const CreateProjectBody = z.object({
  name: z.string().min(1, "Project name is required"),
  url: z.string().url("Must be a valid URL"),
});

async function runBrandScrape(
  projectId: number,
  url: string,
  log: { error: (obj: unknown, msg: string) => void },
  overwrite = false,
): Promise<void> {
  try {
    await runBrandScrapeWithDiscovery(projectId, url, { overwrite, refreshSitemap: true });
  } catch (err) {
    log.error(err, "Brand scrape failed");
    await db
      .update(websiteProjectsTable)
      .set({ scrapeStatus: "failed" })
      .where(eq(websiteProjectsTable.id, projectId));
  }
}

router.get("/website-projects", requireAuth, async (req, res) => {
  try {
    const projects = await db
      .select()
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.userId, req.user!.userId));

    res.json(projects);
  } catch (err) {
    req.log.error(err, "Failed to list website projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/website-projects", requireAuth, async (req, res) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { name, url } = parsed.data;

  try {
    const [project] = await db
      .insert(websiteProjectsTable)
      .values({
        userId: req.user!.userId,
        name,
        url,
        crawlStatus: "pending",
        scrapeStatus: "pending",
      })
      .returning();

    res.status(201).json(project);

    runBrandScrape(project.id, url, req.log).catch(async (err) => {
      req.log.error(err, "Brand scrape failed on project create");
      await db
        .update(websiteProjectsTable)
        .set({ scrapeStatus: "failed" })
        .where(eq(websiteProjectsTable.id, project.id));
    });
  } catch (err) {
    req.log.error(err, "Failed to create website project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/website-projects/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    const [project] = await db
      .select()
      .from(websiteProjectsTable)
      .where(
        and(
          eq(websiteProjectsTable.id, id),
          eq(websiteProjectsTable.userId, req.user!.userId),
        ),
      )
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [brandProfile] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, id))
      .limit(1);

    res.json({ ...project, brandProfile: brandProfile ?? null });
  } catch (err) {
    req.log.error(err, "Failed to get website project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/website-projects/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  try {
    const [project] = await db
      .select({ id: websiteProjectsTable.id })
      .from(websiteProjectsTable)
      .where(
        and(
          eq(websiteProjectsTable.id, id),
          eq(websiteProjectsTable.userId, req.user!.userId),
        ),
      )
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    await db
      .delete(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err, "Failed to delete website project");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
