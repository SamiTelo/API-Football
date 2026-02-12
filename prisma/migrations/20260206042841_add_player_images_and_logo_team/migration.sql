-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "cloudinary_public_id" TEXT,
ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "cloudinary_logo_id" TEXT,
ADD COLUMN     "logo_url" TEXT;
