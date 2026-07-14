CREATE TABLE IF NOT EXISTS "contact_submissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
