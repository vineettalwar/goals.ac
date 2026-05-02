ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_id" text UNIQUE;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text NOT NULL DEFAULT 'user';
