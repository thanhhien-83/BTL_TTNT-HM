"""
Game Búa Kéo Bao với AI - Nhận diện cử chỉ tay (Phiên bản nâng cấp)
Sử dụng: OpenCV (Xử lý ảnh) + MediaPipe (AI)
Tính năng: Menu, Best of 3, Màn hình thắng/thua, Chơi lại, Click chuột
"""

# ========== IMPORT THƯ VIỆN ==========
import cv2                              # OpenCV - thư viện xử lý ảnh và video (đọc camera, vẽ hình, hiển thị)
import mediapipe as mp                  # MediaPipe - thư viện AI của Google (nhận diện bàn tay bằng Deep Learning)
import random                           # Thư viện sinh số ngẫu nhiên (để máy chọn Kéo/Búa/Bao)
import time                             # Thư viện thời gian (dùng cho đếm ngược 3-2-1)
import numpy as np                      # NumPy - thư viện tính toán mảng số (dùng cho xử lý ảnh, vẽ pháo hoa)
from PIL import Image, ImageDraw, ImageFont  # Pillow - thư viện vẽ ảnh (dùng để vẽ emoji lên ảnh OpenCV)
import os                               # Thư viện hệ điều hành (truy cập đường dẫn file)

# ============ PHẦN 1: KHỞI TẠO AI (MediaPipe) ============
# Bước 1: Lấy module Hands từ MediaPipe (module chuyên nhận diện bàn tay)
mp_tay = mp.solutions.hands             # Module nhận diện tay - chứa mô hình AI (CNN) đã huấn luyện sẵn
mp_ve = mp.solutions.drawing_utils      # Module vẽ - dùng để vẽ các điểm landmark và đường nối lên bàn tay

# Bước 2: Khởi tạo bộ nhận diện tay với các tham số cấu hình
bo_nhan_dien_tay = mp_tay.Hands(
    static_image_mode=False,            # False = chế độ VIDEO (frame sau tận dụng kết quả frame trước → nhanh hơn)
                                        # True = chế độ ẢNH TĨNH (mỗi frame chạy detection lại từ đầu → chậm hơn)
    max_num_hands=1,                    # Chỉ nhận diện TỐI ĐA 1 bàn tay (game chỉ cần 1 tay của người chơi)
    min_detection_confidence=0.7,       # Ngưỡng phát hiện tay >= 70% mới coi là "tìm thấy tay"
                                        # (giảm → nhạy hơn nhưng dễ nhận nhầm; tăng → chính xác hơn nhưng hay bỏ lỡ)
    min_tracking_confidence=0.7         # Ngưỡng theo dõi tay giữa các frame >= 70%
                                        # (nếu < 70% → chạy lại Palm Detection từ đầu; >= 70% → chỉ chạy Landmark)
)

# ============ PHẦN 1B: HÀM VẼ EMOJI ============
# OpenCV không hỗ trợ vẽ emoji trực tiếp → phải chuyển qua PIL (Pillow) để vẽ
def ve_emoji(khung_hinh, van_ban, vi_tri, kich_thuoc_font=100, mau=(255, 255, 255)):
    """
    Vẽ văn bản (bao gồm emoji) lên khung hình OpenCV bằng PIL
    Tham số:
        khung_hinh: ảnh OpenCV (numpy array) dạng BGR
        van_ban: chuỗi cần vẽ (có thể chứa emoji như ✊ ✌ ✋)
        vi_tri: tuple (x, y) - vị trí vẽ trên ảnh
        kich_thuoc_font: kích thước chữ (pixel)
        mau: màu chữ dạng (R, G, B)
    """
    # Bước 1: Chuyển ảnh OpenCV (BGR, numpy array) → PIL Image (RGB)
    # Vì OpenCV dùng hệ màu BGR, PIL dùng RGB → cần chuyển đổi
    anh_pil = Image.fromarray(cv2.cvtColor(khung_hinh, cv2.COLOR_BGR2RGB))
    ve = ImageDraw.Draw(anh_pil)       # Tạo đối tượng vẽ trên ảnh PIL
    
    # Bước 2: Tải font chữ hỗ trợ emoji
    try:
        # Ưu tiên font Segoe UI Emoji (có sẵn trên Windows) - hỗ trợ emoji đầy đủ
        font = ImageFont.truetype("seguiemj.ttf", kich_thuoc_font)
    except:
        try:
            # Nếu không có → dùng font Arial (không có emoji nhưng có chữ)
            font = ImageFont.truetype("arial.ttf", kich_thuoc_font)
        except:
            # Nếu cả Arial cũng không có → dùng font mặc định của PIL (rất nhỏ)
            font = ImageFont.load_default()
    
    # Bước 3: Vẽ văn bản/emoji lên ảnh PIL
    ve.text(vi_tri, van_ban, font=font, fill=mau)  # fill=mau: màu chữ
    
    # Bước 4: Chuyển ngược PIL Image (RGB) → OpenCV array (BGR)
    khung_hinh_voi_emoji = cv2.cvtColor(np.array(anh_pil), cv2.COLOR_RGB2BGR)
    khung_hinh[:] = khung_hinh_voi_emoji  # Gán lại vào khung hình gốc (thay đổi trực tiếp)

