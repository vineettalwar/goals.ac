CREATE TABLE "content_piece_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_piece_id" integer NOT NULL,
	"version_number" integer NOT NULL,
	"title" text NOT NULL,
	"body_markdown" text DEFAULT '' NOT NULL,
	"piece_metadata" jsonb,
	"change_type" text NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_piece_versions" ADD CONSTRAINT "content_piece_versions_content_piece_id_content_pieces_id_fk" FOREIGN KEY ("content_piece_id") REFERENCES "public"."content_pieces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "content_piece_versions" ADD CONSTRAINT "content_piece_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "content_piece_versions_content_piece_id_idx" ON "content_piece_versions" USING btree ("content_piece_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "content_piece_versions_piece_version_idx" ON "content_piece_versions" USING btree ("content_piece_id","version_number");