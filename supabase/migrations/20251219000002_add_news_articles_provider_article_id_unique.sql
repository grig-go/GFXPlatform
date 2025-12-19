-- Add unique constraint on provider_article_id for news_articles table
-- This enables upsert operations using provider_article_id as the conflict target

CREATE UNIQUE INDEX IF NOT EXISTS idx_news_articles_provider_article_id
ON public.news_articles (provider_article_id)
WHERE provider_article_id IS NOT NULL;
