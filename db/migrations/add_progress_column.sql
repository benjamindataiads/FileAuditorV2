
ALTER TABLE audits ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
