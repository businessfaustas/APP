-- CreateTable
CREATE TABLE "StoredObject" (
    "path" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredObject_pkey" PRIMARY KEY ("path")
);
