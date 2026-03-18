-- ============================================
-- CƠ SỞ DỮ LIỆU GAME OẲN TÙ TÌ (KÉO BÚA BAO)
-- Phiên bản đơn giản: 3 bảng
-- Ngày tạo: 28/01/2026
-- ============================================

-- Tạo Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'KBB_Game')
BEGIN
    CREATE DATABASE KBB_Game;
END
GO

USE KBB_Game;
GO

-- ============================================
-- BẢNG 1: NguoiDung (Người dùng)
-- Lưu thông tin đăng nhập và thống kê
-- ============================================
IF OBJECT_ID('TranDau', 'U') IS NOT NULL DROP TABLE TranDau;
IF OBJECT_ID('KetQuaChungCuoc', 'U') IS NOT NULL DROP TABLE KetQuaChungCuoc;
IF OBJECT_ID('NguoiDung', 'U') IS NOT NULL DROP TABLE NguoiDung;
GO

CREATE TABLE NguoiDung (
    MaNguoiDung INT IDENTITY(1,1) PRIMARY KEY,      -- Mã người dùng (tự tăng)
    TenDangNhap NVARCHAR(50) NOT NULL UNIQUE,       -- Tên đăng nhập
    MatKhau NVARCHAR(100) NOT NULL,                 -- Mật khẩu (nên mã hóa)
    TenHienThi NVARCHAR(100),                       -- Tên hiển thị
    NgayTao DATETIME DEFAULT GETDATE(),             -- Ngày tạo tài khoản
    LanDangNhapCuoi DATETIME,                       -- Lần đăng nhập cuối
    TongSoThang INT DEFAULT 0,                      -- Tổng số trận thắng (từng ván)
    TongSoThua INT DEFAULT 0,                       -- Tổng số trận thua (từng ván)
    TongSoHoa INT DEFAULT 0,                        -- Tổng số trận hòa (từng ván)
    TongTranThang INT DEFAULT 0,                    -- Tổng trận chung cuộc thắng
    TongTranThua INT DEFAULT 0                      -- Tổng trận chung cuộc thua
);
GO

-- ============================================
-- BẢNG 2: TranDau (Kết quả từng ván chơi)
-- Lưu chi tiết từng lượt chơi
-- ============================================
CREATE TABLE TranDau (
    MaTranDau INT IDENTITY(1,1) PRIMARY KEY,        -- Mã trận đấu (tự tăng)
    MaNguoiDung INT NOT NULL,                       -- Mã người dùng
    LuaChonNguoiChoi NVARCHAR(10) NOT NULL,         -- Kéo/Búa/Bao
    LuaChonMayTinh NVARCHAR(10) NOT NULL,           -- Kéo/Búa/Bao
    KetQua NVARCHAR(10) NOT NULL,                   -- Thắng/Thua/Hòa
    ThoiGianChoi DATETIME DEFAULT GETDATE(),        -- Thời gian chơi
    
    CONSTRAINT FK_TranDau_NguoiDung FOREIGN KEY (MaNguoiDung) 
        REFERENCES NguoiDung(MaNguoiDung)
);
GO

-- ============================================
-- BẢNG 3: KetQuaChungCuoc (Kết quả trận đấu chung cuộc)
-- Lưu kết quả khi thắng/thua 3 ván
-- ============================================
CREATE TABLE KetQuaChungCuoc (
    MaKetQua INT IDENTITY(1,1) PRIMARY KEY,         -- Mã kết quả (tự tăng)
    MaNguoiDung INT NOT NULL,                       -- Mã người dùng
    KetQua NVARCHAR(10) NOT NULL,                   -- Thắng/Thua
    SoVanNguoiChoi INT NOT NULL,                    -- Số ván người chơi thắng
    SoVanMayTinh INT NOT NULL,                      -- Số ván máy tính thắng
    ThoiGianChoi DATETIME DEFAULT GETDATE(),        -- Thời gian kết thúc
    
    CONSTRAINT FK_KetQuaCC_NguoiDung FOREIGN KEY (MaNguoiDung) 
        REFERENCES NguoiDung(MaNguoiDung)
);
GO

