-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "competencyEvidence" JSONB,
ADD COLUMN     "conceptCoverage" JSONB,
ADD COLUMN     "rubricScores" JSONB;
