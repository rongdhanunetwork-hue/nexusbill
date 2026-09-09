CREATE TABLE "customer_routers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"model" varchar(255),
	"ip_address" varchar(50),
	"mac_address" varchar(100),
	"username" varchar(255),
	"password" varchar(255),
	"port" integer DEFAULT 80,
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ticket_replies" DROP COLUMN "attachment_url";--> statement-breakpoint
ALTER TABLE "tickets" DROP COLUMN "attachment_url";