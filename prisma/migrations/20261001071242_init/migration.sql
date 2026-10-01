-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuctionSource" AS ENUM ('COPART', 'IAAI', 'BIDCARS', 'AUTOBIDMASTER', 'OTHER', 'MANUAL');

-- CreateEnum
CREATE TYPE "InputType" AS ENUM ('URL', 'VIN', 'TEXT', 'MANUAL', 'EXTENSION');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('GO', 'BE_CAUTIOUS', 'WALK_AWAY');

-- CreateEnum
CREATE TYPE "TitleCategory" AS ENUM ('CLEAN', 'SALVAGE', 'REBUILT', 'NON_REPAIRABLE', 'PARTS_ONLY', 'FLOOD', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RunCondition" AS ENUM ('RUNS_AND_DRIVES', 'STARTS', 'WONT_START', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "BuyerType" AS ENUM ('LICENSED_DEALER', 'PUBLIC_VIA_BROKER');

-- CreateEnum
CREATE TYPE "PartSource" AS ENUM ('OEM_NEW', 'AFTERMARKET', 'USED');

-- CreateEnum
CREATE TYPE "ExitStrategy" AS ENUM ('RETAIL_REBUILT', 'EXPORT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "creditsRemaining" INTEGER NOT NULL DEFAULT 3,
    "creditsResetAt" TIMESTAMP(3),
    "apiTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "homeZip" TEXT NOT NULL DEFAULT '77002',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "buyerType" "BuyerType" NOT NULL DEFAULT 'LICENSED_DEALER',
    "laborRate" INTEGER NOT NULL DEFAULT 70,
    "paintMaterialsPerHour" INTEGER NOT NULL DEFAULT 40,
    "partsSourcePreference" "PartSource" NOT NULL DEFAULT 'AFTERMARKET',
    "partsDiscountBps" INTEGER NOT NULL DEFAULT 0,
    "rebuiltFactorBps" INTEGER NOT NULL DEFAULT 7000,
    "listToSaleBps" INTEGER NOT NULL DEFAULT 9600,
    "targetProfitBps" INTEGER NOT NULL DEFAULT 1500,
    "targetProfitMin" INTEGER NOT NULL DEFAULT 2500,
    "transportCentsPerMile" INTEGER NOT NULL DEFAULT 150,
    "transportMin" INTEGER NOT NULL DEFAULT 150,
    "titleRegInspection" INTEGER NOT NULL DEFAULT 300,
    "storageDays" INTEGER NOT NULL DEFAULT 0,
    "storagePerDay" INTEGER NOT NULL DEFAULT 0,
    "holdingCostPerDay" INTEGER NOT NULL DEFAULT 8,
    "holdingDaysExpected" INTEGER NOT NULL DEFAULT 30,
    "sellingCostBps" INTEGER NOT NULL DEFAULT 200,
    "sellingCostFixed" INTEGER NOT NULL DEFAULT 0,
    "salesTaxBps" INTEGER NOT NULL DEFAULT 0,
    "brokerFee" INTEGER NOT NULL DEFAULT 0,
    "contingencyOverrideBps" INTEGER,
    "exitStrategy" "ExitStrategy" NOT NULL DEFAULT 'RETAIL_REBUILT',
    "exportProfileId" TEXT,
    "vatRecoverable" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "vin" TEXT NOT NULL,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "trim" TEXT,
    "bodyClass" TEXT,
    "driveType" TEXT,
    "engine" TEXT,
    "fuelType" TEXT,
    "transmission" TEXT,
    "vehicleClass" TEXT,
    "decoded" JSONB,
    "decodedAt" TIMESTAMP(3),
    "recalls" JSONB,
    "complaintsSummary" JSONB,
    "checksFetchedAt" TIMESTAMP(3),
    "history" JSONB,
    "historyProvider" TEXT,
    "historyFetchedAt" TIMESTAMP(3),

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("vin")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "source" "AuctionSource" NOT NULL,
    "sourceUrl" TEXT,
    "lotNumber" TEXT,
    "vin" TEXT,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "trim" TEXT,
    "odometer" INTEGER,
    "odometerUnit" TEXT NOT NULL DEFAULT 'mi',
    "odometerBrand" TEXT,
    "titleCategory" "TitleCategory" NOT NULL DEFAULT 'UNKNOWN',
    "titleRaw" TEXT,
    "titleState" TEXT,
    "primaryDamage" TEXT,
    "secondaryDamage" TEXT,
    "runCondition" "RunCondition" NOT NULL DEFAULT 'UNKNOWN',
    "hasKeys" BOOLEAN,
    "saleDate" TIMESTAMP(3),
    "saleStatus" TEXT,
    "currentBid" INTEGER,
    "buyNowPrice" INTEGER,
    "listedRetailValue" INTEGER,
    "yardName" TEXT,
    "yardCity" TEXT,
    "yardState" TEXT,
    "yardZip" TEXT,
    "sellerType" TEXT,
    "extractionMethod" TEXT NOT NULL,
    "rawData" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPhoto" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "originalUrl" TEXT,
    "storagePath" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT,
    "batchId" TEXT,
    "inputType" "InputType" NOT NULL,
    "inputValue" TEXT NOT NULL,
    "inputPayload" JSONB,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'QUEUED',
    "currentStep" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "settingsSnapshot" JSONB NOT NULL,
    "damage" JSONB,
    "repairEstimate" JSONB,
    "market" JSONB,
    "logistics" JSONB,
    "calcInput" JSONB,
    "calc" JSONB,
    "flags" JSONB,
    "checklist" JSONB,
    "narrative" TEXT,
    "verdict" "Verdict",
    "maxBid" INTEGER,
    "comfortBid" INTEGER,
    "breakEvenBid" INTEGER,
    "expectedProfit" INTEGER,
    "dealScore" INTEGER,
    "userOverrides" JSONB,
    "dataSources" JSONB,
    "aiModel" TEXT,
    "aiCostUsd" DOUBLE PRECISION,
    "shareToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "analysisId" TEXT,
    "notes" TEXT,
    "myMaxBid" INTEGER,
    "remindAt" TIMESTAMP(3),
    "remindedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealJournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT,
    "vin" TEXT,
    "title" TEXT NOT NULL,
    "estimatedRepair" INTEGER,
    "estimatedProfit" INTEGER,
    "purchasePrice" INTEGER,
    "auctionFeesActual" INTEGER,
    "transportActual" INTEGER,
    "partsActual" INTEGER,
    "laborActual" INTEGER,
    "otherCostsActual" INTEGER,
    "salePrice" INTEGER,
    "purchasedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealJournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeSchedule" (
    "id" TEXT NOT NULL,
    "source" "AuctionSource" NOT NULL,
    "buyerType" "BuyerType" NOT NULL,
    "name" TEXT NOT NULL,
    "buyerFeeTiers" JSONB NOT NULL,
    "onlineBidFeeTiers" JSONB NOT NULL,
    "fixedFees" JSONB NOT NULL,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT true,
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartPriceReference" (
    "id" TEXT NOT NULL,
    "partKey" TEXT NOT NULL,
    "vehicleClass" TEXT NOT NULL,
    "source" "PartSource" NOT NULL,
    "priceLow" INTEGER NOT NULL,
    "priceHigh" INTEGER NOT NULL,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartPriceReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaborReference" (
    "partKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'body_panel',
    "bodyHoursLow" DOUBLE PRECISION NOT NULL,
    "bodyHoursHigh" DOUBLE PRECISION NOT NULL,
    "paintHoursLow" DOUBLE PRECISION NOT NULL,
    "paintHoursHigh" DOUBLE PRECISION NOT NULL,
    "mechHoursLow" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mechHoursHigh" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "LaborReference_pkey" PRIMARY KEY ("partKey")
);

-- CreateTable
CREATE TABLE "ExportProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "departurePortZip" TEXT NOT NULL,
    "inlandToPortCentsPerMile" INTEGER NOT NULL,
    "portAndLoading" INTEGER NOT NULL,
    "oceanFreight" INTEGER NOT NULL,
    "marineInsuranceBps" INTEGER NOT NULL,
    "destinationPortFees" INTEGER NOT NULL,
    "customsBrokerFee" INTEGER NOT NULL,
    "dutyBps" INTEGER NOT NULL,
    "vatBps" INTEGER NOT NULL,
    "vatRecoverableDefault" BOOLEAN NOT NULL DEFAULT false,
    "registrationTax" INTEGER NOT NULL,
    "complianceConversion" INTEGER NOT NULL,
    "deliveryFromPort" INTEGER NOT NULL,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ExportProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "analysisId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCache" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiCache_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT,
    "purpose" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitHit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_apiTokenHash_key" ON "User"("apiTokenHash");

-- CreateIndex
CREATE INDEX "Listing_vin_idx" ON "Listing"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_source_lotNumber_key" ON "Listing"("source", "lotNumber");

-- CreateIndex
CREATE INDEX "ListingPhoto_listingId_idx" ON "ListingPhoto"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "Analysis_shareToken_key" ON "Analysis"("shareToken");

-- CreateIndex
CREATE INDEX "Analysis_userId_createdAt_idx" ON "Analysis"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Analysis_batchId_idx" ON "Analysis"("batchId");

-- CreateIndex
CREATE INDEX "WatchlistItem_remindAt_idx" ON "WatchlistItem"("remindAt");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_listingId_key" ON "WatchlistItem"("userId", "listingId");

-- CreateIndex
CREATE INDEX "DealJournalEntry_userId_createdAt_idx" ON "DealJournalEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FeeSchedule_source_buyerType_active_idx" ON "FeeSchedule"("source", "buyerType", "active");

-- CreateIndex
CREATE UNIQUE INDEX "PartPriceReference_partKey_vehicleClass_source_key" ON "PartPriceReference"("partKey", "vehicleClass", "source");

-- CreateIndex
CREATE INDEX "CreditLedger_userId_createdAt_idx" ON "CreditLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");

-- CreateIndex
CREATE INDEX "RateLimitHit_key_createdAt_idx" ON "RateLimitHit"("key", "createdAt");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_vin_fkey" FOREIGN KEY ("vin") REFERENCES "Vehicle"("vin") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPhoto" ADD CONSTRAINT "ListingPhoto_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealJournalEntry" ADD CONSTRAINT "DealJournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealJournalEntry" ADD CONSTRAINT "DealJournalEntry_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedger" ADD CONSTRAINT "CreditLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