-- ============================================
-- THỦ TỤC ĐĂNG KÝ
-- ============================================
CREATE OR ALTER PROCEDURE sp_DangKy
    @TenDangNhap NVARCHAR(50),
    @MatKhau NVARCHAR(100),
    @TenHienThi NVARCHAR(100) = NULL
AS
BEGIN
    -- Kiểm tra tên đăng nhập đã tồn tại
    IF EXISTS (SELECT 1 FROM NguoiDung WHERE TenDangNhap = @TenDangNhap)
    BEGIN
        SELECT 0 AS ThanhCong, N'Tên đăng nhập đã tồn tại!' AS ThongBao;
        RETURN;
    END
    
    -- Thêm người dùng mới
    INSERT INTO NguoiDung (TenDangNhap, MatKhau, TenHienThi)
    VALUES (@TenDangNhap, @MatKhau, ISNULL(@TenHienThi, @TenDangNhap));
    
    SELECT 1 AS ThanhCong, N'Đăng ký thành công!' AS ThongBao, SCOPE_IDENTITY() AS MaNguoiDung;
END
GO

-- ============================================
-- THỦ TỤC ĐĂNG NHẬP
-- ============================================
CREATE OR ALTER PROCEDURE sp_DangNhap
    @TenDangNhap NVARCHAR(50),
    @MatKhau NVARCHAR(100)
AS
BEGIN
    DECLARE @MaNguoiDung INT;
    
    -- Kiểm tra thông tin đăng nhập
    SELECT @MaNguoiDung = MaNguoiDung 
    FROM NguoiDung 
    WHERE TenDangNhap = @TenDangNhap AND MatKhau = @MatKhau;
    
    IF @MaNguoiDung IS NULL
    BEGIN
        SELECT 0 AS ThanhCong, N'Sai tên đăng nhập hoặc mật khẩu!' AS ThongBao, NULL AS MaNguoiDung;
        RETURN;
    END
    
    -- Cập nhật lần đăng nhập cuối
    UPDATE NguoiDung SET LanDangNhapCuoi = GETDATE() WHERE MaNguoiDung = @MaNguoiDung;
    
    SELECT 1 AS ThanhCong, N'Đăng nhập thành công!' AS ThongBao, @MaNguoiDung AS MaNguoiDung;
END
GO

-- ============================================
-- THỦ TỤC LƯU TRẬN ĐẤU
-- ============================================
CREATE OR ALTER PROCEDURE sp_LuuTranDau
    @MaNguoiDung INT,
    @LuaChonNguoiChoi NVARCHAR(10),
    @LuaChonMayTinh NVARCHAR(10)
AS
BEGIN
    DECLARE @KetQua NVARCHAR(10);
    
    -- Tính kết quả: Kéo thắng Bao, Bao thắng Búa, Búa thắng Kéo
    SET @KetQua = 
        CASE 
            WHEN @LuaChonNguoiChoi = @LuaChonMayTinh THEN N'Hòa'
            WHEN (@LuaChonNguoiChoi = N'Kéo' AND @LuaChonMayTinh = N'Bao') OR
                 (@LuaChonNguoiChoi = N'Bao' AND @LuaChonMayTinh = N'Búa') OR
                 (@LuaChonNguoiChoi = N'Búa' AND @LuaChonMayTinh = N'Kéo') THEN N'Thắng'
            ELSE N'Thua'
        END;
    
    -- Lưu trận đấu
    INSERT INTO TranDau (MaNguoiDung, LuaChonNguoiChoi, LuaChonMayTinh, KetQua)
    VALUES (@MaNguoiDung, @LuaChonNguoiChoi, @LuaChonMayTinh, @KetQua);
    
    -- Cập nhật thống kê
    UPDATE NguoiDung SET
        TongSoThang = TongSoThang + CASE WHEN @KetQua = N'Thắng' THEN 1 ELSE 0 END,
        TongSoThua = TongSoThua + CASE WHEN @KetQua = N'Thua' THEN 1 ELSE 0 END,
        TongSoHoa = TongSoHoa + CASE WHEN @KetQua = N'Hòa' THEN 1 ELSE 0 END
    WHERE MaNguoiDung = @MaNguoiDung;
    
    SELECT @KetQua AS KetQua, SCOPE_IDENTITY() AS MaTranDau;
