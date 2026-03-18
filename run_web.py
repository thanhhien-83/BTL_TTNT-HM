"""
Web Server cho Game Búa Kéo Bao AI
Sử dụng Flask để tạo web server
"""

from flask import Flask, render_template, jsonify, request, session
import os
import webbrowser
import threading
from database.ket_noi_db import db

app = Flask(__name__, static_folder='.', static_url_path='', template_folder='.')
app.secret_key = 'bua_keo_bao_secret_key_2024'

# ========== TRANG CHÍNH ==========
@app.route('/')
def index():
    return render_template('index.html')

# ========== API NGƯỜI DÙNG ==========
@app.route('/api/nguoidung')
def api_nguoi_dung():
    """Lấy thông tin người dùng hiện tại"""
    if 'ma_nguoi_dung' not in session:
        return jsonify({'da_dang_nhap': False, 'la_khach': True})
    
    db.ma_nguoi_dung = session['ma_nguoi_dung']
    thong_ke = db.lay_thong_ke()
    
    if thong_ke:
        return jsonify({
            'da_dang_nhap': True,
            'la_khach': False,
            'ten_dang_nhap': thong_ke['ten_dang_nhap'],
            'ten_hien_thi': thong_ke['ten_hien_thi'],
            'thong_ke': thong_ke
        })
    return jsonify({'da_dang_nhap': False, 'la_khach': True})

@app.route('/api/dangky', methods=['POST'])
def api_dang_ky():
    """Đăng ký tài khoản mới"""
    data = request.json
    ten_dang_nhap = data.get('ten_dang_nhap')
    mat_khau = data.get('mat_khau')
    ten_hien_thi = data.get('ten_hien_thi', ten_dang_nhap)
    
    thanh_cong, thong_bao, ma = db.dang_ky(ten_dang_nhap, mat_khau, ten_hien_thi)
    
    if thanh_cong:
        session['ma_nguoi_dung'] = ma
        db.ma_nguoi_dung = ma
    
    return jsonify({
        'thanh_cong': thanh_cong,
        'thong_bao': thong_bao
    })

@app.route('/api/dangnhap', methods=['POST'])
def api_dang_nhap():
    """Đăng nhập"""
    data = request.json
    ten_dang_nhap = data.get('ten_dang_nhap')
    mat_khau = data.get('mat_khau')
    
    thanh_cong, thong_bao, ma = db.dang_nhap(ten_dang_nhap, mat_khau)
    
    if thanh_cong:
        session['ma_nguoi_dung'] = ma
        db.ma_nguoi_dung = ma
    
    return jsonify({
        'thanh_cong': thanh_cong,
        'thong_bao': thong_bao
    })

@app.route('/api/dangxuat', methods=['POST'])
def api_dang_xuat():
    """Đăng xuất"""
    session.pop('ma_nguoi_dung', None)
    db.dang_xuat()
    return jsonify({'thanh_cong': True})

@app.route('/api/choikhach', methods=['POST'])
def api_choi_khach():
    """Chơi với tư cách khách (không lưu dữ liệu)"""
    session.pop('ma_nguoi_dung', None)
    db.dang_xuat()
    return jsonify({'thanh_cong': True, 'la_khach': True})

# ========== API TRẬN ĐẤU ==========
@app.route('/api/luutran', methods=['POST'])
def api_luu_tran():
    """Lưu kết quả trận đấu"""
    if 'ma_nguoi_dung' not in session:
        return jsonify({'thanh_cong': False, 'thong_bao': 'Chưa đăng nhập'})
    
    db.ma_nguoi_dung = session['ma_nguoi_dung']
    data = request.json
    nguoi_choi = data.get('nguoi_choi')
    may_tinh = data.get('may_tinh')
    
    ket_qua, ma_tran = db.luu_tran_dau(nguoi_choi, may_tinh)
    
    return jsonify({
        'thanh_cong': ket_qua is not None,
        'ket_qua': ket_qua,
        'ma_tran': ma_tran
    })

