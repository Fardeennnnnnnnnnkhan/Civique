-- Restore-safe baseline taxonomy. Routing rules remain city/department-owned.
INSERT INTO "categories" ("id", "key", "name", "description", "active", "updated_at") VALUES
  (gen_random_uuid(), 'POTHOLE', 'Road pothole', 'Civique citizen reporting category: Road pothole', true, NOW()),
  (gen_random_uuid(), 'GARBAGE', 'Solid waste', 'Civique citizen reporting category: Solid waste', true, NOW()),
  (gen_random_uuid(), 'STREETLIGHT', 'Streetlight', 'Civique citizen reporting category: Streetlight', true, NOW()),
  (gen_random_uuid(), 'WATER_LEAK', 'Water leak', 'Civique citizen reporting category: Water leak', true, NOW()),
  (gen_random_uuid(), 'SEWAGE', 'Sewage overflow', 'Civique citizen reporting category: Sewage overflow', true, NOW()),
  (gen_random_uuid(), 'TRAFFIC_SIGN', 'Traffic and signs', 'Civique citizen reporting category: Traffic and signs', true, NOW()),
  (gen_random_uuid(), 'OTHER', 'Other civic hazard', 'Civique citizen reporting category: Other civic hazard', true, NOW())
ON CONFLICT ("key") DO UPDATE SET "active" = true, "updated_at" = NOW();
