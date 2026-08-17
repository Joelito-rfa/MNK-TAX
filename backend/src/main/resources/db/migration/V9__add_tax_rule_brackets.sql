ALTER TABLE tax_rules ADD COLUMN brackets TEXT;

COMMENT ON COLUMN tax_rules.brackets IS 'Tranches progressives en JSON (ex: [{"upTo":50000000,"rate":0},{"upTo":100000000,"rate":10},{"upTo":null,"rate":20}])';
