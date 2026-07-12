ALTER TABLE "content_pieces" ADD COLUMN "content_item_id" integer;--> statement-breakpoint
ALTER TABLE "content_pieces" ADD COLUMN "parent_piece_id" integer;--> statement-breakpoint
ALTER TABLE "content_pieces" ADD COLUMN "publish_platform" text;--> statement-breakpoint
ALTER TABLE "content_pieces" ADD COLUMN "publish_error" text;--> statement-breakpoint
ALTER TABLE "content_pieces" ADD CONSTRAINT "content_pieces_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;
