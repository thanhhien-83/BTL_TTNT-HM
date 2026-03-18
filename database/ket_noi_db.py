"""
Module Kết nối Database SQL Server
Game Oẳn Tù Tì - Kéo Búa Bao
"""

import pyodbc

# ============ CẤU HÌNH KẾT NỐI ============
CAU_HINH = {
    'server': r'ADMIN-PC\HIEN83',
    'database': 'KBB_Game',
    'username': 'sa',
    'password': '2004'
}

CHUOI_KET_NOI = (
    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
    f"SERVER={CAU_HINH['server']};"
    f"DATABASE={CAU_HINH['database']};"
    f"UID={CAU_HINH['username']};"
    f"PWD={CAU_HINH['password']};"
    "TrustServerCertificate=yes;"
)


class Database:
    """Lớp quản lý kết nối database"""
    
    def __init__(self):
        self.ket_noi = None
        self.con_tro = None
        self.ma_nguoi_dung = None  # Người dùng đang đăng nhập
    
    def mo_ket_noi(self):
        """Mở kết nối database"""
        try:
            self.ket_noi = pyodbc.connect(CHUOI_KET_NOI)
            self.con_tro = self.ket_noi.cursor()
            print("✅ Kết nối database thành công!")
            return True
        except Exception as loi:
            print(f"❌ Lỗi kết nối: {loi}")
            return False
    
    def dong_ket_noi(self):
        """Đóng kết nối database"""
        if self.con_tro: self.con_tro.close()
        if self.ket_noi: self.ket_noi.close()
    
    # ========== ĐĂNG KÝ / ĐĂNG NHẬP ==========
    
    def dang_ky(self, ten_dang_nhap, mat_khau, ten_hien_thi=None):
        """
        Đăng ký tài khoản mới
        Trả về: (thành_công, thông_báo, mã_người_dùng)
        """
        try:
            self.con_tro.execute(
                "SET NOCOUNT ON; EXEC sp_DangKy ?, ?, ?",
                (ten_dang_nhap, mat_khau, ten_hien_thi)
            )
            kq = self.con_tro.fetchone()
            self.ket_noi.commit()
            return (bool(kq[0]), kq[1], kq[2] if len(kq) > 2 else None)
        except Exception as loi:
            return (False, f"Lỗi: {loi}", None)
    
    def dang_nhap(self, ten_dang_nhap, mat_khau):
        """
        Đăng nhập hệ thống
        Trả về: (thành_công, thông_báo, mã_người_dùng)
        """
        try:
            self.con_tro.execute(
                "SET NOCOUNT ON; EXEC sp_DangNhap ?, ?",
                (ten_dang_nhap, mat_khau)
            )
            kq = self.con_tro.fetchone()
            self.ket_noi.commit()
            
            if kq[0]:  # Thành công
                self.ma_nguoi_dung = kq[2]
            
            return (bool(kq[0]), kq[1], kq[2])
        except Exception as loi:
            return (False, f"Lỗi: {loi}", None)
    
    def dang_xuat(self):
        """Đăng xuất"""
        self.ma_nguoi_dung = None
    
    # ========== LƯU TRẬN ĐẤU ==========
    
    def luu_tran_dau(self, lua_chon_nguoi, lua_chon_may):
        """
        Lưu kết quả trận đấu
        Trả về: (kết_quả, mã_trận)
        """
        if not self.ma_nguoi_dung:
            return (None, None)
        
        try:
            self.con_tro.execute(
                "SET NOCOUNT ON; EXEC sp_LuuTranDau ?, ?, ?",
                (self.ma_nguoi_dung, lua_chon_nguoi, lua_chon_may)
            )
            kq = self.con_tro.fetchone()
            self.ket_noi.commit()
            return (kq[0], kq[1])
        except Exception as loi:
            print(f"❌ Lỗi lưu trận: {loi}")
            return (None, None)
    
    # ========== THỐNG KÊ ==========
    
    def lay_thong_ke(self):
        """
        Lấy thống kê người chơi hiện tại
        Trả về: dict hoặc None
        """
        if not self.ma_nguoi_dung:
            return None
        
        try:
            self.con_tro.execute("SET NOCOUNT ON; EXEC sp_LayThongKe ?", (self.ma_nguoi_dung,))
            kq = self.con_tro.fetchone()
            if kq:
                return {
                    'ten_dang_nhap': kq[0],
                    'ten_hien_thi': kq[1],
                    'thang': kq[2],
                    'thua': kq[3],
                    'hoa': kq[4],
                    'tong': kq[5],
                    'tran_thang': kq[6] if len(kq) > 6 else 0,
                    'tran_thua': kq[7] if len(kq) > 7 else 0
                }
            return None
        except:
            return None
    
    def lay_lich_su(self, so_luong=20):
        """
        Lấy lịch sử trận đấu
        Trả về: danh sách các trận
        """
        if not self.ma_nguoi_dung:
            return []
        
        try:
            self.con_tro.execute("SET NOCOUNT ON; EXEC sp_LayLichSu ?, ?", (self.ma_nguoi_dung, so_luong))
            ds = []
            for row in self.con_tro.fetchall():
                ds.append({
                    'ma': row[0],
                    'nguoi_choi': row[1],
                    'may_tinh': row[2],
                    'ket_qua': row[3],
                    'thoi_gian': row[4]
                })
            return ds
        except:
            return []
    
    # ========== KẾT QUẢ CHUNG CUỘC ==========
    
    def luu_ket_qua_chung_cuoc(self, so_van_nguoi_choi, so_van_may_tinh):
        """
        Lưu kết quả chung cuộc khi thắng/thua 3 ván
        Trả về: (kết_quả, mã_kết_quả)
        """
        if not self.ma_nguoi_dung:
            return (None, None)
        
        try:
            self.con_tro.execute(
                "SET NOCOUNT ON; EXEC sp_LuuKetQuaChungCuoc ?, ?, ?",
                (self.ma_nguoi_dung, so_van_nguoi_choi, so_van_may_tinh)
            )
            kq = self.con_tro.fetchone()
            self.ket_noi.commit()
            return (kq[0], kq[1])
        except Exception as loi:
            print(f"❌ Lỗi lưu kết quả chung cuộc: {loi}")
            return (None, None)
    
    def lay_lich_su_chung_cuoc(self, so_luong=20):
        """
        Lấy lịch sử các trận chung cuộc
        Trả về: danh sách các trận
        """
        if not self.ma_nguoi_dung:
            return []
        
        try:
            self.con_tro.execute("SET NOCOUNT ON; EXEC sp_LayLichSuChungCuoc ?, ?", (self.ma_nguoi_dung, so_luong))
            ds = []
            for row in self.con_tro.fetchall():
                ds.append({
                    'ma': row[0],
                    'ket_qua': row[1],
                    'so_van_nguoi_choi': row[2],
                    'so_van_may_tinh': row[3],
                    'thoi_gian': row[4]
                })
            return ds
        except:
            return []
    
    # ========== XÓA LỊCH SỬ ==========
    
    def xoa_lich_su(self):
        """
        Xóa toàn bộ lịch sử trận đấu và chung cuộc của người dùng
        Trả về: True/False
        """
        if not self.ma_nguoi_dung:
            print("❌ Không có mã người dùng!")
            return False
        
        # Đảm bảo kết nối database
        if not self.ket_noi:
            print("❌ Chưa kết nối database, đang kết nối lại...")
            if not self.mo_ket_noi():
                print("❌ Không thể kết nối database!")
                return False
        
        try:
            print(f"🔄 Đang xóa lịch sử cho MaNguoiDung = {self.ma_nguoi_dung}")
            
            # Xóa lịch sử trận đấu
            self.con_tro.execute(
                "DELETE FROM TranDau WHERE MaNguoiDung = ?",
                (self.ma_nguoi_dung,)
            )
            so_tran_xoa = self.con_tro.rowcount
            print(f"   - Đã xóa {so_tran_xoa} trận đấu")
            
            # Xóa lịch sử chung cuộc
            self.con_tro.execute(
                "DELETE FROM KetQuaChungCuoc WHERE MaNguoiDung = ?",
                (self.ma_nguoi_dung,)
            )
            so_cc_xoa = self.con_tro.rowcount
            print(f"   - Đã xóa {so_cc_xoa} kết quả chung cuộc")
            
            # Reset thống kê
            self.con_tro.execute(
                """UPDATE NguoiDung SET 
                   TongSoThang = 0, TongSoThua = 0, TongSoHoa = 0,
                   TongTranThang = 0, TongTranThua = 0
                   WHERE MaNguoiDung = ?""",
                (self.ma_nguoi_dung,)
            )
            print(f"   - Đã reset thống kê")
            
            self.ket_noi.commit()
            print("✅ Đã xóa lịch sử thành công!")
            return True
        except Exception as loi:
            print(f"❌ Lỗi xóa lịch sử: {loi}")
            try:
                self.ket_noi.rollback()
            except:
                pass
            return False


