CREATE TABLE IF NOT EXISTS "socio_aliases" (
  "user_id" UUID NOT NULL, "alias" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "socio_aliases_pkey" PRIMARY KEY ("user_id"), CONSTRAINT "socio_aliases_user_fk" FOREIGN KEY ("user_id") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "socio_aliases_alias_key" ON socio_aliases(alias);
CREATE TABLE IF NOT EXISTS "socio_posts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "report_id" UUID NOT NULL, "incident_id" UUID NOT NULL, "author_id" UUID NOT NULL, "alias" TEXT NOT NULL,
  "consent_version" TEXT NOT NULL, "redacted_text" TEXT NOT NULL, "generalized_latitude" DOUBLE PRECISION, "generalized_longitude" DOUBLE PRECISION, "category" TEXT NOT NULL, "status" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'PUBLIC', "publication_version" INTEGER NOT NULL DEFAULT 1, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "revoked_at" TIMESTAMP(3), "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "socio_posts_pkey" PRIMARY KEY ("id"), CONSTRAINT "socio_posts_report_fk" FOREIGN KEY ("report_id") REFERENCES reports(id) ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "socio_posts_incident_fk" FOREIGN KEY ("incident_id") REFERENCES incidents(id) ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "socio_posts_author_fk" FOREIGN KEY ("author_id") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "socio_posts_active_report_key" ON socio_posts(report_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS "socio_posts_feed_idx" ON socio_posts(visibility,created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS "socio_follows" (
  "user_id" UUID NOT NULL, "scope_type" TEXT NOT NULL, "scope_key" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "socio_follows_pkey" PRIMARY KEY ("user_id","scope_type","scope_key"), CONSTRAINT "socio_follows_user_fk" FOREIGN KEY ("user_id") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "socio_saves" (
  "user_id" UUID NOT NULL, "post_id" UUID NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "socio_saves_pkey" PRIMARY KEY ("user_id","post_id"), CONSTRAINT "socio_saves_user_fk" FOREIGN KEY ("user_id") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_saves_post_fk" FOREIGN KEY ("post_id") REFERENCES socio_posts(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "socio_publication_consents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "post_id" UUID NOT NULL, "user_id" UUID NOT NULL, "consent_version" TEXT NOT NULL, "action" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "socio_publication_consents_pkey" PRIMARY KEY ("id"), CONSTRAINT "socio_consent_post_fk" FOREIGN KEY ("post_id") REFERENCES socio_posts(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_consent_user_fk" FOREIGN KEY ("user_id") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "socio_publication_consents_post_idx" ON socio_publication_consents(post_id,created_at DESC);
CREATE TABLE IF NOT EXISTS "socio_post_updates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "post_id" UUID NOT NULL, "status" TEXT NOT NULL, "message" TEXT NOT NULL, "actor_id" UUID NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "socio_post_updates_pkey" PRIMARY KEY ("id"), CONSTRAINT "socio_update_post_fk" FOREIGN KEY ("post_id") REFERENCES socio_posts(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_update_actor_fk" FOREIGN KEY ("actor_id") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "socio_post_updates_feed_idx" ON socio_post_updates(post_id,created_at ASC,id ASC);
