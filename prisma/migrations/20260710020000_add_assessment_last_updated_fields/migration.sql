-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN "lastUpdatedBy" TEXT;
ALTER TABLE "Assessment" ADD COLUMN "currentPhase" TEXT NOT NULL DEFAULT 'Initial Review';
