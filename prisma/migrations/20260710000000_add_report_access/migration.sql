-- AlterTable
ALTER TABLE "Advisor" ADD COLUMN "reportToken" TEXT;
ALTER TABLE "Advisor" ADD COLUMN "reportEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Advisor" ADD COLUMN "reportLastViewed" TIMESTAMP(3);
ALTER TABLE "Advisor" ADD COLUMN "initialScore" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "Advisor_reportToken_key" ON "Advisor"("reportToken");