@app.route('/api/lichsu')
def api_lich_su():
    """Lấy lịch sử trận đấu"""
    if 'ma_nguoi_dung' not in session:
        return jsonify({'thanh_cong': False, 'data': []})
    
    db.ma_nguoi_dung = session['ma_nguoi_dung']
    lich_su = db.lay_lich_su(20)
    
    return jsonify({
        'thanh_cong': True,
        'data': lich_su
    })

# ========== API KẾT QUẢ CHUNG CUỘC ==========
@app.route('/api/luuchungcuoc', methods=['POST'])
def api_luu_chung_cuoc():
    """Lưu kết quả chung cuộc (thắng/thua 3 ván)"""
    if 'ma_nguoi_dung' not in session:
        return jsonify({'thanh_cong': False, 'thong_bao': 'Chưa đăng nhập'})
    
    db.ma_nguoi_dung = session['ma_nguoi_dung']
    data = request.json
    so_van_nguoi_choi = data.get('so_van_nguoi_choi')
    so_van_may_tinh = data.get('so_van_may_tinh')
    
    ket_qua, ma = db.luu_ket_qua_chung_cuoc(so_van_nguoi_choi, so_van_may_tinh)
    
    return jsonify({
        'thanh_cong': ket_qua is not None,
        'ket_qua': ket_qua
    })

@app.route('/api/lichsuchungcuoc')
def api_lich_su_chung_cuoc():
    """Lấy lịch sử chung cuộc"""
    if 'ma_nguoi_dung' not in session:
        return jsonify({'thanh_cong': False, 'data': []})
    
    db.ma_nguoi_dung = session['ma_nguoi_dung']
    lich_su = db.lay_lich_su_chung_cuoc(20)
    
    return jsonify({
        'thanh_cong': True,
        'data': lich_su
    })

@app.route('/api/xoalichsu', methods=['POST'])
def api_xoa_lich_su():
    """Xóa toàn bộ lịch sử"""
    print("📥 Nhận yêu cầu xóa lịch sử")
    
    if 'ma_nguoi_dung' not in session:
        print("❌ Chưa đăng nhập - không có session")
        return jsonify({'thanh_cong': False, 'thong_bao': 'Chưa đăng nhập'})
    
    ma = session['ma_nguoi_dung']
    print(f"👤 MaNguoiDung trong session: {ma}")
    
    db.ma_nguoi_dung = ma
    thanh_cong = db.xoa_lich_su()
    
    print(f"📤 Kết quả xóa: {thanh_cong}")
    return jsonify({
        'thanh_cong': thanh_cong,
        'thong_bao': 'Đã xóa lịch sử!' if thanh_cong else 'Lỗi xóa lịch sử'
    })

# ========== MỞ TRÌNH DUYỆT ==========
def mo_trinh_duyet():
    """Mở trình duyệt sau 1.5 giây"""
    import time
    time.sleep(1.5)
    
    # Thử mở Cốc Cốc trước
    coc_coc_paths = [
        r"C:\Program Files\CocCoc\Browser\Application\browser.exe",
        r"C:\Program Files (x86)\CocCoc\Browser\Application\browser.exe",
        os.path.expanduser(r"~\AppData\Local\CocCoc\Browser\Application\browser.exe")
    ]
    
    url = "http://127.0.0.1:5000"
    
    for path in coc_coc_paths:
        if os.path.exists(path):
            os.system(f'"{path}" {url}')
            return
    
    # Nếu không có Cốc Cốc, mở trình duyệt mặc định
    webbrowser.open(url)

# ========== CHẠY SERVER ==========
if __name__ == '__main__':
    print("=" * 50)
    print("   🎮 GAME BÚA KÉO BAO AI - WEB VERSION")
    print("=" * 50)
    
    # Kết nối database
    if db.mo_ket_noi():
        print("✅ Kết nối database thành công!")
    else:
        print("⚠️ Không thể kết nối database - Chơi với tư cách khách")
    
    # Mở trình duyệt trong thread riêng
    threading.Thread(target=mo_trinh_duyet, daemon=True).start()
    
    print("\n🌐 Server đang chạy tại: http://127.0.0.1:5000")
    print("🔵 Đang mở trình duyệt Cốc Cốc...")
    print("\n💡 Nhấn Ctrl+C để dừng server\n")
    
    # Chạy Flask server
    app.run(host='127.0.0.1', port=5000, debug=False)
