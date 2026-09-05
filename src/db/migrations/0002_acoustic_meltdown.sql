CREATE TABLE "bus_route_stops" (
	"id" varchar(150) PRIMARY KEY NOT NULL,
	"route_id" varchar(50) NOT NULL,
	"stop_id" varchar(100) NOT NULL,
	"stop_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bus_routes" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"route_number" varchar(50) NOT NULL,
	"origin_name" varchar(150) NOT NULL,
	"destination_name" varchar(150) NOT NULL,
	"operator" varchar(100) DEFAULT 'WBTC' NOT NULL,
	"data_confidence" varchar(50) DEFAULT 'verified' NOT NULL,
	"source_name" varchar(150) DEFAULT 'West Bengal Transport Corporation (WBTC)',
	"source_url" varchar(255) DEFAULT 'https://wbtc.co.in',
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bus_stops" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"bengali_name" varchar(200),
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"data_confidence" varchar(50) DEFAULT 'verified' NOT NULL,
	"source_name" varchar(150) DEFAULT 'WBTC Official Stoppages',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "informal_transit_stands" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"type" varchar(20) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"nearby_metro_station_id" varchar(100),
	"routes_served" text,
	"fare_min" double precision,
	"fare_max" double precision,
	"data_confidence" varchar(50) DEFAULT 'development' NOT NULL,
	"source_name" varchar(150) DEFAULT 'Kolkata Auto-Rickshaw Operators Union / Community Documented',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bus_route_stops" ADD CONSTRAINT "bus_route_stops_route_id_bus_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."bus_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bus_route_stops" ADD CONSTRAINT "bus_route_stops_stop_id_bus_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."bus_stops"("id") ON DELETE cascade ON UPDATE no action;