// Core state
const state = {
  running: false,
  camera: null,
  currentGesture: 'Unknown',
  playerScore: 0,
  computerScore: 0,
  history: [],
  countdownTimer: null,
  countdownValue: 0,
  isGuest: false,  // Thêm flag cho khách
  isLoggedIn: false, // Trạng thái đăng nhập
};

// ========== AUTH MODAL FUNCTIONS ==========
function showAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function hideAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  // Clear messages
  const loginMsg = document.getElementById('login-message');
  const registerMsg = document.getElementById('register-message');
  if (loginMsg) loginMsg.className = 'auth-message';
  if (registerMsg) registerMsg.className = 'auth-message';
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabs = document.querySelectorAll('.auth-tab');
  
  tabs.forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
  
  if (tab === 'login') {
    loginForm?.classList.remove('hidden');
    registerForm?.classList.add('hidden');
  } else {
    loginForm?.classList.add('hidden');
    registerForm?.classList.remove('hidden');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const msgEl = document.getElementById('login-message');
  
  if (!username || !password) {
    msgEl.textContent = 'Vui lòng nhập đầy đủ thông tin!';
    msgEl.className = 'auth-message error';
    return;
  }
  
  try {
    const res = await fetch('/api/dangnhap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ten_dang_nhap: username, mat_khau: password })
    });
    const data = await res.json();
    
    if (data.thanh_cong) {
      msgEl.textContent = data.thong_bao;
      msgEl.className = 'auth-message success';
      setTimeout(() => {
        hideAuthModal();
        loadUserInfo();
      }, 1000);
    } else {
      msgEl.textContent = data.thong_bao || 'Đăng nhập thất bại!';
      msgEl.className = 'auth-message error';
    }
  } catch (err) {
    msgEl.textContent = 'Lỗi kết nối server!';
    msgEl.className = 'auth-message error';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('register-username').value.trim();
  const displayname = document.getElementById('register-displayname').value.trim();
  const password = document.getElementById('register-password').value;
  const password2 = document.getElementById('register-password2').value;
  const msgEl = document.getElementById('register-message');
  
  if (!username || !password) {
    msgEl.textContent = 'Vui lòng nhập đầy đủ thông tin!';
    msgEl.className = 'auth-message error';
    return;
  }
  
  if (password !== password2) {
    msgEl.textContent = 'Mật khẩu xác nhận không khớp!';
    msgEl.className = 'auth-message error';
    return;
  }
  
  try {
    const res = await fetch('/api/dangky', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ten_dang_nhap: username, 
        mat_khau: password,
        ten_hien_thi: displayname || username
      })
    });
    const data = await res.json();
    
    if (data.thanh_cong) {
      msgEl.textContent = data.thong_bao;
      msgEl.className = 'auth-message success';
      setTimeout(() => {
        hideAuthModal();
        loadUserInfo();
      }, 1000);
    } else {
      msgEl.textContent = data.thong_bao || 'Đăng ký thất bại!';
      msgEl.className = 'auth-message error';
    }
  } catch (err) {
    msgEl.textContent = 'Lỗi kết nối server!';
    msgEl.className = 'auth-message error';
  }
}

async function handleGuest() {
  try {
    await fetch('/api/choikhach', { method: 'POST' });
    state.isGuest = true;
    state.isLoggedIn = false;
    hideAuthModal();
    loadUserInfo();
  } catch (err) {
    console.log('Lỗi chơi khách');
  }
}

async function handleLogout() {
  try {
    await fetch('/api/dangxuat', { method: 'POST' });
    state.isLoggedIn = false;
    state.isGuest = true;
    loadUserInfo();
  } catch (err) {
    console.log('Lỗi đăng xuất');
  }
}

// Setup auth modal events
function setupAuthModal() {
  const authBtn = document.getElementById('auth-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const authClose = document.getElementById('auth-close');
  const authOverlay = document.querySelector('.auth-overlay');
  const tabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const guestBtn = document.getElementById('guest-btn');
  
  authBtn?.addEventListener('click', showAuthModal);
  logoutBtn?.addEventListener('click', handleLogout);
  authClose?.addEventListener('click', hideAuthModal);
  authOverlay?.addEventListener('click', hideAuthModal);
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
  });
  
  loginForm?.addEventListener('submit', handleLogin);
  registerForm?.addEventListener('submit', handleRegister);
  guestBtn?.addEventListener('click', handleGuest);
}

