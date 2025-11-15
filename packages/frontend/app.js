// Canvas設定
let canvas, ctx, colorPicker, sizePicker, eraserSizePicker, clearBtn, penBtn, eraserBtn, wsStatus, rtcStatus;

let isDrawing = false;
let currentColor = '#000000';
let currentSize = 2;
let lastX = 0;
let lastY = 0;
let currentTool = 'pen';
let savedPenColor = '#000000';
let savedPenSize = 2;
let savedEraserSize = 20;

// ツール切り替え関数
function switchToPen() {
  if (currentTool === 'eraser') {
    savedEraserSize = currentSize;
  }
  currentTool = 'pen';
  currentColor = savedPenColor;
  currentSize = savedPenSize;
  const pen = penBtn || global.penBtn;
  const eraser = eraserBtn || global.eraserBtn;
  const picker = colorPicker || global.colorPicker;
  if (pen && eraser) {
    pen.classList.add('active');
    eraser.classList.remove('active');
  }
  if (picker) {
    picker.value = savedPenColor;
  }
  console.log('[ペン選択]', { tool: currentTool, color: currentColor, size: currentSize });
}

function switchToEraser() {
  if (currentTool === 'pen') {
    savedPenColor = currentColor;
    savedPenSize = currentSize;
  }
  currentTool = 'eraser';
  currentColor = '#FFFFFF';
  currentSize = savedEraserSize;
  const pen = penBtn || global.penBtn;
  const eraser = eraserBtn || global.eraserBtn;
  if (pen && eraser) {
    eraser.classList.add('active');
    pen.classList.remove('active');
  }
  console.log('[消しゴム選択]', { tool: currentTool, color: currentColor, size: currentSize, savedEraserSize });
}

// テスト用エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { switchToPen, switchToEraser };
}

// WebSocket接続（シグナリング用）
// TODO: デプロイ後にAPI Gateway WebSocket URLに変更
const WS_URL = 'ws://localhost:3001';
let ws = null;
let peerConnection = null;
let dataChannel = null;

function connectWebSocket() {
  ws = new WebSocket(WS_URL);
  
  ws.onopen = () => {
    wsStatus.textContent = '接続済み';
    wsStatus.style.color = 'green';
  };
  
  ws.onclose = () => {
    wsStatus.textContent = '切断';
    wsStatus.style.color = 'red';
  };
  
  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'offer') {
      await handleOffer(data);
    } else if (data.type === 'answer') {
      await handleAnswer(data);
    } else if (data.type === 'ice-candidate') {
      await handleIceCandidate(data);
    }
  };
}

// WebRTC設定
const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(config);
  
  peerConnection.onicecandidate = (event) => {
    if (event.candidate && ws) {
      ws.send(JSON.stringify({
        type: 'ice-candidate',
        candidate: event.candidate
      }));
    }
  };
  
  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    setupDataChannel();
  };
  
  peerConnection.onconnectionstatechange = () => {
    rtcStatus.textContent = peerConnection.connectionState;
    rtcStatus.style.color = peerConnection.connectionState === 'connected' ? 'green' : 'orange';
  };
}

function setupDataChannel() {
  dataChannel.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'clear') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      drawLine(data.x1, data.y1, data.x2, data.y2, data.color, data.size);
    }
  };
}

async function createOffer() {
  createPeerConnection();
  dataChannel = peerConnection.createDataChannel('draw');
  setupDataChannel();
  
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  
  ws.send(JSON.stringify({
    type: 'offer',
    offer: offer
  }));
}

async function handleOffer(data) {
  createPeerConnection();
  await peerConnection.setRemoteDescription(data.offer);
  
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  
  ws.send(JSON.stringify({
    type: 'answer',
    answer: answer
  }));
}

async function handleAnswer(data) {
  await peerConnection.setRemoteDescription(data.answer);
}

async function handleIceCandidate(data) {
  if (peerConnection) {
    await peerConnection.addIceCandidate(data.candidate);
  }
}

// 描画機能
function startDrawing(e) {
  isDrawing = true;
  [lastX, lastY] = [e.offsetX, e.offsetY];
}

function draw(e) {
  if (!isDrawing) return;
  
  const x = e.offsetX;
  const y = e.offsetY;
  
  drawLine(lastX, lastY, x, y, currentColor, currentSize);
  
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(JSON.stringify({
      x1: lastX, y1: lastY, x2: x, y2: y,
      color: currentColor, size: currentSize
    }));
  }
  
  [lastX, lastY] = [x, y];
}

function stopDrawing() {
  isDrawing = false;
}

function drawLine(x1, y1, x2, y2, color, size) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}



// 初期化
document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  colorPicker = document.getElementById('colorPicker');
  sizePicker = document.getElementById('sizePicker');
  eraserSizePicker = document.getElementById('eraserSizePicker');
  clearBtn = document.getElementById('clearBtn');
  penBtn = document.getElementById('penBtn');
  eraserBtn = document.getElementById('eraserBtn');
  wsStatus = document.getElementById('wsStatus');
  rtcStatus = document.getElementById('rtcStatus');
  
  // 描画イベント
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  
  // UI操作
  penBtn.addEventListener('click', switchToPen);
  eraserBtn.addEventListener('click', switchToEraser);
  
  const updateColor = (e) => {
    if (currentTool === 'pen') {
      currentColor = e.target.value;
      savedPenColor = e.target.value;
      console.log('[色変更]', { color: currentColor, savedPenColor });
    }
  };
  
  colorPicker.addEventListener('input', updateColor);
  colorPicker.addEventListener('change', updateColor);
  
  sizePicker.addEventListener('input', (e) => {
    if (currentTool === 'pen') {
      currentSize = parseInt(e.target.value);
      savedPenSize = parseInt(e.target.value);
    }
  });
  
  eraserSizePicker.addEventListener('input', (e) => {
    if (currentTool === 'eraser') {
      currentSize = parseInt(e.target.value);
      savedEraserSize = parseInt(e.target.value);
    }
  });
  
  clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify({ type: 'clear' }));
    }
  });
  
  connectWebSocket();
  setTimeout(() => createOffer(), 1000);
});
