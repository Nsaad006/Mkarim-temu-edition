-- Free Shipping Database Migration
-- Run this SQL script in your PostgreSQL database if prisma db push fails

-- Add freeShippingEnabled column to Settings table
ALTER TABLE "Settings" 
ADD COLUMN IF NOT EXISTS "freeShippingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Add freeShippingThreshold column to Settings table
ALTER TABLE "Settings" 
ADD COLUMN IF NOT EXISTS "freeShippingThreshold" INTEGER NOT NULL DEFAULT 0;

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'Settings' 
AND column_name IN ('freeShippingEnabled', 'freeShippingThreshold');

-- Optional: Set your initial values
-- UPDATE "Settings" 
-- SET "freeShippingEnabled" = true, 
--     "freeShippingThreshold" = 5000
-- WHERE id = 'global-settings';
