-- ========================================
-- SQL untuk membuat tabel 'products' di Supabase
-- ========================================
-- Copy & paste query ini ke Supabase SQL Editor
-- (Settings → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT,
  category TEXT NOT NULL,
  originalPrice INTEGER NOT NULL,
  price INTEGER NOT NULL,
  discount INTEGER DEFAULT 0,
  rating DECIMAL(3, 1) DEFAULT 4.5,
  reviews INTEGER DEFAULT 0,
  description TEXT,
  affiliateLink TEXT NOT NULL UNIQUE,
  platforms TEXT[] DEFAULT ARRAY[]::TEXT[],
  clicks INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- CREATE INDEX untuk performa query
-- ========================================
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);
CREATE INDEX IF NOT EXISTS products_name_idx ON products(name);

-- ========================================
-- SET UP REALTIME (optional)
-- ========================================
-- Uncomment if you want realtime updates
-- ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- ========================================
-- SET UP ROW LEVEL SECURITY (RLS)
-- ========================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public select (everyone can view products)
CREATE POLICY "Allow public select" ON products
  FOR SELECT 
  USING (true);

-- Allow insert only from authenticated users
CREATE POLICY "Allow insert for authenticated" ON products
  FOR INSERT 
  WITH CHECK (true);

-- Allow update only from authenticated users
CREATE POLICY "Allow update for authenticated" ON products
  FOR UPDATE 
  USING (true);

-- Allow delete only from authenticated users
CREATE POLICY "Allow delete for authenticated" ON products
  FOR DELETE 
  USING (true);

-- ========================================
-- Jika ingin lebih aman, gunakan fungsi ini
-- ========================================
-- DROP POLICY IF EXISTS "Allow insert for authenticated" ON products;
-- 
-- CREATE POLICY "Allow insert from admin" ON products
--   FOR INSERT 
--   WITH CHECK (auth.jwt() ->> 'role' = 'admin');
