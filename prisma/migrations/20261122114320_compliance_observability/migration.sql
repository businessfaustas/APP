-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ageConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "emailOptOut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT;

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "props" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebVital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "rating" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "device" TEXT NOT NULL DEFAULT 'desktop',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebVital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorGroup" (
    "fingerprint" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "path" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ErrorGroup_pkey" PRIMARY KEY ("fingerprint")
);

-- CreateIndex
CREATE INDEX "StripeEvent_createdAt_idx" ON "StripeEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "WebVital_name_createdAt_idx" ON "WebVital"("name", "createdAt");

-- CreateIndex
CREATE INDEX "ErrorGroup_lastSeen_idx" ON "ErrorGroup"("lastSeen");
