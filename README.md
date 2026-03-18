# Hướng dẫn cài đặt và chạy chương trình

## 1. Giới thiệu nhanh
Dự án gồm 2 cách chạy:

- Bản Web (khuyến nghị): chạy server Flask, mở trình duyệt tại http://127.0.0.1:5000
- Bản Desktop camera: chạy trực tiếp bằng OpenCV + MediaPipe

## 2. Yêu cầu hệ thống

- Windows 10/11
- Python 3.10 trở lên (đã thử tốt với Python 3.12)
- Webcam hoạt động bình thường
- Kết nối Internet để cài thư viện lần đầu

Nếu muốn dùng đầy đủ tính năng đăng nhập, lịch sử, thống kê:

- SQL Server
- ODBC Driver 17 for SQL Server

## 3. Cài đặt môi trường Python

Mở PowerShell tại thư mục dự án, sau đó chạy:

    python -m venv .venv
    .\.venv\Scripts\Activate.ps1

Nếu PowerShell chặn script, chạy tạm lệnh sau rồi kích hoạt lại:

    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

## 4. Cài thư viện cần thiết

### 4.1. Thư viện để chạy game Web + Desktop

    pip install flask pyodbc opencv-python mediapipe numpy pillow

### 4.2. Thư viện bổ sung (nếu cần tạo báo cáo Word)

    pip install python-docx

## 5. Cấu hình cơ sở dữ liệu (tùy chọn nhưng khuyến nghị)

### 5.1. Tạo database

- Mở SQL Server Management Studio
- Mở file SQL sau và chạy toàn bộ script:
  - database/RPS_Game_Database.sql

Script sẽ tạo database KBB_Game, bảng và stored procedures.

### 5.2. Cập nhật thông tin kết nối

Mở file sau:

- database/ket_noi_db.py

Sửa phần CAU_HINH cho đúng máy của bạn:

- server
- database
- username
- password

Ví dụ:

    CAU_HINH = {
        'server': r'TEN_MAY\SQLEXPRESS',
        'database': 'KBB_Game',
        'username': 'sa',
        'password': 'mat_khau_cua_ban'
    }

Lưu ý: nếu không kết nối được DB, bản Web vẫn chạy ở chế độ khách (không lưu lịch sử).

## 6. Chạy chương trình

## 6.1. Chạy bản Web (khuyến nghị)

Sau khi đã kích hoạt môi trường:

    python run_web.py

Khi chạy thành công:

- Server tại: http://127.0.0.1:5000
- Trình duyệt sẽ tự mở
- Nhấn Ctrl + C để dừng server

## 6.2. Chạy bản Desktop camera

    python ai.py

Bản này mở cửa sổ OpenCV để chơi trực tiếp bằng cử chỉ tay trước webcam.

## 7. Kiểm tra nhanh sau khi chạy Web

- Mở được trang chính
- Vào được game, camera nhận diện được tay
- Có thể chơi ở chế độ khách
- Nếu DB đã cấu hình đúng: đăng ký/đăng nhập và lưu lịch sử hoạt động

## 8. Lỗi thường gặp và cách xử lý

### 8.1. Lỗi import hoặc thiếu thư viện

Cài lại thư viện:

    pip install -U flask pyodbc opencv-python mediapipe numpy pillow

### 8.2. Lỗi pyodbc hoặc không kết nối SQL Server

- Kiểm tra đã cài ODBC Driver 17 for SQL Server
- Kiểm tra SQL Server đang chạy
- Kiểm tra lại server, username, password trong file cấu hình

### 8.3. Không mở được camera

- Đóng ứng dụng khác đang dùng webcam
- Kiểm tra quyền Camera trong Windows Settings
- Thử khởi động lại máy và chạy lại chương trình

### 8.4. PowerShell báo không cho chạy Activate.ps1

Chạy:

    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

rồi kích hoạt lại .venv.

## 9. Cấu trúc file chính

- run_web.py: server Flask và API
- ai.py: game desktop nhận diện cử chỉ
- index.html, app.js, styles.css: giao diện web
- database/ket_noi_db.py: module kết nối database
- database/RPS_Game_Database.sql: script tạo database

---

Nếu cần, có thể tạo thêm file requirements.txt để cài đặt nhanh bằng một lệnh pip install -r requirements.txt.
