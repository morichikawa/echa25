// Canvas設定
let canvasContainer, colorPicker, sizePicker, eraserSizePicker, clearBtn, penBtn, eraserBtn, wsStatus, rtcStatus;
let layers = [];
let activeLayerId = 0;
let nextLayerId = 1;

let isDrawing = false;
let currentColor = '#000000';
let currentSize = 2;
let lastX = 0;
let lastY = 0;
let currentTool = 'pen';
let savedPenColor = '#000000';
let savedPenSize = 2;
let savedEraserSize = 20;

// パン機能
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let offsetX = 0;
let offsetY = 0;
let scale = 1;
const CANVAS_WIDTH = 3000;
const CANVAS_HEIGHT = 2000;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

// レイヤー管理
function createLayer(name) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvas.style.zIndex = layers.length;
  canvasContainer.appendChild(canvas);
  
  const layer = {
    id: nextLayerId++,
    name: name || `レイヤー ${nextLayerId - 1}`,
    canvas: canvas,
    ctx: canvas.getContext('2d'),
    visible: true
  };
  
  layers.push(layer);
  updateLayerList();
  return layer;
}

function deleteLayer(id) {
  const index = layers.findIndex(l => l.id === id);
  if (index === -1 || layers.length === 1) return;
  
  const layer = layers[index];
  canvasContainer.removeChild(layer.canvas);
  layers.splice(index, 1);
  
  if (activeLayerId === id) {
    activeLayerId = layers[0].id;
  }
  
  updateLayerList();
}

function setActiveLayer(id) {
  activeLayerId = id;
  updateLayerList();
}

function getActiveLayer() {
  return layers.find(l => l.id === activeLayerId);
}

function moveLayer(fromIndex, toIndex) {
  const [layer] = layers.splice(fromIndex, 1);
  layers.splice(toIndex, 0, layer);
  
  // z-indexを更新
  layers.forEach((layer, index) => {
    layer.canvas.style.zIndex = index;
  });
  
  updateLayerList();
}

function renameLayer(id, newName) {
  const layer = layers.find(l => l.id === id);
  if (layer && newName.trim()) {
    layer.name = newName.trim();
    updateLayerList();
    console.log('[レイヤー名変更]', { id, newName: layer.name });
  }
}

function updateLayerList() {
  const layerList = document.getElementById('layerList');
  if (!layerList) return;
  
  layerList.innerHTML = '';
  
  [...layers].reverse().forEach((layer, displayIndex) => {
    const actualIndex = layers.length - 1 - displayIndex;
    const item = document.createElement('div');
    item.className = 'layer-item' + (layer.id === activeLayerId ? ' active' : '');
    item.draggable = true;
    item.dataset.layerId = layer.id;
    item.dataset.index = actualIndex;
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = layer.name;
    nameSpan.className = 'layer-name';
    nameSpan.title = 'ダブルクリックで編集';
    
    // ダブルクリックで編集
    nameSpan.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const newName = prompt('レイヤー名を入力', layer.name);
      if (newName !== null) {
        renameLayer(layer.id, newName);
      }
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteLayer(layer.id);
    });
    
    item.appendChild(nameSpan);
    item.appendChild(deleteBtn);
    
    item.addEventListener('click', () => {
      setActiveLayer(layer.id);
    });
    
    // ドラッグ開始
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', actualIndex);
      item.classList.add('dragging');
    });
    
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
    });
    
    // ドラッグオーバー
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    
    // ドロップ
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
      const toIndex = actualIndex;
      
      if (fromIndex !== toIndex) {
        moveLayer(fromIndex, toIndex);
      }
    });
    
    layerList.appendChild(item);
  });
}

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
    picker.disabled = false;
  }
  console.log('[ペン選択]', { tool: currentTool, color: currentColor, size: currentSize });
}

