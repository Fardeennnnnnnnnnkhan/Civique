CREATE TABLE "categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "categories_key_key" ON "categories"("key");

CREATE TABLE "routing_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "category_id" UUID NOT NULL,
  "city_id" UUID,
  "ward_id" UUID,
  "department_id" UUID NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effective_until" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "routing_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "routing_rules_category_id_city_id_ward_id_active_idx" ON "routing_rules"("category_id", "city_id", "ward_id", "active");
CREATE INDEX "routing_rules_effective_from_effective_until_idx" ON "routing_rules"("effective_from", "effective_until");
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "routing_decisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "incident_id" UUID NOT NULL,
  "rule_id" UUID,
  "category_key" TEXT NOT NULL,
  "department_id" UUID,
  "previous_department_id" UUID,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "routing_decisions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "routing_decisions_incident_id_created_at_idx" ON "routing_decisions"("incident_id", "created_at");
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "routing_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