// ========== DATABASE API FUNCTIONS ==========
async function loadUserInfo() {
  try {
    const res = await fetch('/api/nguoidung');
    const data = await res.json();

    const userNameEl = document.getElementById('user-name');
    const userStatsEl = document.getElementById('user-stats');
    const authBtn = document.getElementById('auth-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (data.la_khach) {
      // Người chơi khách - hiện nút đăng nhập
      state.isGuest = true;
      state.isLoggedIn = false;
      if (userNameEl) userNameEl.textContent = '🎮 Khách';
      if (userStatsEl) userStatsEl.textContent = '(Không lưu dữ liệu)';
      if (authBtn) authBtn.style.display = 'inline-flex';
      if (logoutBtn) logoutBtn.style.display = 'none';
    } else if (data.da_dang_nhap) {
      state.isGuest = false;
      state.isLoggedIn = true;
      // Ưu tiên hiển thị tên hiển thị, nếu không có thì dùng tên đăng nhập
      if (userNameEl) userNameEl.textContent = data.ten_hien_thi || data.ten_dang_nhap;
      if (userStatsEl && data.thong_ke) {
        const tk = data.thong_ke;
        userStatsEl.textContent = `${tk.thang}W / ${tk.thua}L / ${tk.hoa}D`;
      }
      if (authBtn) authBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-flex';
      
      // Load lịch sử từ database
      await loadHistoryFromDb();
    } else {
      // Chưa đăng nhập - hiện modal đăng nhập
      state.isGuest = true;
      state.isLoggedIn = false;
      if (userNameEl) userNameEl.textContent = 'Chưa đăng nhập';
      if (userStatsEl) userStatsEl.textContent = '';
      if (authBtn) authBtn.style.display = 'inline-flex';
      if (logoutBtn) logoutBtn.style.display = 'none';
      showAuthModal();
    }
  } catch (e) {
    console.log('Không thể load thông tin user:', e);
    // Nếu lỗi, cho chơi khách
    const userNameEl = document.getElementById('user-name');
    const userStatsEl = document.getElementById('user-stats');
    const authBtn = document.getElementById('auth-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    state.isGuest = true;
    if (userNameEl) userNameEl.textContent = '🎮 Khách';
    if (userStatsEl) userStatsEl.textContent = '(Không lưu dữ liệu)';
    if (authBtn) authBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

async function loadHistoryFromDb() {
  try {
    // Load lịch sử từng ván
    const resVan = await fetch('/api/lichsu');
    const dataVan = await resVan.json();
    
    // Load lịch sử chung cuộc
    const resCC = await fetch('/api/lichsuchungcuoc');
    const dataCC = await resCC.json();

    state.history = [];

    // Xử lý kết hợp lịch sử từng ván và chung cuộc theo thời gian
    let allItems = [];

    // Thêm các ván đấu
    if (dataVan.thanh_cong && dataVan.data) {
      dataVan.data.forEach(item => {
        let outcome = 'draw';
        if (item.ket_qua === 'Thắng') outcome = 'win';
        else if (item.ket_qua === 'Thua') outcome = 'lose';

        allItems.push({
          type: 'van',
          time: new Date(item.thoi_gian),
          playerGesture: item.nguoi_choi,
          computerGesture: item.may_tinh,
          outcome: outcome
        });
      });
    }

    // Thêm các kết quả chung cuộc
    if (dataCC.thanh_cong && dataCC.data) {
      dataCC.data.forEach(item => {
        allItems.push({
          type: 'chungcuoc',
          time: new Date(item.thoi_gian),
          winner: item.ket_qua === 'Thắng' ? 'player' : 'computer',
          finalScore: `${item.so_van_nguoi_choi} - ${item.so_van_may_tinh}`,
          playerScore: item.so_van_nguoi_choi,
          computerScore: item.so_van_may_tinh
        });
      });
    }

    // Sắp xếp theo thời gian MỚI NHẤT trước
    allItems.sort((a, b) => b.time - a.time);

    // Duyệt và build result
    let result = [];
    let vansBeforeChungCuoc = []; // Tích lũy các ván trước khi gặp chungcuoc
    
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      
      if (item.type === 'chungcuoc') {
        // Gặp kết quả chung cuộc - đánh số các ván đã tích lũy
        const totalVans = vansBeforeChungCuoc.length;
        vansBeforeChungCuoc.forEach((van, idx) => {
          // Ván mới nhất (idx=0) có round = totalVans, ván cũ nhất có round = 1
          van.round = totalVans - idx;
          result.push(van);
        });
        vansBeforeChungCuoc = [];
        
        // Thêm kết quả chung cuộc
        result.push({
          isMatchEnd: true,
          winner: item.winner,
          finalScore: item.finalScore,
          playerScore: item.playerScore,
          computerScore: item.computerScore
        });
        
        // Thêm separator nếu còn items phía sau
        if (i < allItems.length - 1) {
          result.push({
            isSeparator: true,
            text: '────── Trận trước ──────'
          });
        }
      } else {
        // Ván đấu - tích lũy tạm
        vansBeforeChungCuoc.push({
          playerGesture: item.playerGesture,
          computerGesture: item.computerGesture,
          outcome: item.outcome,
          playerScore: 0,
          computerScore: 0,
          round: 0,
          fromDb: true
        });
      }
    }
    
    // Các ván còn lại (trận chưa kết thúc) - đánh số tương tự
    if (vansBeforeChungCuoc.length > 0) {
      const totalVans = vansBeforeChungCuoc.length;
      vansBeforeChungCuoc.forEach((van, idx) => {
        van.round = totalVans - idx;
        result.push(van);
      });
    }

    state.history = result;
    renderHistory();
  } catch (e) {
    console.log('Không thể load lịch sử:', e);
  }
}

async function saveMatchToDb(nguoiChoi, mayTinh) {
  // Không lưu nếu là khách
  if (state.isGuest) return;
  
  try {
    await fetch('/api/luutran', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nguoi_choi: nguoiChoi, may_tinh: mayTinh })
    });
  } catch (e) {
    console.log('Không thể lưu trận đấu');
  }
}

async function saveMatchResultToDb(soVanNguoiChoi, soVanMayTinh) {
  // Không lưu nếu là khách
  if (state.isGuest) return;
  
  try {
    await fetch('/api/luuchungcuoc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        so_van_nguoi_choi: soVanNguoiChoi, 
        so_van_may_tinh: soVanMayTinh 
      })
    });
    // Cập nhật lại thông tin user sau khi lưu
    loadUserInfo();
  } catch (e) {
    console.log('Không thể lưu kết quả chung cuộc');
  }
}

// Load user info khi trang load
document.addEventListener('DOMContentLoaded', () => {
  setupAuthModal();
  loadUserInfo();
});


// DOM refs
const videoEl = document.getElementById('input-video');
const canvasEl = document.getElementById('output-canvas');
const ctx = canvasEl.getContext('2d');
const gestureChip = document.getElementById('gesture-chip');
const countdownEl = document.getElementById('countdown');
const roundBtn = document.getElementById('round-btn');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const playerScoreEl = document.getElementById('player-score');
const computerScoreEl = document.getElementById('computer-score');
const playerGestureEl = document.getElementById('player-gesture');
const computerGestureEl = document.getElementById('computer-gesture');
const resultTextEl = document.getElementById('result-text');
const historyEl = document.getElementById('history');
const celebrationEl = document.getElementById('celebration');
const celebrationTitleEl = document.getElementById('celebration-title');
const celebrationSubEl = document.getElementById('celebration-sub');
const celebrationBtn = document.getElementById('celebration-btn');
const fireworksCanvas = document.getElementById('fireworks');
const fCtx = fireworksCanvas.getContext('2d');

const gameoverEl = document.getElementById('gameover');
const gameoverTitleEl = document.getElementById('gameover-title');
const gameoverSubEl = document.getElementById('gameover-sub');
const gameoverBtn = document.getElementById('gameover-btn');
const gameoverCanvas = document.getElementById('gameover-effects');
const gCtx = gameoverCanvas.getContext('2d');

// Debug: Check if all elements exist
console.log('DOM Elements Check:', {
  videoEl: !!videoEl,
  canvasEl: !!canvasEl,
  gestureChip: !!gestureChip,
  startBtn: !!startBtn,
  roundBtn: !!roundBtn
});

if (!videoEl || !canvasEl || !gestureChip) {
  console.error('Critical DOM elements missing!');
  alert('Lỗi: Không tìm thấy video/canvas elements. Vui lòng kiểm tra HTML.');
}

state.celebrating = false;
state.gameovering = false;
state.fireworks = [];
state.fireworksLoop = null;
state.fireworksSpawner = null;
state.audioContext = null;
state.sparkles = [];

// MediaPipe Hands setup
const hands = new Hands({
  locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

hands.onResults(onResults);

async function startCamera() {
  if (state.running) {
    console.log('Camera already running');
    return;
  }

  if (!videoEl) {
    console.error('Video element not found!');
    alert('Lỗi: Không tìm thấy video element');
    return;
  }

  console.log('Starting camera...');
  console.log('Video element:', videoEl);

  try {
    // Phương pháp 1: Dùng getUserMedia trực tiếp
    console.log('Requesting camera permission...');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 960 },
        height: { ideal: 540 },
        facingMode: 'user'
      }
    });

    console.log('Camera stream obtained:', stream);
    videoEl.srcObject = stream;

    // Đợi video sẵn sàng
    await new Promise((resolve) => {
      videoEl.onloadedmetadata = () => {
        console.log('Video metadata loaded');
        videoEl.play();
        resolve();
      };
    });

    console.log('Video playing, setting up MediaPipe...');

    // Setup MediaPipe processing loop
    const sendToMediaPipe = async () => {
      if (!state.running) return;
      await hands.send({ image: videoEl });
      requestAnimationFrame(sendToMediaPipe);
    };

    state.running = true;
    updateGestureChip('Đang nhận tay...', 'active');
    sendToMediaPipe();

    console.log('Camera started successfully');
  } catch (error) {
    console.error('Error starting camera:', error);
    alert('Lỗi khởi động camera: ' + error.message + '\nVui lòng cho phép truy cập camera.');
  }
}