function switchToEraser() {
  if (currentTool === 'pen') {
    savedPenColor = currentColor;
    savedPenSize = currentSize;
  }
  currentTool = 'eraser';
  currentSize = savedEraserSize;
  const pen = penBtn || global.penBtn;
  const eraser = eraserBtn || global.eraserBtn;
  const picker = colorPicker || global.colorPicker;
  if (pen && eraser) {
    eraser.classList.add('active');
    pen.classList.remove('active');
  }
  if (picker) {
    picker.disabled = true;
  }
  console.log('[消しゴム選択]', { tool: currentTool, size: currentSize, savedEraserSize });
}

// テスト用エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    switchToPen, 
    switchToEraser,
    createLayer,
    deleteLayer,
    setActiveLayer,
    getActiveLayer,
    renameLayer
  };
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
    const layer = layers.find(l => l.id === data.layerId) || getActiveLayer();
    
    if (data.type === 'clear' && layer) {
      layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    } else if (layer) {
      const savedTool = currentTool;
      currentTool = data.tool || 'pen';
      drawLine(layer.ctx, data.x1, data.y1, data.x2, data.y2, data.color, data.size);
      currentTool = savedTool;
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

// パン機能
function startPan(e) {
  if (e.button === 2) { // 右クリック
    isPanning = true;
    panStartX = e.clientX - offsetX;
    panStartY = e.clientY - offsetY;
    canvasContainer.style.cursor = 'grabbing';
    e.preventDefault();
  }
}

function pan(e) {
  if (!isPanning) return;
  
  offsetX = e.clientX - panStartX;
  offsetY = e.clientY - panStartY;
  
  updateCanvasPosition();
}

function stopPan() {
  if (isPanning) {
    isPanning = false;
    canvasContainer.style.cursor = 'crosshair';
  }
}

function zoom(e) {
  e.preventDefault();
  
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * delta));
  
  if (newScale !== scale) {
    const rect = canvasContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // キャンバス上のマウス位置（スケール前）
    const canvasX = (mouseX - offsetX) / scale;
    const canvasY = (mouseY - offsetY) / scale;
    
    // 新しいスケールで同じ位置にマウスが来るようにオフセットを調整
    offsetX = mouseX - canvasX * newScale;
    offsetY = mouseY - canvasY * newScale;
    
    scale = newScale;
    updateCanvasPosition();
    console.log('[ズーム]', { scale: scale.toFixed(2) });
  }
}

function updateCanvasPosition() {
  layers.forEach(layer => {
    layer.canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    layer.canvas.style.transformOrigin = '0 0';
  });
}

// 描画機能
function startDrawing(e) {
  if (e.button === 2) return; // 右クリックは無視
  isDrawing = true;
  const containerRect = canvasContainer.getBoundingClientRect();
  lastX = (e.clientX - containerRect.left - offsetX) / scale;
  lastY = (e.clientY - containerRect.top - offsetY) / scale;
}

function draw(e) {
  if (!isDrawing || isPanning) return;
  
  const containerRect = canvasContainer.getBoundingClientRect();
  const x = (e.clientX - containerRect.left - offsetX) / scale;
  const y = (e.clientY - containerRect.top - offsetY) / scale;
  const layer = getActiveLayer();
  
  if (layer) {
    drawLine(layer.ctx, lastX, lastY, x, y, currentColor, currentSize);
    
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify({
        x1: lastX, y1: lastY, x2: x, y2: y,
        color: currentColor, size: currentSize,
        tool: currentTool,
        layerId: activeLayerId
      }));
    }
  }
  
  [lastX, lastY] = [x, y];
}

function stopDrawing() {
  isDrawing = false;
}

function drawLine(ctx, x1, y1, x2, y2, color, size) {
  if (currentTool === 'eraser') {
    // 消しゴムモード：透明にする
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    // ペンモード：通常描画
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
  }
  
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  
  // リセット
  ctx.globalCompositeOperation = 'source-over';
}



