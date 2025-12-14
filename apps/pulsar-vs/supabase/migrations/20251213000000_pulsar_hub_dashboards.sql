-- ============================================================================
-- Pulsar Hub Dashboard Configuration
-- ============================================================================
-- This table stores dashboard visibility and order configuration for Pulsar Hub
-- Similar to customer_dashboards in Nova, but for the Pulsar suite

CREATE TABLE IF NOT EXISTS pulsar_hub_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    deployment_id TEXT, -- Optional: for multi-tenant deployments
    dashboard_id TEXT NOT NULL, -- e.g., 'pulsar-gfx', 'pulsar-vs', 'pulsar-mcr', 'nexus'
    visible BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    access_level TEXT DEFAULT 'read', -- 'read', 'write', 'admin'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Ensure unique dashboard per customer/deployment
    UNIQUE(customer_id, deployment_id, dashboard_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pulsar_hub_dashboards_customer
    ON pulsar_hub_dashboards(customer_id);
CREATE INDEX IF NOT EXISTS idx_pulsar_hub_dashboards_deployment
    ON pulsar_hub_dashboards(deployment_id);

-- RLS Policies
ALTER TABLE pulsar_hub_dashboards ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own dashboard configs
CREATE POLICY "Users can view own dashboard config"
    ON pulsar_hub_dashboards
    FOR SELECT
    USING (auth.uid() = customer_id);

-- Allow users to update their own dashboard configs
CREATE POLICY "Users can update own dashboard config"
    ON pulsar_hub_dashboards
    FOR UPDATE
    USING (auth.uid() = customer_id);

-- Allow users to insert their own dashboard configs
CREATE POLICY "Users can insert own dashboard config"
    ON pulsar_hub_dashboards
    FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role has full access"
    ON pulsar_hub_dashboards
    FOR ALL
    USING (auth.role() = 'service_role');

-- Allow anon users to read (for public dashboards)
CREATE POLICY "Anon can read dashboard configs"
    ON pulsar_hub_dashboards
    FOR SELECT
    USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_pulsar_hub_dashboards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pulsar_hub_dashboards_updated_at
    BEFORE UPDATE ON pulsar_hub_dashboards
    FOR EACH ROW
    EXECUTE FUNCTION update_pulsar_hub_dashboards_updated_at();

-- Insert default dashboard configurations
-- These will be created when a user first accesses the hub
INSERT INTO pulsar_hub_dashboards (customer_id, deployment_id, dashboard_id, visible, order_index) VALUES
    (NULL, 'default', 'pulsar-gfx', true, 0),
    (NULL, 'default', 'pulsar-vs', true, 1),
    (NULL, 'default', 'pulsar-mcr', true, 2),
    (NULL, 'default', 'nexus', true, 3)
ON CONFLICT DO NOTHING;
