CREATE TABLE IF NOT EXISTS "socio_reactions" (
  "post_id" UUID NOT NULL, "user_id" UUID NOT NULL, "kind" TEXT NOT NULL DEFAULT 'SUPPORT', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "socio_reactions_pkey" PRIMARY KEY ("post_id","user_id"), CONSTRAINT "socio_reactions_post_fk" FOREIGN KEY ("post_id") REFERENCES socio_posts(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_reactions_user_fk" FOREIGN KEY ("user_id") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_reactions_kind_check" CHECK ("kind"='SUPPORT')
);
ALTER TABLE socio_posts ADD COLUMN IF NOT EXISTS "comments_locked" BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS "socio_corroborations" (
  "post_id" UUID NOT NULL, "user_id" UUID NOT NULL, "kind" TEXT NOT NULL DEFAULT 'AFFECTED', "eligibility_status" TEXT NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "reviewed_at" TIMESTAMP(3),
  CONSTRAINT "socio_corroborations_pkey" PRIMARY KEY ("post_id","user_id"), CONSTRAINT "socio_corroborations_post_fk" FOREIGN KEY ("post_id") REFERENCES socio_posts(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_corroborations_user_fk" FOREIGN KEY ("user_id") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_corroborations_kind_check" CHECK ("kind"='AFFECTED'), CONSTRAINT "socio_corroborations_status_check" CHECK ("eligibility_status" IN ('PENDING','VERIFIED','REJECTED'))
);
CREATE INDEX IF NOT EXISTS "socio_corroborations_verified_idx" ON socio_corroborations(post_id,eligibility_status);
CREATE TABLE IF NOT EXISTS "socio_comments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "post_id" UUID NOT NULL, "parent_id" UUID, "author_id" UUID NOT NULL, "alias" TEXT NOT NULL, "body" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ACTIVE', "revision" INTEGER NOT NULL DEFAULT 1, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "socio_comments_pkey" PRIMARY KEY ("id"), CONSTRAINT "socio_comments_post_fk" FOREIGN KEY ("post_id") REFERENCES socio_posts(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_comments_parent_fk" FOREIGN KEY ("parent_id") REFERENCES socio_comments(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_comments_author_fk" FOREIGN KEY ("author_id") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_comments_status_check" CHECK ("status" IN ('ACTIVE','HIDDEN','DELETED','LOCKED'))
);
CREATE INDEX IF NOT EXISTS "socio_comments_feed_idx" ON socio_comments(post_id,status,created_at ASC,id ASC);
CREATE TABLE IF NOT EXISTS "socio_comment_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "comment_id" UUID NOT NULL, "revision" INTEGER NOT NULL, "body" TEXT NOT NULL, "edited_by" UUID NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "socio_comment_revisions_pkey" PRIMARY KEY ("id"), CONSTRAINT "socio_comment_revisions_comment_fk" FOREIGN KEY ("comment_id") REFERENCES socio_comments(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_comment_revisions_user_fk" FOREIGN KEY ("edited_by") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "socio_comment_revisions_unique" UNIQUE (comment_id,revision)
);
CREATE TABLE IF NOT EXISTS "socio_content_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "post_id" UUID, "comment_id" UUID, "reporter_id" UUID NOT NULL, "reason" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "socio_content_reports_pkey" PRIMARY KEY ("id"), CONSTRAINT "socio_content_reports_post_fk" FOREIGN KEY ("post_id") REFERENCES socio_posts(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_content_reports_comment_fk" FOREIGN KEY ("comment_id") REFERENCES socio_comments(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_content_reports_user_fk" FOREIGN KEY ("reporter_id") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_content_reports_target_check" CHECK ((post_id IS NOT NULL) <> (comment_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS "socio_content_reports_queue_idx" ON socio_content_reports(status,created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS "socio_post_report_open_unique" ON socio_content_reports(reporter_id,post_id) WHERE status='OPEN' AND post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "socio_comment_report_open_unique" ON socio_content_reports(reporter_id,comment_id) WHERE status='OPEN' AND comment_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS "socio_moderation_cases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "post_id" UUID, "comment_id" UUID, "content_report_id" UUID, "status" TEXT NOT NULL DEFAULT 'OPEN', "reason" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "socio_moderation_cases_pkey" PRIMARY KEY ("id"), CONSTRAINT "socio_cases_post_fk" FOREIGN KEY ("post_id") REFERENCES socio_posts(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_cases_comment_fk" FOREIGN KEY ("comment_id") REFERENCES socio_comments(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_cases_report_fk" FOREIGN KEY ("content_report_id") REFERENCES socio_content_reports(id) ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT "socio_cases_target_check" CHECK ((post_id IS NOT NULL) OR (comment_id IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS "socio_moderation_actions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "case_id" UUID NOT NULL, "action" TEXT NOT NULL, "reason" TEXT NOT NULL, "actor_id" UUID NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "socio_moderation_actions_pkey" PRIMARY KEY ("id"), CONSTRAINT "socio_actions_case_fk" FOREIGN KEY ("case_id") REFERENCES socio_moderation_cases(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_actions_actor_fk" FOREIGN KEY ("actor_id") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "socio_moderation_appeals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "case_id" UUID NOT NULL, "appellant_id" UUID NOT NULL, "reason" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN', "reviewed_by" UUID, "reviewed_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "socio_moderation_appeals_pkey" PRIMARY KEY ("id"), CONSTRAINT "socio_appeals_case_fk" FOREIGN KEY ("case_id") REFERENCES socio_moderation_cases(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_appeals_appellant_fk" FOREIGN KEY ("appellant_id") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_appeals_reviewer_fk" FOREIGN KEY ("reviewed_by") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "socio_appeals_open_unique" ON socio_moderation_appeals(case_id,appellant_id) WHERE status='OPEN';
CREATE TABLE IF NOT EXISTS "socio_user_controls" (
  "user_id" UUID NOT NULL, "target_user_id" UUID NOT NULL, "kind" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "socio_user_controls_pkey" PRIMARY KEY ("user_id","target_user_id","kind"), CONSTRAINT "socio_controls_user_fk" FOREIGN KEY ("user_id") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_controls_target_fk" FOREIGN KEY ("target_user_id") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "socio_controls_kind_check" CHECK ("kind" IN ('BLOCK','MUTE')), CONSTRAINT "socio_controls_self_check" CHECK ("user_id" <> "target_user_id")
);
