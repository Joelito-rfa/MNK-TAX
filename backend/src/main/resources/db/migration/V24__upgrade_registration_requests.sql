-- V24: Upgrade registration_requests for full workflow
ALTER TABLE registration_requests ADD COLUMN reference VARCHAR(30);
ALTER TABLE registration_requests ADD COLUMN request_type VARCHAR(30) DEFAULT 'OTHER';
ALTER TABLE registration_requests ADD COLUMN first_name VARCHAR(80);
ALTER TABLE registration_requests ADD COLUMN last_name VARCHAR(80);
ALTER TABLE registration_requests ADD COLUMN phone VARCHAR(30);
ALTER TABLE registration_requests ADD COLUMN nif VARCHAR(30);
ALTER TABLE registration_requests ADD COLUMN address VARCHAR(500);
ALTER TABLE registration_requests ADD COLUMN position VARCHAR(100);
ALTER TABLE registration_requests ADD COLUMN tax_center VARCHAR(50);
ALTER TABLE registration_requests ADD COLUMN rejection_reason VARCHAR(1000);
ALTER TABLE registration_requests ADD COLUMN assigned_to VARCHAR(50);
ALTER TABLE registration_requests ADD COLUMN assigned_at TIMESTAMP;
ALTER TABLE registration_requests ADD COLUMN updated_at TIMESTAMP;

-- Generate references for existing records
UPDATE registration_requests SET reference = 'REG-2026-' || LPAD(CAST(id AS VARCHAR), 6, '0') WHERE reference IS NULL;

-- Make reference NOT NULL after backfill
ALTER TABLE registration_requests ALTER COLUMN reference SET NOT NULL;

-- Unique constraint on reference
ALTER TABLE registration_requests ADD CONSTRAINT uk_registration_reference UNIQUE (reference);

-- Indexes
CREATE INDEX idx_registration_status ON registration_requests(status);
CREATE INDEX idx_registration_email ON registration_requests(email);
CREATE INDEX idx_registration_nif ON registration_requests(nif);
CREATE INDEX idx_registration_created ON registration_requests(created_at);
CREATE INDEX idx_registration_reference ON registration_requests(reference);
CREATE INDEX idx_registration_type ON registration_requests(request_type);