END
GO

-- ============================================
-- THỦ TỤC LƯU KẾT QUẢ CHUNG CUỘC
-- Gọi khi người chơi hoặc máy thắng 3 ván
-- ============================================
CREATE OR ALTER PROCEDURE sp_LuuKetQuaChungCuoc
    @MaNguoiDung INT,
    @SoVanNguoiChoi INT,
    @SoVanMayTinh INT
AS
BEGIN
    DECLARE @KetQua NVARCHAR(10);
    
    -- Xác định kết quả: Người chơi thắng nếu đạt 3 ván trước
    SET @KetQua = CASE WHEN @SoVanNguoiChoi >= 3 THEN N'Thắng' ELSE N'Thua' END;
    
    -- Lưu kết quả chung cuộc
    INSERT INTO KetQuaChungCuoc (MaNguoiDung, KetQua, SoVanNguoiChoi, SoVanMayTinh)
    VALUES (@MaNguoiDung, @KetQua, @SoVanNguoiChoi, @SoVanMayTinh);
    
    -- Cập nhật thống kê trận chung cuộc cho người dùng
    UPDATE NguoiDung SET
        TongTranThang = TongTranThang + CASE WHEN @KetQua = N'Thắng' THEN 1 ELSE 0 END,
        TongTranThua = TongTranThua + CASE WHEN @KetQua = N'Thua' THEN 1 ELSE 0 END
    WHERE MaNguoiDung = @MaNguoiDung;
    
    SELECT @KetQua AS KetQua, SCOPE_IDENTITY() AS MaKetQua;
END
GO

-- ============================================
-- THỦ TỤC LẤY LỊCH SỬ CHUNG CUỘC
-- ============================================
CREATE OR ALTER PROCEDURE sp_LayLichSuChungCuoc
    @MaNguoiDung INT,
    @SoLuong INT = 20
AS
BEGIN
    SELECT TOP (@SoLuong)
        MaKetQua,
        KetQua,
        SoVanNguoiChoi,
        SoVanMayTinh,
        ThoiGianChoi
    FROM KetQuaChungCuoc 
    WHERE MaNguoiDung = @MaNguoiDung
    ORDER BY ThoiGianChoi DESC;
END
GO

-- ============================================
-- THỦ TỤC LẤY THỐNG KÊ
-- ============================================
CREATE OR ALTER PROCEDURE sp_LayThongKe
    @MaNguoiDung INT
AS
BEGIN
    SELECT 
        TenDangNhap,
        TenHienThi,
        TongSoThang,
        TongSoThua,
        TongSoHoa,
        (TongSoThang + TongSoThua + TongSoHoa) AS TongSoTran,
        TongTranThang,
        TongTranThua
    FROM NguoiDung 
    WHERE MaNguoiDung = @MaNguoiDung;
END
GO

-- ============================================
-- THỦ TỤC LẤY LỊCH SỬ TRẬN ĐẤU
-- ============================================
CREATE OR ALTER PROCEDURE sp_LayLichSu
    @MaNguoiDung INT,
    @SoLuong INT = 20
AS
BEGIN
    SELECT TOP (@SoLuong)
        MaTranDau,
        LuaChonNguoiChoi,
        LuaChonMayTinh,
        KetQua,
        ThoiGianChoi
    FROM TranDau 
    WHERE MaNguoiDung = @MaNguoiDung
    ORDER BY ThoiGianChoi DESC;
END
GO

PRINT N'✅ Database KBB_Game đã được tạo thành công!';
PRINT N'📋 Bảng: NguoiDung, TranDau, KetQuaChungCuoc';
GO
PRINT N'📋 Bảng: NguoiDung, TranDau';
GO
