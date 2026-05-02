import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { websiteProjectsTable } from "./website_projects";
import { roadmapsTable } from "./roadmaps";

export const projectRoadmapsTable = pgTable(
  "project_roadmaps",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    roadmapId: integer("roadmap_id")
      .notNull()
      .references(() => roadmapsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("project_roadmaps_unique").on(t.projectId, t.roadmapId)],
);

export type ProjectRoadmap = typeof projectRoadmapsTable.$inferSelect;
