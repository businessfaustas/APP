-- Where the customer is (given at sign-up), whether they finished the one-time setup, and the clean price researched in the export destination country.
ALTER TABLE "User" ADD COLUMN "country" TEXT;
ALTER TABLE "UserSettings" ADD COLUMN "onboardedAt" TIMESTAMP(3);
ALTER TABLE "Analysis" ADD COLUMN "destinationMarket" JSONB;

