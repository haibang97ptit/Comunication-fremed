# 🏭 Production Dashboard - Thông Tin Sản Xuất

Dashboard real-time hiển thị thông tin sản xuất, truyền tín hiệu giữa các bộ phận.

## 📦 Cấu trúc project

```
production-dashboard/
├── docker-compose.yml          # Chạy toàn bộ bằng Docker
├── backend/
│   ├── server.js               # Node.js + Express + Socket.IO
│   ├── config/
│   │   ├── db.js               # Kết nối PostgreSQL
│   │   └── init.sql            # Tạo bảng + dữ liệu mẫu
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.js              # React Dashboard chính
│   │   ├── App.css             # Toàn bộ CSS
│   │   └── index.js            # Entry point
│   ├── public/index.html
│   ├── nginx.conf              # Nginx cho production
│   ├── Dockerfile
│   └── package.json
└── README.md
```

## 🚀 Cách 1: Chạy bằng Docker (Khuyến nghị)

```bash
# Clone/copy project vào máy
cd production-dashboard

# Chạy toàn bộ (PostgreSQL + Backend + Frontend)
docker-compose up --build

# Truy cập:
# Dashboard:  http://localhost:3000
# API:        http://localhost:3001/api/dashboard
```

## 💻 Cách 2: Chạy thủ công trên Windows (không Docker)

### Bước 1: Cài PostgreSQL
- Tải PostgreSQL từ https://www.postgresql.org/download/windows/
- Cài đặt, nhớ mật khẩu postgres
- Mở pgAdmin, tạo database: `production_dashboard`
- Tạo user: `dashboard_user` / password: `dashboard_pass_2024`
- Chạy file `backend/config/init.sql` trong pgAdmin

### Bước 2: Chạy Backend
```bash
cd backend
npm install
node server.js
```
→ Server chạy tại http://localhost:3001

### Bước 3: Chạy Frontend
```bash
cd frontend
npm install
npm start
```
→ Dashboard mở tại http://localhost:3000

## 🔧 Cấu hình

### Biến môi trường Backend
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| PORT | 3001 | Port backend |
| DB_HOST | localhost | PostgreSQL host |
| DB_PORT | 5432 | PostgreSQL port |
| DB_NAME | production_dashboard | Tên database |
| DB_USER | dashboard_user | Username |
| DB_PASSWORD | dashboard_pass_2024 | Password |

### Biến môi trường Frontend
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| REACT_APP_SOCKET_URL | http://localhost:3001 | WebSocket URL |
| REACT_APP_API_URL | http://localhost:3001/api | API URL |

## 📡 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/dashboard | Lấy toàn bộ dữ liệu dashboard |
| GET | /api/kpi?date=YYYY-MM-DD | Lấy KPI theo ngày |
| PUT | /api/kpi/:type | Cập nhật KPI (safety/quality/delivery/cost) |
| GET | /api/good-news | Lấy tin tốt hôm nay |
| POST | /api/good-news | Thêm tin tốt mới |
| GET | /api/monthly-star | Lấy ngôi sao tháng |
| PUT | /api/monthly-star | Cập nhật ngôi sao tháng |
| GET | /api/announcements | Lấy thông báo hôm nay |
| POST | /api/announcements | Thêm thông báo |
| GET | /api/problems | Lấy danh sách sự cố |
| POST | /api/problems | Báo cáo sự cố mới |
| PUT | /api/problems/:id/resolve | Đánh dấu đã xử lý |

## 🔌 WebSocket Events

| Event | Hướng | Mô tả |
|-------|-------|-------|
| kpi-updated | Server → Client | KPI được cập nhật |
| good-news-added | Server → Client | Tin tốt mới |
| monthly-star-updated | Server → Client | Ngôi sao tháng cập nhật |
| announcement-added | Server → Client | Thông báo mới |
| new-problem | Server → Client | Sự cố mới (trigger alert nếu critical) |
| problem-resolved | Server → Client | Sự cố đã xử lý |
| submit-problem | Client → Server | Gửi sự cố mới |

## 🖥️ Dashboard Features
- **2 slide tự chuyển mỗi 15 giây**
  - Slide 1: Daily KPI + Tin tốt + Ngôi sao tháng + Thông báo
  - Slide 2: Kế hoạch sản xuất + Phân ca + New Problem
- **Real-time updates** qua WebSocket
- **Cảnh báo nghiêm trọng**: còi báo động + màn hình đỏ nhấp nháy + banner + rung trang
- **Đồng hồ real-time** + thanh countdown chuyển slide
