-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SCRAPING',
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "scheduleMinutes" INTEGER NOT NULL,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastCheckedAt" DATETIME,
    "lastSuccessAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "category" TEXT,
    "rating" REAL,
    "reviewsCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "products_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "originalPrice" REAL NOT NULL,
    "offerPrice" REAL NOT NULL,
    "discountPercent" REAL NOT NULL,
    "shippingCost" REAL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "affiliateUrl" TEXT NOT NULL,
    "dedupeHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "offers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "shippingCost" REAL,
    "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offerId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clicks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offerId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "ipHash" TEXT,
    "userAgent" TEXT,
    "clickedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clicks_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_name_key" ON "sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sources_slug_key" ON "sources"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_sourceId_externalId_key" ON "products"("sourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "offers_dedupeHash_key" ON "offers"("dedupeHash");

-- CreateIndex
CREATE INDEX "offers_productId_idx" ON "offers"("productId");

-- CreateIndex
CREATE INDEX "offers_status_idx" ON "offers"("status");

-- CreateIndex
CREATE INDEX "history_productId_observedAt_idx" ON "history"("productId", "observedAt");

-- CreateIndex
CREATE INDEX "messages_status_idx" ON "messages"("status");

-- CreateIndex
CREATE INDEX "clicks_offerId_idx" ON "clicks"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "logs_level_createdAt_idx" ON "logs"("level", "createdAt");