function stopCamera() {
  if (!state.running) return;

  // Stop MediaPipe loop
  state.running = false;

  // Stop video stream
  if (videoEl && videoEl.srcObject) {
    const tracks = videoEl.srcObject.getTracks();
    tracks.forEach(track => track.stop());
    videoEl.srcObject = null;
  }

  // Stop old Camera utility if exists
  if (state.camera && state.camera.stop) {
    state.camera.stop();
  }

  updateGestureChip('Đã dừng', 'idle');
  console.log('Camera stopped');
}

function resetGame() {
  stopCamera();
  
  // Nếu trận trước đã kết thúc (có isMatchEnd ở đầu), thêm separator
  if (state.history.length > 0 && state.history[0].isMatchEnd) {
    state.history.unshift({
      isSeparator: true,
      text: '────── Trận trước ──────'
    });
  }
  
  state.playerScore = 0;
  state.computerScore = 0;
  // KHÔNG xóa history để giữ lại các trận đấu trước
  // state.history = [];
  state.currentGesture = 'Unknown';
  state.countdownValue = 0;
  stopCelebration();
  stopGameover();
  renderScores();
  // Vẫn hiển thị history cũ
  renderHistory();
  resultTextEl.textContent = 'Nhấn "Chơi ván" để bắt đầu';
  playerGestureEl.textContent = '-';
  computerGestureEl.textContent = '-';
  gestureChip.textContent = 'Chưa thấy tay';
}

async function clearHistory() {
  if (!confirm('Bạn có chắc muốn xóa toàn bộ lịch sử? Dữ liệu sẽ bị xóa vĩnh viễn!')) {
    return;
  }
  
  // Xóa local
  state.history = [];
  renderHistory();
  
  // Luôn thử xóa trên database (API sẽ tự kiểm tra session)
  try {
    console.log('🔄 Đang gọi API xóa lịch sử...');
    const res = await fetch('/api/xoalichsu', { method: 'POST' });
    const data = await res.json();
    console.log('📤 Kết quả:', data);
    if (data.thanh_cong) {
      console.log('✅ Đã xóa lịch sử trên database');
      // Reload thông tin user (để cập nhật thống kê)
      loadUserInfo();
    } else {
      console.log('⚠️ Không xóa được:', data.thong_bao);
    }
  } catch (e) {
    console.log('❌ Không thể xóa lịch sử trên server:', e);
  }
}

function onResults(results) {
  canvasEl.width = videoEl.videoWidth;
  canvasEl.height = videoEl.videoHeight;
  ctx.save();
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length) {
    const landmarks = results.multiHandLandmarks[0];
    drawLandmarks(ctx, landmarks, { color: '#4cf1c5', lineWidth: 3 });
    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#6f8bff', lineWidth: 2 });

    const gesture = classifyGesture(landmarks);
    state.currentGesture = gesture;
    updateGestureChip(`Cử chỉ: ${gesture}`, 'active');
  } else {
    state.currentGesture = 'Không thấy tay';
    updateGestureChip('Không thấy tay', 'idle');
  }

  ctx.restore();
}

function classifyGesture(landmarks) {
  const idx = landmarks[8];
  const mid = landmarks[12];
  const ring = landmarks[16];
  const pinky = landmarks[20];

  const idxBase = landmarks[5];
  const midBase = landmarks[9];
  const ringBase = landmarks[13];
  const pinkyBase = landmarks[17];

  const indexUp = idx.y < idxBase.y && idx.y < landmarks[6].y;
  const middleUp = mid.y < midBase.y && mid.y < landmarks[10].y;
  const ringUp = ring.y < ringBase.y && ring.y < landmarks[14].y;
  const pinkyUp = pinky.y < pinkyBase.y && pinky.y < landmarks[18].y;

  const upCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

  if (indexUp && middleUp && !ringUp && !pinkyUp) return 'Kéo';
  if (indexUp && middleUp && ringUp && pinkyUp) return 'Bao';
  if (upCount === 0) return 'Búa';
  return 'Không rõ';
}

function playRound() {
  if (state.celebrating) return;
  if (!state.running) startCamera();
  if (state.countdownTimer) return;

  console.log('Starting countdown...');
  state.countdownValue = 3;
  countdownEl.textContent = state.countdownValue;
  countdownEl.style.display = 'grid'; // Ensure visible

  state.countdownTimer = setInterval(() => {
    state.countdownValue -= 1;
    console.log('Countdown:', state.countdownValue);
    if (state.countdownValue > 0) {
      countdownEl.textContent = state.countdownValue;
    } else {
      clearInterval(state.countdownTimer);
      state.countdownTimer = null;
      countdownEl.textContent = '';
      countdownEl.style.display = 'none'; // Hide when done
      finalizeRound();
    }
  }, 1000);
}

function finalizeRound() {
  const playerGesture = state.currentGesture;
  const computerGesture = ['Búa', 'Kéo', 'Bao'][Math.floor(Math.random() * 3)];

  const outcome = decideWinner(playerGesture, computerGesture);
  if (outcome === 'win') state.playerScore += 1;
  if (outcome === 'lose') state.computerScore += 1;

  // Lưu trận đấu vào database
  saveMatchToDb(playerGesture, computerGesture);

  renderScores();
  renderResult(playerGesture, computerGesture, outcome);
  pushHistory(playerGesture, computerGesture, outcome);

  if (state.playerScore === 3) {
    // Lưu kết quả chung cuộc vào database
    saveMatchResultToDb(state.playerScore, state.computerScore);
    
    // Thêm kết quả trận đấu vào lịch sử (đầu tiên)
    state.history.unshift({
      isMatchEnd: true,
      winner: 'player',
      finalScore: `${state.playerScore} - ${state.computerScore}`,
      playerScore: state.playerScore,
      computerScore: state.computerScore
    });
    renderHistory();
    showCelebration('player');
  } else if (state.computerScore === 3) {
    // Lưu kết quả chung cuộc vào database
    saveMatchResultToDb(state.playerScore, state.computerScore);
    
    // Thêm kết quả trận đấu vào lịch sử (đầu tiên)
    state.history.unshift({
      isMatchEnd: true,
      winner: 'computer',
      finalScore: `${state.playerScore} - ${state.computerScore}`,
      playerScore: state.playerScore,
      computerScore: state.computerScore
    });
    renderHistory();
    showGameover();
  }
}

function decideWinner(player, computer) {
  if (player === computer) return 'draw';
  if (player === 'Búa' && computer === 'Kéo') return 'win';
  if (player === 'Kéo' && computer === 'Bao') return 'win';
  if (player === 'Bao' && computer === 'Búa') return 'win';
  return 'lose';
}

function renderScores() {
  playerScoreEl.textContent = state.playerScore;
  computerScoreEl.textContent = state.computerScore;
}

