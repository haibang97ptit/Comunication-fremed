-- =============================================
-- PRODUCTION DASHBOARD - Database Schema v2
-- =============================================

-- Bảng Daily KPI (Safety, Quality, Delivery, Cost) - image upload
CREATE TABLE IF NOT EXISTS daily_kpi (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    kpi_type VARCHAR(20) NOT NULL CHECK (kpi_type IN ('safety', 'quality', 'delivery', 'cost')),
    image_url TEXT,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived BOOLEAN DEFAULT FALSE,
    UNIQUE(date, kpi_type)
);

-- Bảng KPI Calendar (vòng tròn 31 ngày × 2 ca)
CREATE TABLE IF NOT EXISTS kpi_calendar (
    id SERIAL PRIMARY KEY,
    kpi_type VARCHAR(20) NOT NULL CHECK (kpi_type IN ('safety', 'quality', 'delivery', 'cost')),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    day INTEGER NOT NULL,
    shift INTEGER NOT NULL CHECK (shift IN (1, 2)),
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    reason TEXT,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(kpi_type, year, month, day, shift)
);

-- Bảng Action Plan
CREATE TABLE IF NOT EXISTS action_plan (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    kpi_topic VARCHAR(20) CHECK (kpi_topic IN ('Safety', 'Quality', 'Delivery', 'Cost')),
    phenomenon TEXT NOT NULL,
    rootcause TEXT,
    action TEXT,
    pic VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Open',
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived BOOLEAN DEFAULT FALSE
);

-- Bảng Tin tốt / Good News
CREATE TABLE IF NOT EXISTS good_news (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    content TEXT NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived BOOLEAN DEFAULT FALSE
);

-- Bảng Ngôi sao tháng / Monthly Star
CREATE TABLE IF NOT EXISTS monthly_star (
    id SERIAL PRIMARY KEY,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    employee_name VARCHAR(200),
    employee_image TEXT,
    content TEXT NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived BOOLEAN DEFAULT FALSE
);

-- Bảng Thông báo / Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    content TEXT NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived BOOLEAN DEFAULT FALSE
);

-- Bảng Kế hoạch sản xuất tuần
CREATE TABLE IF NOT EXISTS weekly_production_plan (
    id SERIAL PRIMARY KEY,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    image_url TEXT,
    notes TEXT,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived BOOLEAN DEFAULT FALSE
);

-- Bảng Phân ca
CREATE TABLE IF NOT EXISTS shift_schedule (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
    image_url TEXT,
    notes TEXT,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived BOOLEAN DEFAULT FALSE
);

-- Bảng Ban hành COA / Release COA
CREATE TABLE IF NOT EXISTS release_coa (
    id SERIAL PRIMARY KEY,
    product VARCHAR(200) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    stage VARCHAR(100),
    submit_coa VARCHAR(200),
    approve_coa VARCHAR(200),
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    archived BOOLEAN DEFAULT FALSE
);

-- Bảng Sự cố / New Problems
CREATE TABLE IF NOT EXISTS problems (
    id SERIAL PRIMARY KEY,
    department VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    reported_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    archived BOOLEAN DEFAULT FALSE
);

-- Bảng Khác / Others
CREATE TABLE IF NOT EXISTS others (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    content TEXT NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived BOOLEAN DEFAULT FALSE
);

-- =============================================
-- KHÔNG CÓ DỮ LIỆU MẪU - DB TRỐNG KHI KHỞI TẠO
-- =============================================