# ============ PHẦN 2: HÀM NHẬN DIỆN CỬ CHỈ (AI LOGIC - CẢI TIẾN) ============
# Thuật toán: RULE-BASED (dựa trên luật IF-ELSE)
# Ý tưởng: Dựa vào tọa độ Y của 21 điểm landmark để xác định ngón tay đang duỗi hay gập
# Trong hệ tọa độ ảnh: Y=0 ở trên cùng, Y tăng dần xuống dưới
# → Nếu đầu ngón tay (tip) có Y NHỎ HƠN đốt giữa (pip) → ngón đang DUỖI LÊN
def phan_loai_cu_chi(diem_tay):
    """
    Phân tích 21 điểm landmark để nhận diện Búa/Kéo/Bao
    Tham số: diem_tay - kết quả 21 điểm landmark từ MediaPipe
    Trả về: chuỗi "Bua", "Keo", "Bao" hoặc "Khong ro"
    """
    cac_diem = diem_tay.landmark          # Lấy danh sách 21 điểm (index 0-20), mỗi điểm có .x, .y, .z
    
    # ===== KIỂM TRA TỪNG NGÓN TAY: DUỖI hay GẬP =====
    # Nguyên lý: So sánh ĐẦU NGÓN (tip) với ĐỐT GIỮA (PIP) VÀ ĐỐT GỐC (MCP)
    # Nếu tip.y < pip.y VÀ tip.y < mcp.y → đầu ngón ở TRÊN đốt giữa và đốt gốc → ngón DUỖI
    #
    # Sơ đồ các điểm trên bàn tay:
    #   Ngón trỏ:  5(MCP) → 6(PIP) → 7(DIP) → 8(TIP)
    #   Ngón giữa: 9(MCP) → 10(PIP) → 11(DIP) → 12(TIP)
    #   Ngón áp út: 13(MCP) → 14(PIP) → 15(DIP) → 16(TIP)
    #   Ngón út:    17(MCP) → 18(PIP) → 19(DIP) → 20(TIP)
    
    # Ngón trỏ (index finger): điểm 8 (đầu ngón) so với điểm 6 (đốt giữa) và điểm 5 (đốt gốc)
    # True nếu ngón trỏ đang DUỖI, False nếu đang GẬP
    ngon_tro_duoi = cac_diem[8].y < cac_diem[6].y and cac_diem[8].y < cac_diem[5].y
    
    # Ngón giữa (middle finger): điểm 12 (đầu ngón) so với điểm 10 (đốt giữa) và điểm 9 (đốt gốc)
    ngon_giua_duoi = cac_diem[12].y < cac_diem[10].y and cac_diem[12].y < cac_diem[9].y
    
    # Ngón áp út (ring finger): điểm 16 (đầu ngón) so với điểm 14 (đốt giữa) và điểm 13 (đốt gốc)
    ngon_ap_ut_duoi = cac_diem[16].y < cac_diem[14].y and cac_diem[16].y < cac_diem[13].y
    
    # Ngón út (pinky finger): điểm 20 (đầu ngón) so với điểm 18 (đốt giữa) và điểm 17 (đốt gốc)
    ngon_ut_duoi = cac_diem[20].y < cac_diem[18].y and cac_diem[20].y < cac_diem[17].y
    
    # Đếm tổng số ngón đang duỗi (không kể ngón cái vì ngón cái khó xác định chính xác)
    cac_ngon_duoi = [ngon_tro_duoi, ngon_giua_duoi, ngon_ap_ut_duoi, ngon_ut_duoi]  # Danh sách True/False
    so_ngon_duoi = sum(cac_ngon_duoi)     # True=1, False=0 → tổng = số ngón đang duỗi
    
    # ===== LOGIC PHÂN LOẠI CỬ CHỈ =====
    
    # 1. KÉO ✌️: CHỈ ngón trỏ VÀ ngón giữa duỗi, ngón áp út VÀ ngón út phải GẬP
    #    → Giống hình chữ V (dấu hiệu victory / kéo)
    if ngon_tro_duoi and ngon_giua_duoi and not ngon_ap_ut_duoi and not ngon_ut_duoi:
        return "Keo"
    
    # 2. BAO ✋: TẤT CẢ 4 ngón đều duỗi (xòe bàn tay ra)
    #    → Bàn tay mở hoàn toàn
    elif ngon_tro_duoi and ngon_giua_duoi and ngon_ap_ut_duoi and ngon_ut_duoi:
        return "Bao"
    
    # 3. BÚA ✊: KHÔNG có ngón nào duỗi (nắm đấm)
    #    → Tất cả ngón tay đều gập lại
    elif so_ngon_duoi == 0:
        return "Bua"
    
    # 4. Các trường hợp khác: ví dụ giơ 1 ngón, 3 ngón... → Không phải Kéo/Búa/Bao
    else:
        return "Khong ro"

# ============ PHẦN 3: LOGIC GAME ============
# Thuật toán: SO SÁNH THEO LUẬT GAME (Rule-based comparison)
# Luật vòng tròn: Búa > Kéo > Bao > Búa (Búa đập Kéo, Kéo cắt Bao, Bao bọc Búa)
def xac_dinh_nguoi_thang(nguoi_choi, may_tinh):
    """
    Xác định người thắng dựa trên luật Kéo Búa Bao
    Tham số:
        nguoi_choi: cử chỉ người chơi ("Bua", "Keo", hoặc "Bao")
        may_tinh: cử chỉ máy tính ("Bua", "Keo", hoặc "Bao")
    Trả về: "thang", "thua", hoặc "Hoa!"
    """
    # Trường hợp 1: Cả hai chọn giống nhau → HÒA
    if nguoi_choi == may_tinh:
        return "Hoa!"
    
    # Trường hợp 2: Người chơi THẮNG (3 trường hợp)
    #   Búa đập Kéo | Kéo cắt Bao | Bao bọc Búa
    if (nguoi_choi == "Bua" and may_tinh == "Keo") or \
       (nguoi_choi == "Keo" and may_tinh == "Bao") or \
       (nguoi_choi == "Bao" and may_tinh == "Bua"):
        return "thang"
    
    # Trường hợp 3: Không hòa, không thắng → THUA
    return "thua"