function renderResult(playerGesture, computerGesture, outcome) {
  playerGestureEl.textContent = playerGesture;
  computerGestureEl.textContent = computerGesture;

  const palette = { win: '#4cf1c5', lose: '#ff8f8f', draw: '#ffc857' };
  const text = outcome === 'win' ? 'Bạn thắng ván này!' : outcome === 'lose' ? 'Máy thắng ván này!' : 'Hòa!';
  resultTextEl.textContent = `${text} (${playerGesture} vs ${computerGesture})`;
  resultTextEl.style.borderColor = palette[outcome];
}

function pushHistory(playerGesture, computerGesture, outcome) {
  // Tính số ván trong trận hiện tại (đếm các ván trước kết quả chung cuộc)
  let roundCount = 0;
  for (const item of state.history) {
    if (item.isMatchEnd || item.isSeparator) break;
    if (!item.isMatchEnd && !item.isSeparator) roundCount++;
  }
  
  state.history.unshift({
    playerGesture,
    computerGesture,
    outcome,
    playerScore: state.playerScore,
    computerScore: state.computerScore,
    round: roundCount + 1,
    fromDb: false
  });
  if (state.history.length > 20) state.history.pop();
  renderHistory();
}

function renderHistory() {
  historyEl.innerHTML = '';
  if (state.history.length === 0) {
    historyEl.innerHTML = '<div class="history-empty">🎮 Chưa có lịch sử</div>';
    return;
  }

  state.history.forEach((item, idx) => {
    const row = document.createElement('div');

    // Nếu là separator
    if (item.isSeparator) {
      row.className = 'history-separator';
      row.textContent = item.text;
    }
    // Nếu là kết quả trận đấu
    else if (item.isMatchEnd) {
      row.className = 'history-item match-end';

      if (item.winner === 'player') {
        row.innerHTML = `
          <div class="match-end-content">
            <div class="match-end-header">
              <span class="match-end-icon">🏆 🎉</span>
              <span class="match-end-title">CHIẾN THẮNG TRẬN ĐẤU!</span>
            </div>
            <div class="match-end-score">
              <span class="final-score">${item.finalScore}</span>
              <span class="fireworks-icon">🎆 🎇 ✨</span>
            </div>
          </div>
        `;
      } else {
        row.innerHTML = `
          <div class="match-end-content">
            <div class="match-end-header">
              <span class="match-end-icon lose">😔</span>
              <span class="match-end-title lose">THUA TRẬN ĐẤU</span>
            </div>
            <div class="match-end-score">
              <span class="final-score lose">${item.finalScore}</span>
              <span class="encourage-text">💪 Cố gắng lần sau!</span>
            </div>
          </div>
        `;
      }
    } else {
      // Ván chơi bình thường
      row.className = 'history-item';

      // Icon cho cử chỉ
      const gestureIcons = { 'Búa': '✊', 'Kéo': '✌️', 'Bao': '✋' };
      const playerIcon = gestureIcons[item.playerGesture] || '❓';
      const computerIcon = gestureIcons[item.computerGesture] || '❓';

      // Icon kết quả và text
      let resultIcon = '';
      let resultText = '';
      if (item.outcome === 'win') {
        resultIcon = '🌟';
        resultText = 'THẮNG';
      } else if (item.outcome === 'lose') {
        resultIcon = '😕';
        resultText = 'THUA';
      } else {
        resultIcon = '🤝';
        resultText = 'HÒA';
      }

      // Nếu từ database thì không hiển thị tỷ số (vì không có)
      const scoreDisplay = item.fromDb ? '' : `<span class="history-score">${item.playerScore} - ${item.computerScore}</span>`;
      
      row.innerHTML = `
        <div class="history-main">
          <span class="history-round">🎯 Ván ${item.round || '?'}</span>
          <span class="history-gestures">${playerIcon} vs ${computerIcon}</span>
        </div>
        <div class="history-result">
          ${scoreDisplay}
          <span class="tag ${item.outcome}">${resultIcon} ${resultText}</span>
        </div>
      `;
    }

    historyEl.appendChild(row);
  });
}

function updateGestureChip(text, mode) {
  // Cập nhật cho structure mới với 2 spans
  const spans = gestureChip.querySelectorAll('span');
  if (spans.length >= 2) {
    // Giữ icon ở span đầu, update text ở span thứ 2
    spans[1].textContent = text;
  } else {
    // Fallback nếu structure cũ
    gestureChip.textContent = text;
  }

  // Update màu nền
  if (mode === 'active') {
    gestureChip.style.background = 'rgba(0, 255, 255, 0.8)';
    gestureChip.style.borderColor = 'var(--cyber-cyan)';
    gestureChip.style.color = 'var(--bg-dark)';
    if (spans.length >= 1) spans[0].textContent = '✓';
  } else {
    gestureChip.style.background = 'rgba(255, 20, 147, 0.8)';
    gestureChip.style.borderColor = 'var(--cyber-pink)';
    gestureChip.style.color = 'white';
    if (spans.length >= 1) spans[0].textContent = '⚠';
  }
}

function showCelebration(winner) {
  if (state.celebrating) return;
  state.celebrating = true;
  celebrationTitleEl.textContent = winner === 'player' ? 'Bạn chiến thắng!' : 'Máy chiến thắng!';
  celebrationSubEl.textContent = 'Chiến thắng 3 ván trước. Bấm để chơi lại.';
  celebrationEl.classList.remove('hidden');
  celebrationEl.classList.add('show');
  resizeFireworks();
  window.addEventListener('resize', resizeFireworks);
  state.rockets = [];
  state.fireworks = [];
  state.sparkles = [];
  state.flashes = [];
  
  // Spawn ngay 3 quả đầu tiên
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      if (state.celebrating) state.rockets.push(new Rocket());
    }, i * 150);
  }
  
  // Spawn liên tục
  state.fireworksSpawner = setInterval(() => {
    if (state.celebrating) spawnRocket();
  }, 350);
  
  animateFireworks();
}

function stopCelebration() {
  celebrationEl.classList.remove('show');
  celebrationEl.classList.add('hidden');
  state.celebrating = false;
  state.fireworks = [];
  state.sparkles = [];
  state.rockets = [];
  state.flashes = [];
  if (state.fireworksSpawner) clearInterval(state.fireworksSpawner);
  state.fireworksSpawner = null;
  if (state.fireworksLoop) cancelAnimationFrame(state.fireworksLoop);
  state.fireworksLoop = null;
  window.removeEventListener('resize', resizeFireworks);

  // Dọn dẹp audio context nếu cần
  if (state.audioContext) {
    try {
      state.audioContext.close();
    } catch (e) { }
    state.audioContext = null;
  }
}

// ========== GAMEOVER SCREEN ==========
function showGameover() {
  if (state.gameovering) return;
  state.gameovering = true;
  gameoverEl.classList.remove('hidden');
  gameoverEl.classList.add('show');
  resizeGameoverCanvas();
  window.addEventListener('resize', resizeGameoverCanvas);
  state.gameoverLoop = requestAnimationFrame(animateGameover);
}

