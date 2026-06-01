-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fio" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "orderNum" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'novy',
    "track" TEXT,
    "logistic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "prodType" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "glass" TEXT NOT NULL,
    "opening" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "moskit" BOOLEAN NOT NULL DEFAULT false,
    "pocket" BOOLEAN NOT NULL DEFAULT false,
    "install" BOOLEAN NOT NULL DEFAULT false,
    "extraLockType" TEXT,
    "extraLockCount" INTEGER,
    "extraZipperType" TEXT,
    "extraZipperLen" INTEGER,
    "extraWorkPrice" DOUBLE PRECISION,
    "extraWorkDesc" TEXT,
    "materialCost" DOUBLE PRECISION,
    "fittingsCost" DOUBLE PRECISION,
    "moskitCost" DOUBLE PRECISION,
    "pocketCost" DOUBLE PRECISION,
    "extraLockCost" DOUBLE PRECISION,
    "extraZipperCost" DOUBLE PRECISION,
    "glassSurcharge" DOUBLE PRECISION,
    "installCost" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "materialPvc" DOUBLE PRECISION NOT NULL DEFAULT 950,
    "materialScreen" DOUBLE PRECISION NOT NULL DEFAULT 1250,
    "materialOxford" DOUBLE PRECISION NOT NULL DEFAULT 1150,
    "moskit" DOUBLE PRECISION NOT NULL DEFAULT 680,
    "pocket" DOUBLE PRECISION NOT NULL DEFAULT 380,
    "extraLockRotary" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "extraLockFrench" DOUBLE PRECISION NOT NULL DEFAULT 120,
    "extraZipperSpiral" DOUBLE PRECISION NOT NULL DEFAULT 340,
    "extraZipperTractor" DOUBLE PRECISION NOT NULL DEFAULT 540,
    "glassTint" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "install" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "Client"("userId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_clientId_idx" ON "Order"("clientId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceList_userId_key" ON "PriceList"("userId");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
