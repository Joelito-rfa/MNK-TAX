-- Profile module upgrade: add fields for sessions tracking and profile enrichment
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(80);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_center VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_user_agent VARCHAR(255);

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS user_agent VARCHAR(255);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);