function stopGameover() {
  gameoverEl.classList.remove('show');
  gameoverEl.classList.add('hidden');
  state.gameovering = false;
  state.gameoverParticles = [];
  if (state.gameoverLoop) cancelAnimationFrame(state.gameoverLoop);
  state.gameoverLoop = null;
  window.removeEventListener('resize', resizeGameoverCanvas);
}

function resizeGameoverCanvas() {
  gameoverCanvas.width = window.innerWidth;
  gameoverCanvas.height = window.innerHeight;
}

// Gameover particle effect (falling red particles)
state.gameoverParticles = [];

class GameoverParticle {
  constructor() {
    this.x = Math.random() * gameoverCanvas.width;
    this.y = Math.random() * gameoverCanvas.height - gameoverCanvas.height;
    this.size = Math.random() * 3 + 1;
    this.speedY = Math.random() * 2 + 1;
    this.opacity = Math.random() * 0.5 + 0.3;
    this.color = Math.random() > 0.5 ? '#ff0000' : '#ff4444';
  }

  update() {
    this.y += this.speedY;
    if (this.y > gameoverCanvas.height) {
      this.y = -10;
      this.x = Math.random() * gameoverCanvas.width;
    }
  }

  draw() {
    gCtx.fillStyle = this.color;
    gCtx.globalAlpha = this.opacity;
    gCtx.fillRect(this.x, this.y, this.size, this.size);
    gCtx.globalAlpha = 1;
  }
}

