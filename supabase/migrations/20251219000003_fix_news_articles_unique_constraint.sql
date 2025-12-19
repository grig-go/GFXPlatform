-- Fix: Create a proper unique constraint on provider_article_id for ON CONFLICT to work
-- The partial index doesn't work with ON CONFLICT, we need a full unique constraint

-- First, drop the partial index if it exists
DROP INDEX IF EXISTS idx_news_articles_provider_article_id;

-- Create a proper unique constraint (not partial)
-- This will work with ON CONFLICT (provider_article_id)
ALTER TABLE public.news_articles
ADD CONSTRAINT news_articles_provider_article_id_unique
UNIQUE (provider_article_id);
