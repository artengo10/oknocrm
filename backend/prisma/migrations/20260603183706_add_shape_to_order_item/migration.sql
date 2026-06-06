-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "shape" TEXT NOT NULL DEFAULT 'rect',
ALTER COLUMN "prodType" SET DEFAULT 'window',
ALTER COLUMN "material" SET DEFAULT 'pvc',
ALTER COLUMN "color" SET DEFAULT 'brown';