# ========== BIẾN TOÀN CỤC ==========
db = Database()


# ========== TEST ==========
if __name__ == "__main__":
    print("=" * 40)
    print("   TEST KẾT NỐI DATABASE")
    print("=" * 40)
    
    if db.mo_ket_noi():
        # Test đăng ký
        print("\n[Đăng ký]")
        kq = db.dang_ky("player1", "123456", "Người chơi 1")
        print(f"  {kq[1]}")
        
        # Test đăng nhập
        print("\n[Đăng nhập]")
        kq = db.dang_nhap("player1", "123456")
        print(f"  {kq[1]}")
        
        if kq[0]:
            # Test lưu trận
            print("\n[Lưu trận đấu]")
            for i in range(3):
                import random
                nc = random.choice(['Kéo', 'Búa', 'Bao'])
                mt = random.choice(['Kéo', 'Búa', 'Bao'])
                kq = db.luu_tran_dau(nc, mt)
                print(f"  {nc} vs {mt} => {kq[0]}")
            
            # Test thống kê
            print("\n[Thống kê]")
            tk = db.lay_thong_ke()
            if tk:
                print(f"  {tk['ten_hien_thi']}: {tk['thang']}W / {tk['thua']}L / {tk['hoa']}D")
        
        db.dong_ket_noi()
    
    print("\n" + "=" * 40)