function animateGameover() {
  gCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  gCtx.fillRect(0, 0, gameoverCanvas.width, gameoverCanvas.height);

  // Spawn particles
  if (state.gameoverParticles.length < 150) {
    for (let i = 0; i < 3; i++) {
      state.gameoverParticles.push(new GameoverParticle());
    }
  }

  // Update and draw particles
  state.gameoverParticles.forEach(p => {
    p.update();
    p.draw();
  });

  // Red vignette effect
  const gradient = gCtx.createRadialGradient(
    gameoverCanvas.width / 2, gameoverCanvas.height / 2, 0,
    gameoverCanvas.width / 2, gameoverCanvas.height / 2, gameoverCanvas.width / 2
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(139, 0, 0, 0.3)');
  gCtx.fillStyle = gradient;
  gCtx.fillRect(0, 0, gameoverCanvas.width, gameoverCanvas.height);

  if (state.gameovering) {
    state.gameoverLoop = requestAnimationFrame(animateGameover);
  }
}

// ========== GAMEOVER SCREEN ==========
function showGameover() {
  if (state.gameovering) return;
  state.gameovering = true;
  gameoverEl.classList.remove('hidden');
  gameoverEl.classList.add('show');
  resizeGameoverCanvas();
  window.addEventListener('resize', resizeGameoverCanvas);
  state.gameoverLoop = requestAnimationFrame(animateGameover);
}

function stopGameover() {
  gameoverEl.classList.remove('show');
  gameoverEl.classList.add('hidden');
  state.gameovering = false;
  state.gameoverParticles = [];
  if (state.gameoverLoop) cancelAnimationFrame(state.gameoverLoop);
  state.gameoverLoop = null;
  window.removeEventListener('resize', resizeGameoverCanvas);
}

function resizeGameoverCanvas() {
  gameoverCanvas.width = window.innerWidth;
  gameoverCanvas.height = window.innerHeight;
}

function animateGameover() {
  gCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  gCtx.fillRect(0, 0, gameoverCanvas.width, gameoverCanvas.height);

  // Spawn particles
  if (state.gameoverParticles.length < 150) {
    for (let i = 0; i < 3; i++) {
      state.gameoverParticles.push(new GameoverParticle());
    }
  }

  // Update and draw particles
  state.gameoverParticles.forEach(p => {
    p.update();
    p.draw();
  });

  // Red vignette effect
  const gradient = gCtx.createRadialGradient(
    gameoverCanvas.width / 2, gameoverCanvas.height / 2, 0,
    gameoverCanvas.width / 2, gameoverCanvas.height / 2, gameoverCanvas.width / 2
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(139, 0, 0, 0.3)');
  gCtx.fillStyle = gradient;
  gCtx.fillRect(0, 0, gameoverCanvas.width, gameoverCanvas.height);

  if (state.gameovering) {
    state.gameoverLoop = requestAnimationFrame(animateGameover);
  }
}
function resizeFireworks() {
  fireworksCanvas.width = window.innerWidth;
  fireworksCanvas.height = window.innerHeight;
}

// ========== ULTRA REALISTIC FIREWORK SOUNDS ==========
function playWhistleSound() {
  try {
    if (!state.audioContext) {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = state.audioContext;
    const now = ctx.currentTime;
    
    // Tiếng vút bay lên - realistic rocket whistle
    const duration = 0.6 + Math.random() * 0.3;
    
    // Main whistle - sine wave ascending
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(400 + Math.random() * 200, now);
    osc1.frequency.exponentialRampToValueAtTime(2000 + Math.random() * 500, now + duration);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + duration * 0.6);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + duration);
    
    // Harmonic layer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(800, now);
    osc2.frequency.exponentialRampToValueAtTime(3000, now + duration * 0.8);
    gain2.gain.setValueAtTime(0.04, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + duration);
    
    // Noise texture (rushing air)
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const highpass = ctx.createBiquadFilter();
    noise.buffer = noiseBuffer;
    highpass.type = 'highpass';
    highpass.frequency.value = 3000;
    noiseGain.gain.setValueAtTime(0.02, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    noise.connect(highpass);
    highpass.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  } catch (e) { }
}

function playExplosionSound(size = 1, x = 0.5) {
  try {
    if (!state.audioContext) {
      state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = state.audioContext;
    const now = ctx.currentTime;
    
    // Stereo panning based on x position
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) panner.pan.value = (x - 0.5) * 1.5;
    const output = panner || ctx.destination;
    if (panner) panner.connect(ctx.destination);
    
    const baseVolume = 0.25 + size * 0.25;
    
    // 1. Initial BOOM - deep bass impact
    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(120, now);
    boom.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    boomGain.gain.setValueAtTime(baseVolume * 1.2, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    boom.connect(boomGain);
    boomGain.connect(output);
    boom.start(now);
    boom.stop(now + 0.35);
    
    // 2. Mid-range punch
    const punch = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punch.type = 'sawtooth';
    punch.frequency.setValueAtTime(250, now);
    punch.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    punchGain.gain.setValueAtTime(baseVolume * 0.6, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    punch.connect(punchGain);
    punchGain.connect(output);
    punch.start(now);
    punch.stop(now + 0.2);
    
    // 3. White noise explosion burst
    const burstLength = 1.5 + size * 0.5;
    const burstBuffer = ctx.createBuffer(1, ctx.sampleRate * burstLength, ctx.sampleRate);
    const burstData = burstBuffer.getChannelData(0);
    for (let i = 0; i < burstData.length; i++) {
      const t = i / ctx.sampleRate;
      const env = Math.exp(-t * 2.5) * (1 + Math.sin(t * 50) * 0.2);
      burstData[i] = (Math.random() * 2 - 1) * env;
    }
    
    const burst = ctx.createBufferSource();
    const burstGain = ctx.createGain();
    const burstLowpass = ctx.createBiquadFilter();
    const burstHighpass = ctx.createBiquadFilter();
    
    burst.buffer = burstBuffer;
    burstHighpass.type = 'highpass';
    burstHighpass.frequency.value = 60;
    burstLowpass.type = 'lowpass';
    burstLowpass.frequency.setValueAtTime(5000, now);
    burstLowpass.frequency.exponentialRampToValueAtTime(200, now + burstLength);
    burstGain.gain.setValueAtTime(baseVolume * 0.8, now);
    burstGain.gain.exponentialRampToValueAtTime(0.001, now + burstLength);
    
    burst.connect(burstHighpass);
    burstHighpass.connect(burstLowpass);
    burstLowpass.connect(burstGain);
    burstGain.connect(output);
    burst.start(now);
    burst.stop(now + burstLength);
    
    // 4. Crackling aftermath - individual pops
    const crackleCount = 12 + Math.floor(Math.random() * 10);
    for (let i = 0; i < crackleCount; i++) {
      const delay = 0.15 + Math.random() * 0.8;
      setTimeout(() => {
        if (!state.audioContext || !state.celebrating) return;
        try {
          const pop = ctx.createOscillator();
          const popGain = ctx.createGain();
          const popFilter = ctx.createBiquadFilter();
          
          pop.type = 'square';
          pop.frequency.value = 100 + Math.random() * 200;
          popFilter.type = 'bandpass';
          popFilter.frequency.value = 600 + Math.random() * 1200;
          popFilter.Q.value = 8;
          
          const popVol = 0.06 + Math.random() * 0.06;
          popGain.gain.setValueAtTime(popVol, ctx.currentTime);
          popGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
          
          pop.connect(popFilter);
          popFilter.connect(popGain);
          popGain.connect(output);
          
          pop.start(ctx.currentTime);
          pop.stop(ctx.currentTime + 0.06);
        } catch (e) { }
      }, delay * 1000);
    }
    
    // 5. Distant echo effect
    setTimeout(() => {
      if (!state.audioContext || !state.celebrating) return;
      try {
        const echo = ctx.createOscillator();
        const echoGain = ctx.createGain();
        const echoFilter = ctx.createBiquadFilter();
        
        echo.type = 'sine';
        echo.frequency.setValueAtTime(60, ctx.currentTime);
        echo.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);
        echoFilter.type = 'lowpass';
        echoFilter.frequency.value = 300;
        echoGain.gain.setValueAtTime(baseVolume * 0.15, ctx.currentTime);
        echoGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        
        echo.connect(echoFilter);
        echoFilter.connect(echoGain);
        echoGain.connect(output);
        echo.start(ctx.currentTime);
        echo.stop(ctx.currentTime + 0.5);
      } catch (e) { }
    }, 200);
    
  } catch (e) { }
}

// ========== FIREWORK TYPES ==========
const FIREWORK_TYPES = {
  PEONY: 'peony',           // Tròn đều, phổ biến nhất
  CHRYSANTHEMUM: 'chrys',   // Tròn với trails dài
  WILLOW: 'willow',         // Rũ xuống như liễu
  PALM: 'palm',             // Như cây cọ
  RING: 'ring',             // Vòng tròn
  HEART: 'heart',           // Trái tim
  CROSSETTE: 'crossette',   // Nổ lần 2
  KAMURO: 'kamuro',         // Gold với trails rất dài
};

// ========== PARTICLE CLASS với trails ==========
class FireworkParticle {
  constructor(x, y, vx, vy, color, size, life, type = 'normal') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.type = type;
    this.trail = [];
    this.maxTrailLength = type === 'willow' || type === 'kamuro' ? 25 : 12;
    this.gravity = type === 'willow' ? 0.12 : 0.08;
    this.friction = type === 'kamuro' ? 0.995 : 0.985;
    this.flicker = Math.random();
    this.flickerSpeed = 0.1 + Math.random() * 0.1;
    this.secondaryExplosion = type === 'crossette' && Math.random() > 0.7;
    this.hasExploded = false;
  }
  
  update() {
    // Save trail position
    this.trail.push({ x: this.x, y: this.y, life: 1 });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
    
    // Update trail fade
    this.trail.forEach(t => t.life -= 0.08);
    
    // Physics
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= this.friction;
    this.vy *= this.friction;
    
    // Flicker
    this.flicker += this.flickerSpeed;
    if (this.flicker > 1 || this.flicker < 0.3) {
      this.flickerSpeed *= -1;
    }
    
    this.life--;
    
    // Secondary explosion for crossette
    if (this.secondaryExplosion && !this.hasExploded && this.life < this.maxLife * 0.4) {
      this.hasExploded = true;
      this.createSecondaryExplosion();
    }
    
    return this.life > 0;
  }
  
  createSecondaryExplosion() {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 2;
      state.fireworks.push(new FireworkParticle(
        this.x, this.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        this.color,
        this.size * 0.7,
        40,
        'normal'
      ));
    }
    // Mini pop sound
    playMiniPop();
  }
  
  draw(ctx) {
    const lifeRatio = this.life / this.maxLife;
    const alpha = lifeRatio * this.flicker;
    
    // Draw trail
    if (this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      
      for (let i = 1; i < this.trail.length; i++) {
        const t = this.trail[i];
        if (t.life > 0) {
          ctx.lineTo(t.x, t.y);
        }
      }
      
      ctx.strokeStyle = this.color + Math.floor(alpha * 100).toString(16).padStart(2, '0');
      ctx.lineWidth = this.size * lifeRatio;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    
    // Draw glow
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 5 * lifeRatio);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(0.3, this.color + '88');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 5 * lifeRatio, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw core with flicker
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.fillStyle = alpha > 0.5 ? '#ffffff' : this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * lifeRatio * (0.8 + this.flicker * 0.4), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function playMiniPop() {
  try {
    if (!state.audioContext) return;
    const ctx = state.audioContext;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) { }
}

// ========== ROCKET CLASS - Ultra realistic ==========
class Rocket {
  constructor() {
    this.x = Math.random() * fireworksCanvas.width * 0.8 + fireworksCanvas.width * 0.1;
    this.y = fireworksCanvas.height + 20;
    this.targetY = Math.random() * fireworksCanvas.height * 0.4 + fireworksCanvas.height * 0.1;
    this.speed = Math.random() * 6 + 12; // Nhanh vừa phải
    this.acceleration = 0.1;
    this.wobble = 0;
    this.wobbleSpeed = 0.1 + Math.random() * 0.1;
    this.trail = [];
    this.sparks = [];
    this.exploded = false;
    
    // Random firework type
    const types = Object.values(FIREWORK_TYPES);
    this.fireworkType = types[Math.floor(Math.random() * types.length)];
    
    // Colors based on type
    this.colorSets = this.getColorSet();
    
    playWhistleSound();
  }
  
  getColorSet() {
    const sets = {
      [FIREWORK_TYPES.PEONY]: [
        ['#ff3366', '#ff6699', '#ff99cc', '#ffffff'],
        ['#3366ff', '#6699ff', '#99ccff', '#ffffff'],
        ['#ff9900', '#ffcc00', '#ffff00', '#ffffff'],
      ],
      [FIREWORK_TYPES.CHRYSANTHEMUM]: [
        ['#ff00ff', '#ff66ff', '#ffccff', '#ffffff'],
        ['#00ffff', '#66ffff', '#ccffff', '#ffffff'],
      ],
      [FIREWORK_TYPES.WILLOW]: [
        ['#ffd700', '#ffec8b', '#fffacd', '#ffffff'],
        ['#c0c0c0', '#d3d3d3', '#e8e8e8', '#ffffff'],
      ],
      [FIREWORK_TYPES.PALM]: [
        ['#ff4500', '#ff6347', '#ff7f50', '#ffa07a'],
        ['#32cd32', '#7cfc00', '#adff2f', '#ffffff'],
      ],
      [FIREWORK_TYPES.RING]: [
        ['#ff1493', '#ff69b4', '#ffb6c1', '#ffffff'],
        ['#00ff7f', '#7fff00', '#adff2f', '#ffffff'],
      ],
      [FIREWORK_TYPES.CROSSETTE]: [
        ['#9400d3', '#ba55d3', '#da70d6', '#ffffff'],
        ['#ff0000', '#ff4444', '#ff8888', '#ffffff'],
      ],
      [FIREWORK_TYPES.KAMURO]: [
        ['#ffd700', '#daa520', '#b8860b', '#f0e68c'],
      ],
      [FIREWORK_TYPES.HEART]: [
        ['#ff0000', '#ff3333', '#ff6666', '#ffffff'],
        ['#ff69b4', '#ff1493', '#ff00ff', '#ffffff'],
      ],
    };
    const typeSet = sets[this.fireworkType] || sets[FIREWORK_TYPES.PEONY];
    return typeSet[Math.floor(Math.random() * typeSet.length)];
  }
  
  update() {
    if (this.exploded) return true;
    
    // Accelerate slightly
    this.speed += this.acceleration;
    
    // Wobble motion
    this.wobble += this.wobbleSpeed;
    const wobbleX = Math.sin(this.wobble) * 1.5;
    
    this.x += wobbleX;
    this.y -= this.speed;
    
    // Trail with smoke effect
    this.trail.push({ 
      x: this.x, 
      y: this.y, 
      alpha: 1,
      size: 3 + Math.random() * 2
    });
    if (this.trail.length > 30) this.trail.shift();
    this.trail.forEach(t => {
      t.alpha -= 0.035;
      t.size *= 0.98;
    });
    
    // Emit sparks
    if (Math.random() > 0.3) {
      this.sparks.push({
        x: this.x + (Math.random() - 0.5) * 4,
        y: this.y + 5,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 3 + 1,
        life: 20 + Math.random() * 10,
        size: 1 + Math.random() * 2
      });
    }
    
    // Update sparks
    this.sparks = this.sparks.filter(s => {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.1;
      s.life--;
      return s.life > 0;
    });
    
    if (this.y <= this.targetY) {
      this.explode();
      return true;
    }
    return false;
  }
  
  draw() {
    if (this.exploded) return;
    
    // Draw smoke trail
    this.trail.forEach(t => {
      if (t.alpha > 0) {
        fCtx.fillStyle = `rgba(200, 180, 150, ${t.alpha * 0.3})`;
        fCtx.beginPath();
        fCtx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
        fCtx.fill();
      }
    });
    
    // Draw fire trail
    for (let i = 1; i < this.trail.length; i++) {
      const t = this.trail[i];
      const prev = this.trail[i - 1];
      if (t.alpha > 0.2) {
        const gradient = fCtx.createLinearGradient(prev.x, prev.y, t.x, t.y);
        gradient.addColorStop(0, `rgba(255, 200, 50, ${t.alpha})`);
        gradient.addColorStop(1, `rgba(255, 100, 0, ${t.alpha * 0.5})`);
        
        fCtx.strokeStyle = gradient;
        fCtx.lineWidth = 3 * t.alpha;
        fCtx.beginPath();
        fCtx.moveTo(prev.x, prev.y);
        fCtx.lineTo(t.x, t.y);
        fCtx.stroke();
      }
    }
    
    // Draw sparks
    this.sparks.forEach(s => {
      const alpha = s.life / 30;
      fCtx.fillStyle = `rgba(255, ${180 + Math.random() * 75}, 50, ${alpha})`;
      fCtx.beginPath();
      fCtx.arc(s.x, s.y, s.size * alpha, 0, Math.PI * 2);
      fCtx.fill();
    });
    
    // Draw rocket head with glow
    fCtx.shadowBlur = 20;
    fCtx.shadowColor = '#ff6600';
    fCtx.fillStyle = '#ffffff';
    fCtx.beginPath();
    fCtx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    fCtx.fill();
    
    // Bright core
    fCtx.fillStyle = '#ffff00';
    fCtx.beginPath();
    fCtx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    fCtx.fill();
    fCtx.shadowBlur = 0;
  }
  
  explode() {
    this.exploded = true;
    
    const size = 0.8 + Math.random() * 0.4;
    const xPos = this.x / fireworksCanvas.width; // 0-1 for stereo panning
    playExplosionSound(size, xPos);
    
    const colors = this.colorSets;
    
    switch (this.fireworkType) {
      case FIREWORK_TYPES.PEONY:
        this.createPeony(colors);
        break;
      case FIREWORK_TYPES.CHRYSANTHEMUM:
        this.createChrysanthemum(colors);
        break;
      case FIREWORK_TYPES.WILLOW:
        this.createWillow(colors);
        break;
      case FIREWORK_TYPES.PALM:
        this.createPalm(colors);
        break;
      case FIREWORK_TYPES.RING:
        this.createRing(colors);
        break;
      case FIREWORK_TYPES.CROSSETTE:
        this.createCrossette(colors);
        break;
      case FIREWORK_TYPES.KAMURO:
        this.createKamuro(colors);
        break;
      case FIREWORK_TYPES.HEART:
        this.createHeart(colors);
        break;
      default:
        this.createPeony(colors);
    }
    
    // Center flash
    this.createFlash();
  }
  
  createFlash() {
    // Bright center flash
    state.flashes = state.flashes || [];
    state.flashes.push({
      x: this.x,
      y: this.y,
      radius: 5,
      maxRadius: 80 + Math.random() * 40,
      life: 1,
      color: '#ffffff'
    });
    
    // Sparks flying out
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 6;
      state.sparkles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 30,
        size: 2 + Math.random() * 3,
        color: '#ffffff',
        twinkle: Math.random()
      });
    }
    
    // Golden sparks
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      state.sparkles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 40 + Math.random() * 20,
        maxLife: 40,
        size: 1.5 + Math.random() * 2,
        color: '#ffd700',
        twinkle: Math.random()
      });
    }
  }
  
  createPeony(colors) {
    const count = 60 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 3 + Math.random() * 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      state.fireworks.push(new FireworkParticle(
        this.x, this.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        2 + Math.random() * 2,
        80 + Math.random() * 30,
        'peony'
      ));
    }
  }
  
  createChrysanthemum(colors) {
    const count = 80 + Math.floor(Math.random() * 30);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2.5 + Math.random() * 3;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const p = new FireworkParticle(
        this.x, this.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        2.5 + Math.random() * 1.5,
        120 + Math.random() * 40,
        'chrys'
      );
      p.maxTrailLength = 20;
      p.friction = 0.99;
      state.fireworks.push(p);
    }
  }
  
  createWillow(colors) {
    const count = 50 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 2.5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      state.fireworks.push(new FireworkParticle(
        this.x, this.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed * 0.7 - 1,
        color,
        2 + Math.random() * 1.5,
        150 + Math.random() * 50,
        'willow'
      ));
    }
  }
  
  createPalm(colors) {
    const branches = 8 + Math.floor(Math.random() * 4);
    for (let b = 0; b < branches; b++) {
      const branchAngle = (Math.PI * 2 * b) / branches - Math.PI / 2;
      const particlesPerBranch = 12 + Math.floor(Math.random() * 5);
      
      for (let i = 0; i < particlesPerBranch; i++) {
        const spread = (i / particlesPerBranch) * 0.4;
        const angle = branchAngle + (Math.random() - 0.5) * spread;
        const speed = 2 + (i / particlesPerBranch) * 5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        state.fireworks.push(new FireworkParticle(
          this.x, this.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          color,
          2 + Math.random() * 2,
          90 + Math.random() * 30,
          'palm'
        ));
      }
    }
  }
  
  createRing(colors) {
    const rings = 2 + Math.floor(Math.random() * 2);
    for (let r = 0; r < rings; r++) {
      const count = 30 + r * 15;
      const speed = 3 + r * 2;
      
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const color = colors[r % colors.length];
        
        const p = new FireworkParticle(
          this.x, this.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          color,
          2,
          60 + Math.random() * 20,
          'ring'
        );
        p.gravity = 0.02;
        p.friction = 0.998;
        state.fireworks.push(p);
      }
    }
  }
  
  createCrossette(colors) {
    const count = 40;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 4 + Math.random() * 2;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      state.fireworks.push(new FireworkParticle(
        this.x, this.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        2.5,
        100,
        'crossette'
      ));
    }
  }
  
  createKamuro(colors) {
    const count = 100 + Math.floor(Math.random() * 30);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.2;
      const speed = 1.5 + Math.random() * 2;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      state.fireworks.push(new FireworkParticle(
        this.x, this.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 0.5,
        color,
        2,
        200 + Math.random() * 50,
        'kamuro'
      ));
    }
  }
  
  createHeart(colors) {
    const count = 50;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      // Heart parametric equations
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      
      const angle = Math.atan2(hy, hx);
      const dist = Math.sqrt(hx * hx + hy * hy) / 16;
      const speed = dist * 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      state.fireworks.push(new FireworkParticle(
        this.x, this.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        2.5,
        100,
        'heart'
      ));
    }
  }
}

