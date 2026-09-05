CREATE TABLE "metro_lines" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"line_code" varchar(50) NOT NULL,
	"bengali_name" varchar(150) NOT NULL,
	"display_color" varchar(20) NOT NULL,
	"text_color" varchar(20) DEFAULT '#FFFFFF' NOT NULL,
	"status" varchar(50) NOT NULL,
	"confidence" varchar(50) DEFAULT 'verified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "metro_lines_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "metro_stations" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"slug" varchar(150) NOT NULL,
	"name" varchar(150) NOT NULL,
	"bengali_name" varchar(200),
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"status" varchar(50) DEFAULT 'operational' NOT NULL,
	"data_confidence" varchar(50) DEFAULT 'verified' NOT NULL,
	"opened_year" integer,
	"source_name" varchar(150),
	"source_url" varchar(255),
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "metro_stations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "station_lines" (
	"station_id" varchar(100) NOT NULL,
	"line_id" varchar(50) NOT NULL,
	"station_order" integer NOT NULL,
	CONSTRAINT "station_lines_station_id_line_id_pk" PRIMARY KEY("station_id","line_id")
);
--> statement-breakpoint
CREATE TABLE "station_connections" (
	"id" varchar(150) PRIMARY KEY NOT NULL,
	"from_station_id" varchar(100) NOT NULL,
	"to_station_id" varchar(100) NOT NULL,
	"line_id" varchar(50) NOT NULL,
	"distance_meters" integer NOT NULL,
	"estimated_travel_seconds" integer,
	"verified" boolean DEFAULT false NOT NULL,
	"confidence" varchar(50) DEFAULT 'verified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interchanges" (
	"id" varchar(150) PRIMARY KEY NOT NULL,
	"from_station_id" varchar(100) NOT NULL,
	"to_station_id" varchar(100) NOT NULL,
	"estimated_transfer_seconds" integer,
	"verified" boolean DEFAULT false NOT NULL,
	"confidence" varchar(50) DEFAULT 'verified' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landmarks" (
	"id" varchar(150) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"bengali_name" varchar(200),
	"category" varchar(50) DEFAULT 'landmark' NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"aliases" text,
	"description" text,
	"data_confidence" varchar(50) DEFAULT 'verified' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "station_lines" ADD CONSTRAINT "station_lines_station_id_metro_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."metro_stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_lines" ADD CONSTRAINT "station_lines_line_id_metro_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."metro_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_connections" ADD CONSTRAINT "station_connections_from_station_id_metro_stations_id_fk" FOREIGN KEY ("from_station_id") REFERENCES "public"."metro_stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_connections" ADD CONSTRAINT "station_connections_to_station_id_metro_stations_id_fk" FOREIGN KEY ("to_station_id") REFERENCES "public"."metro_stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_connections" ADD CONSTRAINT "station_connections_line_id_metro_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."metro_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interchanges" ADD CONSTRAINT "interchanges_from_station_id_metro_stations_id_fk" FOREIGN KEY ("from_station_id") REFERENCES "public"."metro_stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interchanges" ADD CONSTRAINT "interchanges_to_station_id_metro_stations_id_fk" FOREIGN KEY ("to_station_id") REFERENCES "public"."metro_stations"("id") ON DELETE cascade ON UPDATE no action;