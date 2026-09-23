CREATE TABLE IF NOT EXISTS "tenant_settings" (
  "city_id" UUID NOT NULL, "slug" TEXT NOT NULL, "display_name" TEXT NOT NULL, "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata', "default_locale" TEXT NOT NULL DEFAULT 'hi-IN', "data_residency" TEXT NOT NULL DEFAULT 'IN', "branding" JSONB NOT NULL DEFAULT '{}'::jsonb, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("city_id"), CONSTRAINT "tenant_settings_city_fk" FOREIGN KEY ("city_id") REFERENCES cities(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "tenant_settings_slug_key" UNIQUE ("slug")
);
CREATE TABLE IF NOT EXISTS "tenant_feature_flags" (
  "city_id" UUID NOT NULL, "key" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT FALSE, "rollout_percent" INTEGER NOT NULL DEFAULT 0, "updated_by" UUID, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_feature_flags_pkey" PRIMARY KEY ("city_id","key"), CONSTRAINT "tenant_flags_city_fk" FOREIGN KEY ("city_id") REFERENCES cities(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "tenant_flags_user_fk" FOREIGN KEY ("updated_by") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT "tenant_flags_rollout_check" CHECK ("rollout_percent" BETWEEN 0 AND 100)
);
CREATE TABLE IF NOT EXISTS "tenant_policy_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "city_id" UUID NOT NULL, "domain" TEXT NOT NULL, "version" TEXT NOT NULL, "config" JSONB NOT NULL, "active" BOOLEAN NOT NULL DEFAULT FALSE, "effective_at" TIMESTAMP(3), "created_by" UUID, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_policy_versions_pkey" PRIMARY KEY ("id"), CONSTRAINT "tenant_policies_city_fk" FOREIGN KEY ("city_id") REFERENCES cities(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "tenant_policies_user_fk" FOREIGN KEY ("created_by") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT "tenant_policies_unique" UNIQUE (city_id,domain,version)
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_policy_active_unique" ON tenant_policy_versions(city_id,domain) WHERE active=true;
CREATE TABLE IF NOT EXISTS "tenant_provisioning_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "city_id" UUID NOT NULL, "action" TEXT NOT NULL, "actor_id" UUID NOT NULL, "details" JSONB NOT NULL DEFAULT '{}'::jsonb, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_provisioning_events_pkey" PRIMARY KEY ("id"), CONSTRAINT "tenant_events_city_fk" FOREIGN KEY ("city_id") REFERENCES cities(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "tenant_events_actor_fk" FOREIGN KEY ("actor_id") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO tenant_settings (city_id,slug,display_name)
SELECT c.id, CONCAT(regexp_replace(lower(c.name),'[^a-z0-9]+','-','g'),'-',substring(c.id::text,1,8)), c.name
FROM cities c
WHERE NOT EXISTS (SELECT 1 FROM tenant_settings ts WHERE ts.city_id=c.id);