# ============ PHẦN 4: VẼ CÁC THÀNH PHẦN GIAO DIỆN ============
# Các hàm dưới đây dùng OpenCV để vẽ giao diện game (nút bấm, bảng thông tin, pháo hoa)
def ve_nut(khung_hinh, van_ban, x, y, chieu_rong, chieu_cao, mau, di_chuot=False):
    """
    Vẽ nút bấm hình chữ nhật với chữ ở giữa
    Tham số:
        khung_hinh: ảnh để vẽ lên
        van_ban: chữ hiển thị trên nút (VD: "BAT DAU CHOI")
        x, y: tọa độ góc trên-trái của nút
        chieu_rong, chieu_cao: kích thước nút (pixel)
        mau: màu nền nút dạng (B, G, R)
        di_chuot: True nếu chuột đang hover → làm sáng màu nút
    """
    if di_chuot:
        # Hiệu ứng hover: tăng độ sáng màu lên 30% (nhân 1.3, tối đa 255)
        mau = tuple([int(c * 1.3) if c * 1.3 <= 255 else 255 for c in mau])
    
    # Vẽ nút: hình chữ nhật tô đặc (-1 = tô đầy) làm nền
    cv2.rectangle(khung_hinh, (x, y), (x + chieu_rong, y + chieu_cao), mau, -1)
    # Vẽ viền trắng xung quanh nút (thickness=3)
    cv2.rectangle(khung_hinh, (x, y), (x + chieu_rong, y + chieu_cao), (255, 255, 255), 3)
    
    # Vẽ văn bản ở CHÍNH GIỮA nút
    ti_le_font = 1.0                    # Kích thước font chữ
    do_day = 2                          # Độ dày nét chữ
    # Đo kích thước văn bản để tính vị trí căn giữa
    kich_thuoc_van_ban = cv2.getTextSize(van_ban, cv2.FONT_HERSHEY_DUPLEX, ti_le_font, do_day)[0]
    van_ban_x = x + (chieu_rong - kich_thuoc_van_ban[0]) // 2   # Căn giữa theo chiều ngang
    van_ban_y = y + (chieu_cao + kich_thuoc_van_ban[1]) // 2     # Căn giữa theo chiều dọc
    
    # Vẽ chữ lên nút (màu trắng)
    cv2.putText(khung_hinh, van_ban, (van_ban_x, van_ban_y), 
                cv2.FONT_HERSHEY_DUPLEX, ti_le_font, (255, 255, 255), do_day)

def ve_bang_thong_tin(khung_hinh, x, y, chieu_rong, chieu_cao, tieu_de, cac_dong_noi_dung, mau_nen=(40, 40, 40)):
    """Vẽ bảng thông tin dạng hộp với tiêu đề và nhiều dòng nội dung"""
    # Vẽ nền bảng (hình chữ nhật tô đặc màu xám đậm)
    cv2.rectangle(khung_hinh, (x, y), (x + chieu_rong, y + chieu_cao), mau_nen, -1)
    # Vẽ viền trắng bao quanh bảng
    cv2.rectangle(khung_hinh, (x, y), (x + chieu_rong, y + chieu_cao), (255, 255, 255), 2)
    
    # Vẽ tiêu đề bảng (màu cyan = xanh ngọc)
    cv2.putText(khung_hinh, tieu_de, (x + 10, y + 30), 
                cv2.FONT_HERSHEY_DUPLEX, 0.8, (0, 255, 255), 2)
    
    # Vẽ từng dòng nội dung, mỗi dòng cách nhau 30 pixel
    vi_tri_y = 60                       # Vị trí Y bắt đầu vẽ nội dung (dưới tiêu đề)
    for dong in cac_dong_noi_dung:
        cv2.putText(khung_hinh, dong, (x + 10, y + vi_tri_y), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)  # Màu trắng
        vi_tri_y += 30                  # Xuống dòng (cách 30 pixel)

def ve_phao_hoa(khung_hinh, x, y, kich_thuoc, mau):
    """
    Vẽ hiệu ứng pháo hoa đơn giản (8 tia tỏa ra từ 1 điểm)
    Dùng công thức lượng giác: x = r*cos(θ), y = r*sin(θ) để tính điểm cuối mỗi tia
    """
    for i in range(8):                  # 8 tia pháo hoa, mỗi tia cách nhau 45 độ
        goc = i * 45                    # Góc theo độ: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
        # Tính tọa độ điểm cuối tia bằng công thức lượng giác (hệ tọa độ cực → Đề-Các)
        diem_cuoi_x = int(x + kich_thuoc * np.cos(np.radians(goc)))  # np.radians: đổi độ → radian
        diem_cuoi_y = int(y + kich_thuoc * np.sin(np.radians(goc)))  # cos/sin: tính tọa độ trên đường tròn
        cv2.line(khung_hinh, (x, y), (diem_cuoi_x, diem_cuoi_y), mau, 3)       # Vẽ tia (đường thẳng)
        cv2.circle(khung_hinh, (diem_cuoi_x, diem_cuoi_y), 5, mau, -1)         # Vẽ chấm tròn ở cuối tia

