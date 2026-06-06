-- Add materialFabric to PriceList (with default so existing rows are updated)
ALTER TABLE "PriceList" ADD COLUMN IF NOT EXISTS "materialFabric" DOUBLE PRECISION NOT NULL DEFAULT 1100;

-- Add unique constraint on (userId, orderNum) to prevent race conditions
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_orderNum_key" UNIQUE ("userId", "orderNum");
