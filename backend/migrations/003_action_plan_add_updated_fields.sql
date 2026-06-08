-- Migration 003: Thêm updated_by và updated_at vào action_plan
ALTER TABLE action_plan ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);
ALTER TABLE action_plan ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
