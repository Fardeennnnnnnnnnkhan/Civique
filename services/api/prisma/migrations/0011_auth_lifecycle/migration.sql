-- M2: single-use password recovery and privileged-account invitation tokens.
CREATE TYPE "AuthTokenPurpose" AS ENUM ('INVITATION', 'PASSWORD_RESET');

CREATE TABLE "auth_action_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "purpose" "AuthTokenPurpose" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_action_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_action_tokens_token_hash_key" ON "auth_action_tokens"("token_hash");
CREATE INDEX "auth_action_tokens_user_id_purpose_expires_at_idx" ON "auth_action_tokens"("user_id", "purpose", "expires_at");
CREATE INDEX "auth_action_tokens_created_by_id_idx" ON "auth_action_tokens"("created_by_id");

ALTER TABLE "auth_action_tokens" ADD CONSTRAINT "auth_action_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_action_tokens" ADD CONSTRAINT "auth_action_tokens_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
