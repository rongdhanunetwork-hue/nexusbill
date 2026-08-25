CREATE TABLE "areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"parent_id" integer,
	"created_at" timestamp DEFAULT now(),
	"admin_id" integer
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"details" text,
	"ip_address" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"download_gb" numeric(20, 9) DEFAULT '0' NOT NULL,
	"upload_gb" numeric(20, 9) DEFAULT '0' NOT NULL,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(100) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"note" text,
	"expense_date" date NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"admin_id" integer
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"serial_number" varchar(100),
	"status" varchar(20) DEFAULT 'in_stock',
	"assigned_user_id" integer,
	"branch_id" integer,
	"note" text,
	"created_at" timestamp DEFAULT now(),
	"admin_id" integer,
	CONSTRAINT "inventory_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" varchar(50) DEFAULT 'unpaid',
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mikrotiks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"ip_address" varchar(50) NOT NULL,
	"api_port" integer DEFAULT 80,
	"username" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"web_port" integer DEFAULT 80,
	"status" boolean DEFAULT true,
	"reseller_id" integer,
	"admin_id" integer
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(50) DEFAULT 'general',
	"image_url" text,
	"created_at" timestamp DEFAULT now(),
	"admin_id" integer
);
--> statement-breakpoint
CREATE TABLE "olts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"ip_address" varchar(50) NOT NULL,
	"port_count" integer DEFAULT 8,
	"connection_port" integer DEFAULT 23,
	"username" varchar(255),
	"password" text,
	"status" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"reseller_id" integer,
	"admin_id" integer,
	"web_port" integer DEFAULT 80,
	"protocol" varchar(50) DEFAULT 'HTTP',
	"brand" varchar(100) DEFAULT 'BDCOM EPON',
	"snmp_community" varchar(255) DEFAULT 'public',
	"timeout" integer DEFAULT 10
);
--> statement-breakpoint
CREATE TABLE "package_change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"current_package_id" integer,
	"requested_package_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"speed" varchar(50) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"duration_days" integer DEFAULT 30,
	"data_limit_gb" integer,
	"created_at" timestamp DEFAULT now(),
	"admin_id" integer
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"trx_id" varchar(100),
	"method" varchar(50),
	"screenshot_url" text,
	"status" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"icon" varchar(100) DEFAULT 'link',
	"type" varchar(50) DEFAULT 'general',
	"color" varchar(30) DEFAULT '#00f3ff',
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"admin_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text,
	"admin_id" integer
);
--> statement-breakpoint
CREATE TABLE "sms_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"type" varchar(50),
	"status" varchar(20) DEFAULT 'sent',
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"template" text NOT NULL,
	"description" varchar(255),
	"admin_id" integer
);
--> statement-breakpoint
CREATE TABLE "system_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"link" varchar(255),
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_replies" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"message" text NOT NULL,
	"attachment_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"attachment_url" text,
	"status" varchar(50) DEFAULT 'open',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tj_boxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"port_count" integer DEFAULT 8,
	"status" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"admin_id" integer,
	"reseller_id" integer
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"reseller_id" integer NOT NULL,
	"customer_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(20) DEFAULT 'customer' NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"password" text NOT NULL,
	"address" text,
	"photo_url" text,
	"nid_url" text,
	"nid_number" varchar(50),
	"pppoe_username" varchar(255),
	"mac_address" varchar(100),
	"ip_address" varchar(50),
	"package_id" integer,
	"mikrotik_id" integer,
	"olt_id" integer,
	"tj_box_id" integer,
	"reseller_id" integer,
	"wallet_balance" numeric(10, 2) DEFAULT '0',
	"status" varchar(50) DEFAULT 'active',
	"approval_status" varchar(20) DEFAULT 'approved',
	"expire_date" timestamp,
	"dob" timestamp,
	"last_seen" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"promise_date" timestamp,
	"balance" numeric(10, 2) DEFAULT '0',
	"connection_fee" numeric(10, 2) DEFAULT '0',
	"area_id" integer,
	"note" text,
	"customer_type" varchar(20) DEFAULT 'pppoe',
	"permissions" text DEFAULT '[]',
	"two_factor_enabled" boolean DEFAULT false,
	"two_factor_secret" varchar(255),
	"auto_renew" boolean DEFAULT false,
	"pon_port" varchar(50),
	"onu_mac" varchar(100),
	"router_model" varchar(255),
	"router_username" varchar(255),
	"router_password" varchar(255),
	"admin_id" integer,
	"alternate_phone" varchar(50),
	"division" varchar(100),
	"district" varchar(100),
	"thana" varchar(100),
	"discount" numeric(10, 2) DEFAULT '0',
	"billing_position" varchar(50) DEFAULT 'active_billable',
	"billing_cycle_day" varchar(50) DEFAULT 'standard_30',
	"connection_type" varchar(50) DEFAULT 'fiber',
	"gps_coordinates" varchar(100),
	"joining_date" timestamp DEFAULT now(),
	"plain_password" varchar(255),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_pppoe_username_unique" UNIQUE("pppoe_username")
);
--> statement-breakpoint
CREATE TABLE "withdrawal_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"reseller_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"method" varchar(50),
	"account" varchar(100),
	"status" varchar(20) DEFAULT 'pending',
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "system_notifications" ADD CONSTRAINT "system_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;