// Arrays
state.rockets = [];
state.sparkles = state.sparkles || [];
state.flashes = state.flashes || [];

function spawnRocket() {
  // Luôn spawn rocket nếu chưa đủ số lượng đang bay
  const flyingRockets = state.rockets.filter(r => !r.exploded).length;
  if (flyingRockets < 4) {
    state.rockets.push(new Rocket());
  }
  
  // Giới hạn tổng số particles để không bị lag
  if (state.fireworks.length > 500) {
    state.fireworks = state.fireworks.slice(-300);
  }
  if (state.sparkles.length > 200) {
    state.sparkles = state.sparkles.slice(-100);
  }
}

function animateFireworks() {
  // Kiểm tra nếu không còn celebrating thì dừng
  if (!state.celebrating) return;
  
  try {
    // Dark fade for trails - slightly slower for better trails
    fCtx.fillStyle = 'rgba(5, 5, 15, 0.08)';
    fCtx.fillRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
  
  // Draw flash effects (bright explosion center)
  state.flashes = state.flashes || [];
  state.flashes = state.flashes.filter(f => f.life > 0);
  for (const f of state.flashes) {
    f.radius += (f.maxRadius - f.radius) * 0.3;
    f.life -= 0.08;
    
    if (f.life > 0) {
      const gradient = fCtx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${f.life})`);
      gradient.addColorStop(0.2, `rgba(255, 255, 200, ${f.life * 0.8})`);
      gradient.addColorStop(0.5, `rgba(255, 200, 100, ${f.life * 0.4})`);
      gradient.addColorStop(1, 'transparent');
      
      fCtx.fillStyle = gradient;
      fCtx.beginPath();
      fCtx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      fCtx.fill();
    }
  }
  
  // Update and draw rockets
  state.rockets = state.rockets.filter(r => {
    const done = r.update();
    r.draw();
    return !done;
  });
  
  // Draw sparkles with twinkle effect
  state.sparkles = state.sparkles.filter(s => s.life > 0);
  for (const s of state.sparkles) {
    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.15;
    s.vx *= 0.97;
    s.life--;
    
    // Twinkle effect
    if (s.twinkle !== undefined) {
      s.twinkle += 0.2;
    }
    const twinkleFactor = s.twinkle ? (0.5 + Math.sin(s.twinkle) * 0.5) : 1;
    
    const maxLife = s.maxLife || 25;
    const alpha = (s.life / maxLife) * twinkleFactor;
    const color = s.color || '#ffffff';
    
    // Glow
    const glowSize = (s.size || 2) * 4 * (s.life / maxLife);
    const gradient = fCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowSize);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.3, color + '88');
    gradient.addColorStop(1, 'transparent');
    fCtx.fillStyle = gradient;
    fCtx.globalAlpha = alpha * 0.5;
    fCtx.beginPath();
    fCtx.arc(s.x, s.y, glowSize, 0, Math.PI * 2);
    fCtx.fill();
    
    // Core
    fCtx.globalAlpha = alpha;
    fCtx.shadowBlur = 10;
    fCtx.shadowColor = color;
    fCtx.fillStyle = '#ffffff';
    fCtx.beginPath();
    fCtx.arc(s.x, s.y, (s.size || 2) * (s.life / maxLife), 0, Math.PI * 2);
    fCtx.fill();
    fCtx.shadowBlur = 0;
    fCtx.globalAlpha = 1;
  }
  
  // Draw and update firework particles
  state.fireworks = state.fireworks.filter(p => {
    const alive = p.update();
    if (alive) p.draw(fCtx);
    return alive;
  });
  
  } catch (e) {
    console.error('Fireworks error:', e);
  }
  
  // Luôn tiếp tục animation nếu đang celebrating
  if (state.celebrating) {
    state.fireworksLoop = requestAnimationFrame(animateFireworks);
  }
}

celebrationBtn.addEventListener('click', resetGame);
gameoverBtn.addEventListener('click', resetGame);

// Wire UI
startBtn.addEventListener('click', startCamera);
pauseBtn.addEventListener('click', stopCamera);
resetBtn.addEventListener('click', resetGame);
clearHistoryBtn.addEventListener('click', clearHistory);
roundBtn.addEventListener('click', playRound);

// Bootstrap
resetGame();

// Small helper to hint camera permission issues
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  resultTextEl.textContent = 'Trình duyệt không hỗ trợ camera.';
  resultTextEl.style.color = '#ff8f8f';
}
