-- =============================================
-- PRODUCTION DASHBOARD - Database Schema v2
-- =============================================

-- Bảng Daily KPI (Safety, Quality, Delivery, Cost)
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

-- Bảng Action Plan
CREATE TABLE IF NOT EXISTS action_plan (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
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
    archived BOOLEAN DEFAULT FALSE,
    UNIQUE(month, year)
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
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    content TEXT NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
-- DỮ LIỆU MẪU
-- =============================================

INSERT INTO good_news (content, created_by) VALUES
    ('Sản phẩm A, B được vào danh mục bảo hiểm của các bệnh viện', 'QC'),
    ('Giai đoạn pha chế A, B đã hoàn thành được 1 lô trong 1 ca', 'PD')
ON CONFLICT DO NOTHING;

INSERT INTO monthly_star (month, year, employee_name, content, created_by) VALUES
    (EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
     'Nguyễn Văn A', 'Đã phát hiện Hồ sơ lô sai thông tin mã số bộ khuôn lắp đặt máy ép vì....', 'QA')
ON CONFLICT (month, year) DO NOTHING;

INSERT INTO announcements (content, created_by) VALUES
    ('Không mang điện thoại di động vào khu vực sản xuất', 'QA')
ON CONFLICT DO NOTHING;

INSERT INTO problems (department, description, severity, reported_by) VALUES
    ('Kế hoạch', 'Tốc độ sản xuất hiện tại không kịp tiến độ giao hàng cho thị trường đối với sản phẩm A, B, C', 'critical', 'PD')
ON CONFLICT DO NOTHING;

INSERT INTO action_plan (date, phenomenon, rootcause, action, pic, status, created_by) VALUES
    (CURRENT_DATE, 'Máy ép #3 dừng đột ngột', 'Hỏng sensor nhiệt', 'Thay sensor mới', 'Trần Văn B', 'Open', 'PD')
ON CONFLICT DO NOTHING;

INSERT INTO release_coa (content, created_by) VALUES
    ('COA lô SP-2024-001 đã ban hành', 'PD')
ON CONFLICT DO NOTHING;

INSERT INTO others (content, created_by) VALUES
    ('Lịch bảo trì máy móc định kỳ tháng 5', 'QC')
ON CONFLICT DO NOTHING;
