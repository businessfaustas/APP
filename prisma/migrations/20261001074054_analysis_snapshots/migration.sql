-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "damageFromPhotos" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "history" JSONB,
ADD COLUMN     "listingSnapshot" JSONB,
ADD COLUMN     "vehicleInfo" JSONB;
