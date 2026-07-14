import { sqliteTable, integer, unique } from "drizzle-orm/sqlite-core";
import { websiteProjectsTable } from "./website_projects";
import { roadmapsTable } from "./roadmaps";

export const projectRoadmapsTable = sqliteTable(
  "project_roadmaps",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => websiteProjectsTable.id, { onDelete: "cascade" }),
    roadmapId: integer("roadmap_id")
      .notNull()
      .references(() => roadmapsTable.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [unique("project_roadmaps_unique").on(t.projectId, t.roadmapId)],
);

export type ProjectRoadmap = typeof projectRoadmapsTable.$inferSelect;
