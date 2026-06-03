-- Migration 002: Thêm cột reason vào kpi_calendar
ALTER TABLE kpi_calendar ADD COLUMN IF NOT EXISTS reason TEXT;
