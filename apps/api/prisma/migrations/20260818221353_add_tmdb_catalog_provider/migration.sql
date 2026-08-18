-- AlterEnum
ALTER TYPE "CatalogProvider" ADD VALUE 'TMDB';

-- AlterTable
ALTER TABLE "movies" ADD COLUMN     "catalogSourceId" TEXT;
