-- PRE-FLIGHT: abort if more than one org exists
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM users) > 1 THEN
    RAISE EXCEPTION 'Multi-org detected. Map org_id manually before running this migration.';
  END IF;
END $$;

-- Add org_id to all org-scoped tables
ALTER TABLE volunteers           ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE events               ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE applications         ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE members              ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE employees            ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE files                ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE folders              ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE training_courses     ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE training_assignments ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE training_completions ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE qr_campaigns         ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE qr_codes             ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE people_groups        ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE group_members        ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE message_templates    ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE auto_reminders       ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE sent_messages        ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE login_notifications  ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE invoices             ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE portal_settings      ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE audit_logs           ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE audit_logs           ADD COLUMN IF NOT EXISTS staff_session_id TEXT;
ALTER TABLE audit_logs           ADD COLUMN IF NOT EXISTS is_support_view BOOLEAN DEFAULT false;

-- Backfill
DO $$
DECLARE org_id_val TEXT;
BEGIN
  SELECT id INTO org_id_val FROM users LIMIT 1;
  UPDATE volunteers           SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE events               SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE applications         SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE members              SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE employees            SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE files                SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE folders              SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE training_courses     SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE training_assignments SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE training_completions SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE qr_campaigns         SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE qr_codes             SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE people_groups        SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE group_members        SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE message_templates    SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE auto_reminders       SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE sent_messages        SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE login_notifications  SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE invoices             SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE portal_settings      SET org_id = org_id_val WHERE org_id IS NULL;
  UPDATE audit_logs           SET org_id = org_id_val WHERE org_id IS NULL;
  -- org_settings: swap PK from 'default' to org user ID
  UPDATE org_settings SET id = org_id_val WHERE id = 'default';
END $$;