// 初期化
document.addEventListener('DOMContentLoaded', () => {
  canvasContainer = document.getElementById('canvasContainer');
  colorPicker = document.getElementById('colorPicker');
  sizePicker = document.getElementById('sizePicker');
  const sizeInput = document.getElementById('sizeInput');
  eraserSizePicker = document.getElementById('eraserSizePicker');
  const eraserSizeInput = document.getElementById('eraserSizeInput');
  clearBtn = document.getElementById('clearBtn');
  penBtn = document.getElementById('penBtn');
  eraserBtn = document.getElementById('eraserBtn');
  wsStatus = document.getElementById('wsStatus');
  rtcStatus = document.getElementById('rtcStatus');
  
  // 初期レイヤー作成
  const bgLayer = createLayer('背景');
  // 背景を白で塗りつぶす
  bgLayer.ctx.fillStyle = '#FFFFFF';
  bgLayer.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // レイヤー1を作成して選択
  const layer1 = createLayer('レイヤー 1');
  setActiveLayer(layer1.id);
  
  // 描画イベント
  canvasContainer.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      startPan(e);
    } else {
      startDrawing(e);
    }
  });
  
  // キャンバス外でも描画を継続するためdocumentにイベントを追加
  document.addEventListener('mousemove', (e) => {
    if (isPanning) {
      pan(e);
    } else if (isDrawing) {
      draw(e);
    }
  });
  
  document.addEventListener('mouseup', () => {
    stopDrawing();
    stopPan();
  });
  
  canvasContainer.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // 右クリックメニューを無効化
  });
  canvasContainer.addEventListener('wheel', zoom, { passive: false });
  
  // レイヤー追加ボタン
  document.getElementById('addLayerBtn').addEventListener('click', () => {
    const layer = createLayer();
    setActiveLayer(layer.id);
  });
  
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
  
  // ペンサイズの同期
  sizePicker.addEventListener('input', (e) => {
    if (currentTool === 'pen') {
      currentSize = parseInt(e.target.value);
      savedPenSize = parseInt(e.target.value);
      sizeInput.value = e.target.value;
    }
  });
  
  sizeInput.addEventListener('input', (e) => {
    if (currentTool === 'pen') {
      const value = Math.max(1, Math.min(400, parseInt(e.target.value) || 1));
      currentSize = value;
      savedPenSize = value;
      sizePicker.value = value;
    }
  });
  
  // 消しゴムサイズの同期
  eraserSizePicker.addEventListener('input', (e) => {
    if (currentTool === 'eraser') {
      currentSize = parseInt(e.target.value);
      savedEraserSize = parseInt(e.target.value);
      eraserSizeInput.value = e.target.value;
    }
  });
  
  eraserSizeInput.addEventListener('input', (e) => {
    if (currentTool === 'eraser') {
      const value = Math.max(5, Math.min(800, parseInt(e.target.value) || 5));
      currentSize = value;
      savedEraserSize = value;
      eraserSizePicker.value = value;
    }
  });
  
  // ホイールでサイズ変更（Ctrl+ホイール）
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey && !isPanning && !isDrawing) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      
      if (currentTool === 'pen') {
        const newSize = Math.max(1, Math.min(400, currentSize + delta));
        currentSize = newSize;
        savedPenSize = newSize;
        sizePicker.value = newSize;
        sizeInput.value = newSize;
      } else if (currentTool === 'eraser') {
        const newSize = Math.max(5, Math.min(800, currentSize + delta * 5));
        currentSize = newSize;
        savedEraserSize = newSize;
        eraserSizePicker.value = newSize;
        eraserSizeInput.value = newSize;
      }
    }
  }, { passive: false });
  
  clearBtn.addEventListener('click', () => {
    const layer = getActiveLayer();
    if (layer) {
      layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({ type: 'clear', layerId: activeLayerId }));
      }
    }
  });
  
  // グローバル関数を公開
  window.deleteLayer = deleteLayer;
  
  connectWebSocket();
  setTimeout(() => createOffer(), 1000);
});