# ============ PHẦN 4B: VẼ ICON CỬ CHỈ ============
def ve_icon_bua(khung_hinh, x, y, kich_thuoc, mau):
    """Vẽ icon Búa (nắm đấm)"""
    # Vẽ hình ovan (nắm tay)
    cv2.ellipse(khung_hinh, (x, y), (kich_thuoc, int(kich_thuoc*0.8)), 0, 0, 360, mau, -1)
    cv2.ellipse(khung_hinh, (x, y), (kich_thuoc, int(kich_thuoc*0.8)), 0, 0, 360, (255,255,255), 3)
    # Vẽ các ngón tay gập (đường ngang)
    for i in range(3):
        vi_tri_y = y - kich_thuoc//2 + i * kich_thuoc//2
        cv2.line(khung_hinh, (x-kich_thuoc//2, vi_tri_y), (x+kich_thuoc//2, vi_tri_y), (100,100,100), 2)

def ve_icon_keo(khung_hinh, x, y, kich_thuoc, mau):
    """Vẽ icon Kéo (hình chữ V)"""
    # Ngón trỏ
    cv2.line(khung_hinh, (x, y), (x - kich_thuoc//3, y - kich_thuoc), mau, 8)
    cv2.circle(khung_hinh, (x - kich_thuoc//3, y - kich_thuoc), 12, mau, -1)
    cv2.circle(khung_hinh, (x - kich_thuoc//3, y - kich_thuoc), 12, (255,255,255), 2)
    # Ngón giữa
    cv2.line(khung_hinh, (x, y), (x + kich_thuoc//3, y - kich_thuoc), mau, 8)
    cv2.circle(khung_hinh, (x + kich_thuoc//3, y - kich_thuoc), 12, mau, -1)
    cv2.circle(khung_hinh, (x + kich_thuoc//3, y - kich_thuoc), 12, (255,255,255), 2)
    # Mu bàn tay
    cv2.circle(khung_hinh, (x, y), kich_thuoc//4, mau, -1)
    cv2.circle(khung_hinh, (x, y), kich_thuoc//4, (255,255,255), 2)

def ve_icon_bao(khung_hinh, x, y, kich_thuoc, mau):
    """Vẽ icon Bao (bàn tay mở)"""
    # Ngón út
    cv2.line(khung_hinh, (x - kich_thuoc//2, y), (x - kich_thuoc//2, y - int(kich_thuoc*0.7)), mau, 6)
    cv2.circle(khung_hinh, (x - kich_thuoc//2, y - int(kich_thuoc*0.7)), 10, mau, -1)
    # Ngón áp út
    cv2.line(khung_hinh, (x - kich_thuoc//6, y), (x - kich_thuoc//6, y - kich_thuoc), mau, 6)
    cv2.circle(khung_hinh, (x - kich_thuoc//6, y - kich_thuoc), 10, mau, -1)
    # Ngón giữa
    cv2.line(khung_hinh, (x + kich_thuoc//6, y), (x + kich_thuoc//6, y - int(kich_thuoc*1.1)), mau, 6)
    cv2.circle(khung_hinh, (x + kich_thuoc//6, y - int(kich_thuoc*1.1)), 10, mau, -1)
    # Ngón trỏ
    cv2.line(khung_hinh, (x + kich_thuoc//2, y), (x + kich_thuoc//2, y - kich_thuoc), mau, 6)
    cv2.circle(khung_hinh, (x + kich_thuoc//2, y - kich_thuoc), 10, mau, -1)
    # Mu bàn tay
    cv2.ellipse(khung_hinh, (x, y + kich_thuoc//4), (int(kich_thuoc*0.7), kich_thuoc//3), 0, 0, 360, mau, -1)
    cv2.ellipse(khung_hinh, (x, y + kich_thuoc//4), (int(kich_thuoc*0.7), kich_thuoc//3), 0, 0, 360, (255,255,255), 2)

def ve_icon_cu_chi(khung_hinh, cu_chi, x, y, kich_thuoc, mau):
    """Vẽ icon tương ứng với cử chỉ"""
    if cu_chi == "Bua":
        ve_icon_bua(khung_hinh, x, y, kich_thuoc, mau)
    elif cu_chi == "Keo":
        ve_icon_keo(khung_hinh, x, y, kich_thuoc, mau)
    elif cu_chi == "Bao":
        ve_icon_bao(khung_hinh, x, y, kich_thuoc, mau)
    else:
        # Không rõ - vẽ dấu hỏi
        cv2.circle(khung_hinh, (x, y), kich_thuoc, (100, 100, 100), -1)
        cv2.putText(khung_hinh, "?", (x-kich_thuoc//2, y+kich_thuoc//2), cv2.FONT_HERSHEY_DUPLEX, 2, (255,255,255), 3)

# ============ PHẦN 5: GAME CHÍNH ============
# Hàm chính chứa toàn bộ vòng lặp game (game loop)
def chinh():
    # ===== KHỞI TẠO CAMERA =====
    camera = cv2.VideoCapture(0)                    # Mở webcam (0 = camera mặc định của máy tính)
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)      # Đặt độ rộng khung hình = 1280 pixel
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)      # Đặt chiều cao khung hình = 720 pixel (HD)
    
    # ===== BIẾN TRẠNG THÁI GAME =====
    # Game có 5 trạng thái: menu → dang_choi → dem_nguoc → hien_ket_qua → ket_thuc_tran
    trang_thai_game = "menu"             # Bắt đầu ở màn hình menu
    
    # ===== BIẾN THEO DÕI TRẬN ĐẤU (Best of 3 - Thắng 3 ván) =====
    so_van_can_thang = 3                 # Số ván cần thắng để kết thúc trận (Best of 3)
    so_van_thang_nguoi_choi = 0          # Số ván người chơi đã thắng
    so_van_thang_may = 0                 # Số ván máy tính đã thắng
    so_van = 0                           # Số ván đã chơi (để hiển thị "Ván 1", "Ván 2"...)
    
    # ===== BIẾN THEO DÕI VÁN ĐẤU HIỆN TẠI =====
    cu_chi_hien_tai = "Khong ro"         # Cử chỉ tay HIỆN TẠI đang nhận diện được (cập nhật liên tục)
    cu_chi_nguoi_choi = ""               # Cử chỉ CHỐT của người chơi khi đếm ngược kết thúc (không đổi nữa)
    lua_chon_may = ""                    # Lựa chọn ngẫu nhiên của máy tính
    van_ban_ket_qua = ""                 # Chuỗi hiển thị kết quả ("BAN THANG VAN NAY!", "MAY THANG"...)
    thoi_gian_bat_dau_dem = 0            # Mốc thời gian bắt đầu đếm ngược 3-2-1 (giây)
    thoi_gian_bat_dau_ket_qua = 0        # Mốc thời gian bắt đầu hiển thị kết quả (giây)
    
    # ===== LỊCH SỬ TRẬN ĐẤU =====
    lich_su_tran = []                    # Danh sách các ván đã chơi (để hiển thị lịch sử bên trái)
    
    # ===== HIỆU ỨNG ĐỘNG =====
    vi_tri_phao_hoa = []                 # Danh sách tọa độ (x,y) của các quả pháo hoa
    khung_hieu_ung = 0                   # Bộ đếm frame cho animation pháo hoa
    
    # ===== XỬ LÝ CHUỘT =====
    da_click_chuot = False               # Cờ đánh dấu: người dùng đã click chuột chưa?
    chuot_x, chuot_y = 0, 0             # Tọa độ vị trí click chuột
    
    # Hàm callback: được gọi TỰ ĐỘNG mỗi khi có sự kiện chuột trên cửa sổ game
    def xu_ly_chuot(su_kien, x, y, co, tham_so):
        nonlocal da_click_chuot, chuot_x, chuot_y  # Dùng nonlocal để thay đổi biến ở hàm cha
        if su_kien == cv2.EVENT_LBUTTONDOWN:        # Nếu sự kiện là CLICK TRÁI chuột
            da_click_chuot = True                   # Đặt cờ = True (sẽ xử lý ở vòng lặp chính)
            chuot_x, chuot_y = x, y                 # Lưu vị trí click
    
    # Tạo cửa sổ hiển thị game và gắn hàm xử lý chuột vào
    cv2.namedWindow('Bua Keo Bao - AI Game')                        # Tạo cửa sổ với tên cố định
    cv2.setMouseCallback('Bua Keo Bao - AI Game', xu_ly_chuot)      # Gắn callback chuột vào cửa sổ
    
    print("🎮 Game Búa Kéo Bao với AI - Phiên bản nâng cấp!")
    print("🏆 Best of 3 - Thắng 3 ván để chiến thắng!")
    print("🖱️  Có thể click chuột vào nút hoặc nhấn SPACE!")
    
    # ===== VÒNG LẶP GAME CHÍNH (Game Loop) =====
    # Chạy liên tục: đọc camera → xử lý AI → vẽ giao diện → hiển thị → xử lý phím/chuột
    # Dừng khi: camera bị ngắt hoặc nhấn ESC
    while camera.isOpened():                        # Kiểm tra camera còn mở không
        thanh_cong, khung_hinh = camera.read()      # Đọc 1 frame từ camera (trả về True/False và ảnh)
        if not thanh_cong:                          # Nếu đọc thất bại (camera bị ngắt)
            break                                   # Thoát vòng lặp
        
        # === TIỀN XỬ LÝ ẢNH ===
        khung_hinh = cv2.flip(khung_hinh, 1)        # Lật ảnh theo chiều NGANG (hiệu ứng gương)
                                                    # Để khi giơ tay phải → trên màn hình cũng ở bên phải
        khung_hinh_rgb = cv2.cvtColor(khung_hinh, cv2.COLOR_BGR2RGB)  # Chuyển BGR → RGB
                                                    # Vì OpenCV đọc ảnh BGR, nhưng MediaPipe cần RGB
        
        # ===== XỬ LÝ AI - NHẬN DIỆN TAY (BƯỚC QUAN TRỌNG NHẤT) =====
        # Đưa ảnh RGB vào mô hình AI MediaPipe để nhận diện bàn tay
        # Bên trong hàm process(): chạy 2 mô hình CNN:
        #   1) Palm Detection: tìm vùng bàn tay
        #   2) Hand Landmark: xác định 21 điểm trên bàn tay
        ket_qua = bo_nhan_dien_tay.process(khung_hinh_rgb)
        
        # Kiểm tra: AI có tìm thấy bàn tay trong ảnh không?
        if ket_qua.multi_hand_landmarks:            # Nếu tìm thấy ít nhất 1 bàn tay
            for diem_tay in ket_qua.multi_hand_landmarks:  # Duyệt qua từng bàn tay (ở đây chỉ có 1)
                # Vẽ 21 điểm landmark + đường nối lên bàn tay trên ảnh
                mp_ve.draw_landmarks(
                    khung_hinh,                     # Ảnh gốc để vẽ lên
                    diem_tay,                       # 21 điểm landmark
                    mp_tay.HAND_CONNECTIONS,         # Danh sách các cặp điểm cần nối (xương tay)
                    mp_ve.DrawingSpec(color=(0,255,0), thickness=2, circle_radius=3),   # Màu XANH LÁ cho điểm
                    mp_ve.DrawingSpec(color=(255,255,255), thickness=2)                 # Màu TRẮNG cho đường nối
                )
                # Phân loại cử chỉ từ 21 điểm → Kéo/Búa/Bao/Không rõ
                cu_chi_hien_tai = phan_loai_cu_chi(diem_tay)
        else:
            # Không tìm thấy bàn tay trong ảnh
            if trang_thai_game == "dang_choi":
                cu_chi_hien_tai = "Khong thay tay"  # Hiển thị thông báo cho người chơi
        
        # ===== XỬ LÝ TRẠNG THÁI GAME (State Machine) =====
        # Game hoạt động theo mô hình MÁY TRẠNG THÁI (Finite State Machine):
        #   menu → dang_choi → dem_nguoc → hien_ket_qua → (lặp lại hoặc ket_thuc_tran)
        thoi_gian_hien_tai = time.time()             # Lấy thời gian hiện tại (giây, dạng float)
        
        # ===== TRẠNG THÁI 1: MÀN HÌNH MENU =====
        if trang_thai_game == "menu":
            # Tạo lớp phủ tối bán trong suốt lên ảnh camera (để chữ dễ đọc hơn)
            lop_phu = khung_hinh.copy()              # Sao chép ảnh gốc
            cv2.rectangle(lop_phu, (0, 0), (1280, 720), (20, 20, 20), -1)  # Tô đen toàn bộ lớp phủ
            # Trộn 2 ảnh: 70% lớp phủ tối + 30% ảnh camera → hiệu ứng mờ tối
            khung_hinh = cv2.addWeighted(lop_phu, 0.7, khung_hinh, 0.3, 0)
            
            # Logo/Tiêu đề
            cv2.putText(khung_hinh, "BUA KEO BAO AI", (320, 150), 
                       cv2.FONT_HERSHEY_DUPLEX, 2.5, (0, 255, 255), 4)
            cv2.putText(khung_hinh, "Best of 3 Match", (480, 200), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)
            
            # Hướng dẫn
            huong_dan = [
                "Cach choi:",
                "Bua (nam dam) - Keo (2 ngon) - Bao (mo tay)",
                "",
                "Thang 3 van de chien thang tran dau!",
                "",
                "Nhan SPACE hoac click de bat dau"
            ]
            vi_tri_y = 280
            for dong in huong_dan:
                cv2.putText(khung_hinh, dong, (420, vi_tri_y), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
                vi_tri_y += 40
            
            # Nút bắt đầu
            ve_nut(khung_hinh, "BAT DAU CHOI", 440, 500, 400, 80, (0, 180, 0))
            
            # Gợi ý điều khiển
            cv2.putText(khung_hinh, "ESC - Thoat game", (540, 650), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (150, 150, 150), 1)
        
        # ===== TRẠNG THÁI ĐANG CHƠI =====
        elif trang_thai_game == "dang_choi":
            # Phần đầu với điểm số trận
            cv2.rectangle(khung_hinh, (0, 0), (1280, 100), (30, 30, 30), -1)
            
            # Tiêu đề
            cv2.putText(khung_hinh, f"TRAN DAU - Best of 3", (450, 35), 
                       cv2.FONT_HERSHEY_DUPLEX, 0.9, (255, 255, 0), 2)
            
            # Điểm số trận
            cv2.putText(khung_hinh, f"Ban: {so_van_thang_nguoi_choi}", (50, 70), 
                       cv2.FONT_HERSHEY_DUPLEX, 1.2, (0, 255, 0), 3)
            cv2.putText(khung_hinh, f"May: {so_van_thang_may}", (1100, 70), 
                       cv2.FONT_HERSHEY_DUPLEX, 1.2, (255, 100, 100), 3)
            
            # Số ván
            cv2.putText(khung_hinh, f"Van {so_van}", (580, 70), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
            
            # Cử chỉ hiện tại (ĐỎ hay XANH)
            mau_cu_chi = (0, 255, 0) if cu_chi_hien_tai in ["Bua", "Keo", "Bao"] else (0, 100, 255)
            cv2.putText(khung_hinh, f"Cu chi: {cu_chi_hien_tai}", (480, 150), 
                       cv2.FONT_HERSHEY_DUPLEX, 1, mau_cu_chi, 2)
            
            # Hướng dẫn
            cv2.putText(khung_hinh, "Nhan SPACE de choi van - ESC de thoat", (420, 680), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            # Hiển thị lịch sử (nếu có)
            if lich_su_tran:
                vi_tri_y = 200
                cv2.putText(khung_hinh, "Lich su:", (50, vi_tri_y), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (150, 150, 150), 1)
                vi_tri_y += 25
                for chi_so, ket_qua in enumerate(lich_su_tran[-5:]):
                    mau = (100, 255, 100) if ket_qua['nguoi_thang'] == 'nguoi_choi' else (100, 100, 255) if ket_qua['nguoi_thang'] == 'may_tinh' else (200, 200, 200)
                    van_ban = f"V{chi_so+1}: {ket_qua['nguoi_choi']} vs {ket_qua['may_tinh']}"
                    cv2.putText(khung_hinh, van_ban, (50, vi_tri_y), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, mau, 1)
                    vi_tri_y += 20
        
        # ===== TRẠNG THÁI 3: ĐẾM NGƯỢC 3-2-1 =====
        elif trang_thai_game == "dem_nguoc":
            # Tính thời gian đã trôi qua kể từ khi bắt đầu đếm ngược
            thoi_gian_da_troi = thoi_gian_hien_tai - thoi_gian_bat_dau_dem  # VD: 1.5 giây
            dem_nguoc = 3 - int(thoi_gian_da_troi)   # VD: 3 - 1 = 2 → hiển thị số 2
            
            if dem_nguoc > 0:                        # Vẫn đang đếm (3, 2, 1)
                # Phần đầu
                cv2.rectangle(khung_hinh, (0, 0), (1280, 100), (30, 30, 30), -1)
                cv2.putText(khung_hinh, f"Van {so_van}", (580, 60), 
                           cv2.FONT_HERSHEY_DUPLEX, 1, (255, 255, 0), 2)
                
                # Số đếm ngược lớn
                cv2.putText(khung_hinh, str(dem_nguoc), (550, 400), 
                          cv2.FONT_HERSHEY_DUPLEX, 10, (0, 255, 255), 15)
                
                cv2.putText(khung_hinh, "Chuan bi cu chi cua ban!", (420, 550), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            else:
                # ĐẾM NGƯỢC KẾT THÚC (dem_nguoc <= 0) → CHỐT KẾT QUẢ
                cu_chi_nguoi_choi = cu_chi_hien_tai  # Chốt cử chỉ người chơi tại thời điểm này (không đổi nữa)
                
                #------ THUẬT TOÁN RANDOM------: Máy tính chọn ngẫu nhiên 1 trong 3 (xác suất đều 33.3%)
                lua_chon_may = random.choice(["Bua", "Keo", "Bao"])  # random.choice: chọn ngẫu nhiên từ danh sách
                
                # Xác định thắng/thua bằng thuật toán so sánh luật game
                ket_qua = xac_dinh_nguoi_thang(cu_chi_nguoi_choi, lua_chon_may)
                
                # Cập nhật điểm
                if ket_qua == "thang":
                    so_van_thang_nguoi_choi += 1
                    van_ban_ket_qua = "BAN THANG VAN NAY!"
                    lich_su_tran.append({'nguoi_choi': cu_chi_nguoi_choi, 'may_tinh': lua_chon_may, 'nguoi_thang': 'nguoi_choi'})
                elif ket_qua == "thua":
                    so_van_thang_may += 1
                    van_ban_ket_qua = "MAY THANG VAN NAY!"
                    lich_su_tran.append({'nguoi_choi': cu_chi_nguoi_choi, 'may_tinh': lua_chon_may, 'nguoi_thang': 'may_tinh'})
                else:
                    van_ban_ket_qua = "HOA!"
                    lich_su_tran.append({'nguoi_choi': cu_chi_nguoi_choi, 'may_tinh': lua_chon_may, 'nguoi_thang': 'hoa'})
                
                # Kiểm tra: đã có ai thắng đủ 3 ván chưa? → Kết thúc trận
                if so_van_thang_nguoi_choi >= so_van_can_thang or so_van_thang_may >= so_van_can_thang:
                    trang_thai_game = "ket_thuc_tran"             # Chuyển sang màn hình kết thúc
                    thoi_gian_bat_dau_ket_qua = thoi_gian_hien_tai
                    # Tạo 8 vị trí pháo hoa NGẪU NHIÊN trên màn hình (dùng random)
                    vi_tri_phao_hoa = [(random.randint(200, 1080), random.randint(150, 400)) for _ in range(8)]
                    khung_hieu_ung = 0                            # Reset bộ đếm frame animation
                else:
                    trang_thai_game = "hien_ket_qua"
                    thoi_gian_bat_dau_ket_qua = thoi_gian_hien_tai
        
        # ===== TRẠNG THÁI HIỂN THỊ KẾT QUẢ =====
        elif trang_thai_game == "hien_ket_qua":
            if thoi_gian_hien_tai - thoi_gian_bat_dau_ket_qua < 3:
                # Phần đầu
                cv2.rectangle(khung_hinh, (0, 0), (1280, 100), (30, 30, 30), -1)
                cv2.putText(khung_hinh, f"Ban: {so_van_thang_nguoi_choi}  |  May: {so_van_thang_may}", (450, 60), 
                           cv2.FONT_HERSHEY_DUPLEX, 1, (255, 255, 0), 2)
                
                # Kết quả ván
                mau_ket_qua = (0, 255, 0) if "BAN THANG" in van_ban_ket_qua else (100, 100, 255) if "MAY THANG" in van_ban_ket_qua else (200, 200, 200)
                cv2.putText(khung_hinh, van_ban_ket_qua, (400, 180), 
                          cv2.FONT_HERSHEY_DUPLEX, 1.5, mau_ket_qua, 3)
                
                # HIỂN THỊ EMOJI THẬT
                # Ánh xạ cử chỉ thành emoji
                emoji_cu_chi = {
                    "Bua": "✊",
                    "Keo": "✌",
                    "Bao": "✋"
                }
                
                # Bảng người chơi (trái)
                cv2.rectangle(khung_hinh, (200, 250), (500, 480), (50, 50, 50), -1)
                cv2.rectangle(khung_hinh, (200, 250), (500, 480), (100, 200, 255), 3)
                cv2.putText(khung_hinh, "BAN", (300, 300), cv2.FONT_HERSHEY_DUPLEX, 1, (100, 200, 255), 2)
                # Vẽ emoji
                emoji_nguoi_choi = emoji_cu_chi.get(cu_chi_nguoi_choi, "❓")
                ve_emoji(khung_hinh, emoji_nguoi_choi, (310, 310), 120, (100, 200, 255))
                cv2.putText(khung_hinh, cu_chi_nguoi_choi, (270, 450), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (200, 200, 200), 2)
                
                # Bảng máy (phải)
                cv2.rectangle(khung_hinh, (780, 250), (1080, 480), (50, 50, 50), -1)
                cv2.rectangle(khung_hinh, (780, 250), (1080, 480), (255, 150, 100), 3)
                cv2.putText(khung_hinh, "MAY", (880, 300), cv2.FONT_HERSHEY_DUPLEX, 1, (255, 150, 100), 2)
                # Vẽ emoji
                emoji_may = emoji_cu_chi.get(lua_chon_may, "❓")
                ve_emoji(khung_hinh, emoji_may, (890, 310), 120, (255, 150, 100))
                cv2.putText(khung_hinh, lua_chon_may, (850, 450), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (200, 200, 200), 2)
                
                # Mũi tên giữa
                if "BAN THANG" in van_ban_ket_qua:
                    cv2.arrowedLine(khung_hinh, (520, 365), (760, 365), (0, 255, 0), 10, tipLength=0.3)
                elif "MAY THANG" in van_ban_ket_qua:
                    cv2.arrowedLine(khung_hinh, (760, 365), (520, 365), (255, 100, 100), 10, tipLength=0.3)
                else:
                    cv2.putText(khung_hinh, "VS", (600, 380), cv2.FONT_HERSHEY_DUPLEX, 2, (200, 200, 200), 4)
                
                # Thanh tiến độ
                tong_so_van = so_van_thang_nguoi_choi + so_van_thang_may
                cv2.putText(khung_hinh, f"Tien do: {tong_so_van} van", (520, 540), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
            else:
                trang_thai_game = "dang_choi"
        
        # ===== TRẠNG THÁI KẾT THÚC TRẬN =====
        elif trang_thai_game == "ket_thuc_tran":
            # Nền ăn mừng
            lop_phu = khung_hinh.copy()
            if so_van_thang_nguoi_choi >= so_van_can_thang:
                cv2.rectangle(lop_phu, (0, 0), (1280, 720), (0, 50, 0), -1)
            else:
                cv2.rectangle(lop_phu, (0, 0), (1280, 720), (50, 0, 0), -1)
            khung_hinh = cv2.addWeighted(lop_phu, 0.6, khung_hinh, 0.4, 0)
            
            # Hiệu ứng pháo hoa
            if khung_hieu_ung < 60:
                kich_thuoc = min(khung_hieu_ung * 3, 80)
                for vi_tri in vi_tri_phao_hoa:
                    mau = (0, 255, 255) if so_van_thang_nguoi_choi >= so_van_can_thang else (255, 100, 100)
                    ve_phao_hoa(khung_hinh, vi_tri[0], vi_tri[1], kich_thuoc, mau)
                khung_hieu_ung += 1
            
            # Kết quả trận đấu
            if so_van_thang_nguoi_choi >= so_van_can_thang:
                cv2.putText(khung_hinh, "CHUC MUNG!", (380, 200), 
                           cv2.FONT_HERSHEY_DUPLEX, 3, (0, 255, 0), 5)
                cv2.putText(khung_hinh, "BAN DA THANG TRAN DAU!", (300, 280), 
                           cv2.FONT_HERSHEY_DUPLEX, 1.5, (255, 255, 255), 3)
            else:
                cv2.putText(khung_hinh, "THUA CUOC!", (420, 200), 
                           cv2.FONT_HERSHEY_DUPLEX, 3, (100, 100, 255), 5)
                cv2.putText(khung_hinh, "May da thang tran dau!", (350, 280), 
                           cv2.FONT_HERSHEY_DUPLEX, 1.5, (255, 255, 255), 3)
            
            # Điểm số cuối
            cv2.putText(khung_hinh, f"Ket qua cuoi cung: {so_van_thang_nguoi_choi} - {so_van_thang_may}", (400, 380), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)
            
            # Nút chơi lại
            ve_nut(khung_hinh, "CHOI LAI", 440, 480, 400, 80, (0, 180, 180), khung_hieu_ung % 20 < 10)
            
            cv2.putText(khung_hinh, "Nhan SPACE hoac click de choi lai", (440, 620), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)
        
        # ===== HIỂN THỊ KẾT QUẢ LÊN MÀN HÌNH =====
        cv2.imshow('Bua Keo Bao - AI Game', khung_hinh)  # Hiển thị ảnh đã vẽ xong lên cửa sổ
        
        # ===== XỬ LÝ PHÍM BẤM =====
        phim = cv2.waitKey(1) & 0xFF     # Chờ 1ms để đọc phím bấm (& 0xFF: lấy 8 bit cuối của mã phím)
        
        # Kiểm tra click chuột trên các nút
        if da_click_chuot:
            # Màn hình menu - nút "BẮT ĐẦU CHƠI" (440, 500, 400x80)
            if trang_thai_game == "menu":
                if 440 <= chuot_x <= 840 and 500 <= chuot_y <= 580:
                    trang_thai_game = "dang_choi"
                    so_van_thang_nguoi_choi = 0
                    so_van_thang_may = 0
                    so_van = 0
                    lich_su_tran = []
            
            # Màn hình kết thúc trận - nút "CHƠI LẠI" (440, 480, 400x80)
            elif trang_thai_game == "ket_thuc_tran":
                if 440 <= chuot_x <= 840 and 480 <= chuot_y <= 560:
                    trang_thai_game = "menu"
                    so_van_thang_nguoi_choi = 0
                    so_van_thang_may = 0
                    so_van = 0
                    lich_su_tran = []
            
            # Đặt lại trạng thái click chuột
            da_click_chuot = False
        
        # Phím ESC (mã = 27) → Thoát game
        if phim == 27:
            break
        
        # Phím SPACE (mã = 32) → Thực hiện hành động tùy trạng thái hiện tại
        if phim == 32:
            if trang_thai_game == "menu":
                # Ở menu: SPACE = Bắt đầu trận mới
                trang_thai_game = "dang_choi"        # Chuyển sang trạng thái đang chơi
                so_van_thang_nguoi_choi = 0          # Reset điểm người chơi
                so_van_thang_may = 0                 # Reset điểm máy
                so_van = 0                           # Reset số ván
                lich_su_tran = []                    # Xóa lịch sử cũ
                
            elif trang_thai_game == "dang_choi":
                # Đang chơi: SPACE = Bắt đầu ván mới (đếm ngược 3-2-1)
                so_van += 1                          # Tăng số ván lên 1
                trang_thai_game = "dem_nguoc"         # Chuyển sang đếm ngược
                thoi_gian_bat_dau_dem = time.time()   # Ghi lại mốc thời gian bắt đầu đếm
                
            elif trang_thai_game == "ket_thuc_tran":
                # Kết thúc trận: SPACE = Quay lại menu để chơi lại
                trang_thai_game = "menu"
                so_van_thang_nguoi_choi = 0
                so_van_thang_may = 0
                so_van = 0
                lich_su_tran = []
    
    # ===== DỌN DẸP TÀI NGUYÊN KHI THOÁT GAME =====
    camera.release()                     # Giải phóng camera (trả camera lại cho hệ điều hành)
    cv2.destroyAllWindows()              # Đóng tất cả cửa sổ OpenCV
    bo_nhan_dien_tay.close()             # Đóng mô hình AI MediaPipe (giải phóng bộ nhớ)
    
    print(f"\n🎯 Game kết thúc!")
    print("👋 Cảm ơn bạn đã chơi!")

# Điểm bắt đầu chương trình: khi chạy trực tiếp file này (python ai.py)
if __name__ == "__main__":
    chinh()                              # Gọi hàm chính để bắt đầu game
