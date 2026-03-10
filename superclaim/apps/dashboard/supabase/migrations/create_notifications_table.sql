-- ═══════════════════════════════════════════════════════════════════
-- Notifications-tabell för realtids-notiser
-- Kör denna i Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. Skapa tabellen
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('reply', 'paid', 'escalated', 'draft', 'info', 'warning')),
    text TEXT NOT NULL,
    href TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index för snabb lookup
CREATE INDEX IF NOT EXISTS idx_notifications_org_unread
    ON notifications (org_id, created_at DESC)
    WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_org_created
    ON notifications (org_id, created_at DESC);

-- 3. RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org notifications"
    ON notifications FOR SELECT
    USING (org_id IN (
        SELECT id FROM organizations WHERE email = auth.jwt() ->> 'email'
    ));

CREATE POLICY "Users can update own org notifications"
    ON notifications FOR UPDATE
    USING (org_id IN (
        SELECT id FROM organizations WHERE email = auth.jwt() ->> 'email'
    ));

-- Service role (backend) kan göra allt
CREATE POLICY "Service role full access"
    ON notifications FOR ALL
    USING (auth.role() = 'service_role');

-- 4. Aktivera Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
