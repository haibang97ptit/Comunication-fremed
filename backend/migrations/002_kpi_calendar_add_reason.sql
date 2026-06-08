-- Migration 002: Thêm cột reason vào kpi_calendar
ALTER TABLE kpi_calendar ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE release_coa ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);
ALTER TABLE release_coa ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;