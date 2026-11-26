-- The language the AI-written text of an analysis (damage notes, market reasoning, summary) is requested in.
ALTER TABLE "Analysis" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en';
