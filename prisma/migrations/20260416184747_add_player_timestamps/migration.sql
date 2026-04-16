ALTER TABLE "Player"
ADD COLUMN "created_at" TIMESTAMP DEFAULT now(),
ADD COLUMN "updated_at" TIMESTAMP DEFAULT now();

UPDATE "Player"
SET "updated_at" = now()
WHERE "updated_at" IS NULL;

ALTER TABLE "Player"
ALTER COLUMN "updated_at" SET NOT NULL;