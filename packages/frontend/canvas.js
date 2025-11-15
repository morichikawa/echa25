// URLパラメータ取得
const params = new URLSearchParams(window.location.search);
const roomId = params.get('roomId');
const nickname = params.get('nickname');

if (!roomId || !nickname) {
  window.location.href = 'menu.html';
}

// セッション管理
let myUserId = null;
let members = [];
let peerConnections = new Map();
let dataChannels = new Map();

// マウスポインター管理
let cursors = new Map();
let myColor = null;
const CURSOR_COLORS = ['#FF1744', '#00E676', '#2979FF', '#FF9100', '#E040FB', '#00E5FF', '#FFEA00', '#FF3D00'];

function getRandomColor() {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
}

// Canvas設定
let canvasContainer, colorPicker, sizePicker, eraserSizePicker, clearBtn, penBtn, eraserBtn, wsStatus, rtcStatus, cursorColorPicker;
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

let lastPinchDistance = 0;
let isPinching = false;
let lastTouchCenter = { x: 0, y: 0 };

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

function toggleLayerVisibility(id) {
  const layer = layers.find(l => l.id === id);
  if (layer) {
    layer.visible = !layer.visible;
    layer.canvas.style.display = layer.visible ? 'block' : 'none';
    updateLayerList();
  }
}

function getActiveLayer() {
  return layers.find(l => l.id === activeLayerId);
}

function moveLayer(fromIndex, toIndex) {
  const [layer] = layers.splice(fromIndex, 1);
  layers.splice(toIndex, 0, layer);
  
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
  }
}

let layerDragState = { isDragging: false, startIndex: null, currentIndex: null };

function updateLayerList() {
  const layerList = document.getElementById('layerList');
  if (!layerList) return;
  
  layerList.innerHTML = '';
  
  [...layers].reverse().forEach((layer, displayIndex) => {
    const actualIndex = layers.length - 1 - displayIndex;
    const item = document.createElement('div');
    item.className = 'layer-item' + (layer.id === activeLayerId ? ' active' : '');
    item.dataset.layerId = layer.id;
    item.dataset.index = actualIndex;
    
    const dragHandle = document.createElement('button');
    dragHandle.textContent = '☰';
    dragHandle.className = 'drag-handle';
    dragHandle.title = 'ドラッグで移動';
    
    const visibilityBtn = document.createElement('button');
    visibilityBtn.textContent = layer.visible ? '👁' : '👁🗨';
    visibilityBtn.className = 'visibility-btn';
    visibilityBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLayerVisibility(layer.id);
    });
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = layer.name;
    nameInput.className = 'layer-name-input';
    
    nameInput.addEventListener('change', (e) => {
      e.stopPropagation();
      renameLayer(layer.id, e.target.value);
    });
    
    nameInput.addEventListener('click', (e) => e.stopPropagation());
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.target.blur();
      e.stopPropagation();
    });
    
    const upBtn = document.createElement('button');
    upBtn.textContent = '▲';
    upBtn.className = 'move-btn';
    upBtn.title = '上に移動';
    upBtn.disabled = actualIndex === layers.length - 1;
    upBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (actualIndex < layers.length - 1) {
        moveLayer(actualIndex, actualIndex + 1);
      }
    });
    
    const downBtn = document.createElement('button');
    downBtn.textContent = '▼';
    downBtn.className = 'move-btn';
    downBtn.title = '下に移動';
    downBtn.disabled = actualIndex === 0;
    downBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (actualIndex > 0) {
        moveLayer(actualIndex, actualIndex - 1);
      }
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '×';
    deleteBtn.className = 'delete-btn';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteLayer(layer.id);
    });
    
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'layer-buttons';
    buttonGroup.appendChild(dragHandle);
    buttonGroup.appendChild(visibilityBtn);
    buttonGroup.appendChild(upBtn);
    buttonGroup.appendChild(downBtn);
    buttonGroup.appendChild(deleteBtn);
    
    item.appendChild(nameInput);
    item.appendChild(buttonGroup);
    
    item.addEventListener('click', (e) => {
      if (e.target !== dragHandle) setActiveLayer(layer.id);
    });
    
    dragHandle.addEventListener('pointerdown', (e) => {
      layerDragState = { isDragging: true, startIndex: actualIndex, currentIndex: actualIndex };
      item.classList.add('dragging');
      e.stopPropagation();
      e.preventDefault();
    });
    
    item.addEventListener('pointerenter', (e) => {
      if (layerDragState.isDragging) {
        const draggingItem = layerList.querySelector('.dragging');
        if (draggingItem && draggingItem !== item) {
          const rect = item.getBoundingClientRect();
          const threshold = rect.height * 0.3;
          const relativeY = e.clientY - rect.top;
          
          if (relativeY < threshold) {
            item.parentNode.insertBefore(draggingItem, item);
          } else if (relativeY > rect.height - threshold) {
            item.parentNode.insertBefore(draggingItem, item.nextSibling);
          }
          layerDragState.currentIndex = actualIndex;
        }
      }
    });
    
    item.addEventListener('pointermove', (e) => {
      if (layerDragState.isDragging) {
        const draggingItem = layerList.querySelector('.dragging');
        if (draggingItem && draggingItem !== item) {
          const rect = item.getBoundingClientRect();
          const threshold = rect.height * 0.3;
          const relativeY = e.clientY - rect.top;
          
          if (relativeY < threshold) {
            item.parentNode.insertBefore(draggingItem, item);
          } else if (relativeY > rect.height - threshold) {
            item.parentNode.insertBefore(draggingItem, item.nextSibling);
          }
        }
      }
    });
    
    dragHandle.addEventListener('pointermove', (e) => {
      if (layerDragState.isDragging) {
        e.stopPropagation();
        e.preventDefault();
      }
    });
    
    dragHandle.addEventListener('pointerup', (e) => {
      if (layerDragState.isDragging) {
        e.stopPropagation();
        e.preventDefault();
      }
    });
    
    layerList.appendChild(item);
  });
}

document.addEventListener('pointerup', () => {
  if (layerDragState.isDragging) {
    const layerList = document.getElementById('layerList');
    if (layerList) {
      const items = Array.from(layerList.querySelectorAll('.layer-item'));
      const draggingItem = layerList.querySelector('.dragging');
      if (draggingItem) {
        const newIndex = items.indexOf(draggingItem);
        const actualNewIndex = layers.length - 1 - newIndex;
        if (layerDragState.startIndex !== actualNewIndex) {
          moveLayer(layerDragState.startIndex, actualNewIndex);
        }
        draggingItem.classList.remove('dragging');
      }
    }
    layerDragState = { isDragging: false, startIndex: null, currentIndex: null };
  }
});

document.addEventListener('pointercancel', () => {
  if (layerDragState.isDragging) {
    const layerList = document.getElementById('layerList');
    if (layerList) {
      layerList.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    }
    layerDragState = { isDragging: false, startIndex: null, currentIndex: null };
  }
});

// メンバーリスト更新
function updateMembersList() {
  const membersList = document.getElementById('membersList');
  if (!membersList) return;
  
  membersList.innerHTML = '';
  
  members.forEach(member => {
    const item = document.createElement('div');
    item.className = 'member-item' + (member.isHost ? ' host' : '');
    item.textContent = (member.isHost ? '👑 ' : '') + member.nickname;
    membersList.appendChild(item);
  });
}

// ツール切り替え
function switchToPen() {
  if (currentTool === 'eraser') savedEraserSize = currentSize;
  currentTool = 'pen';
  currentColor = savedPenColor;
  currentSize = savedPenSize;
  penBtn.classList.add('active');
  eraserBtn.classList.remove('active');
  colorPicker.value = savedPenColor;
  colorPicker.disabled = false;
}

function switchToEraser() {
  if (currentTool === 'pen') {
    savedPenColor = currentColor;
    savedPenSize = currentSize;
  }
  currentTool = 'eraser';
  currentSize = savedEraserSize;
  eraserBtn.classList.add('active');
  penBtn.classList.remove('active');
  colorPicker.disabled = true;
}

// WebSocket接続
const WS_URL = window.location.search.includes('local') 
  ? 'ws://localhost:3001'
  : 'WEBSOCKET_URL_PLACEHOLDER';
let ws = null;

function connectWebSocket() {
  ws = new WebSocket(WS_URL);
  
  ws.onopen = () => {
    wsStatus.textContent = '接続済み';
    wsStatus.style.color = 'green';
    
    ws.send(JSON.stringify({
      action: 'join',
      roomId,
      nickname
    }));
  };
  
  ws.onclose = () => {
    wsStatus.textContent = '切断';
    wsStatus.style.color = 'red';
  };
  
  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'joined') {
      myUserId = data.userId;
      members = data.members;
      updateMembersList();
      
      members.filter(m => m.userId !== myUserId).forEach(m => {
        createPeerConnection(m.userId);
      });
    } else if (data.type === 'user-joined') {
      members = data.members;
      updateMembersList();
      
      if (data.userId !== myUserId) {
        createPeerConnection(data.userId);
      }
    } else if (data.type === 'user-left') {
      members = members.filter(m => m.userId !== data.userId);
      if (data.newHost) {
        const host = members.find(m => m.userId === data.newHost);
        if (host) host.isHost = true;
      }
      updateMembersList();
      
      const pc = peerConnections.get(data.userId);
      if (pc) {
        pc.close();
        peerConnections.delete(data.userId);
      }
      dataChannels.delete(data.userId);
      removeRemoteCursor(data.userId);
    } else if (data.type === 'signal') {
      handleSignal(data.fromUserId, data.data);
    }
  };
}

// WebRTC
const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

function createPeerConnection(userId) {
  if (peerConnections.has(userId)) return;
  
  const pc = new RTCPeerConnection(config);
  peerConnections.set(userId, pc);
  
  pc.onicecandidate = (event) => {
    if (event.candidate && ws) {
      ws.send(JSON.stringify({
        action: 'signal',
        targetUserId: userId,
        data: { type: 'ice-candidate', candidate: event.candidate }
      }));
    }
  };
  
  pc.ondatachannel = (event) => {
    dataChannels.set(userId, event.channel);
    setupDataChannel(event.channel, userId);
  };
  
  pc.onconnectionstatechange = () => {
    updateRTCStatus();
  };
  
  if (myUserId < userId) {
    const dc = pc.createDataChannel('draw');
    dataChannels.set(userId, dc);
    setupDataChannel(dc, userId);
    
    pc.createOffer().then(offer => {
      return pc.setLocalDescription(offer);
    }).then(() => {
      ws.send(JSON.stringify({
        action: 'signal',
        targetUserId: userId,
        data: { type: 'offer', offer: pc.localDescription }
      }));
    });
  }
}

function setupDataChannel(dc, userId) {
  dc.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'cursor') {
      updateRemoteCursor(userId, data.x, data.y, data.color);
      return;
    }
    
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

async function handleSignal(fromUserId, data) {
  let pc = peerConnections.get(fromUserId);
  
  if (data.type === 'offer') {
    if (!pc) {
      pc = new RTCPeerConnection(config);
      peerConnections.set(fromUserId, pc);
      
      pc.onicecandidate = (event) => {
        if (event.candidate && ws) {
          ws.send(JSON.stringify({
            action: 'signal',
            targetUserId: fromUserId,
            data: { type: 'ice-candidate', candidate: event.candidate }
          }));
        }
      };
      
      pc.ondatachannel = (event) => {
        dataChannels.set(fromUserId, event.channel);
        setupDataChannel(event.channel, fromUserId);
      };
      
      pc.onconnectionstatechange = () => updateRTCStatus();
    }
    
    await pc.setRemoteDescription(data.offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    ws.send(JSON.stringify({
      action: 'signal',
      targetUserId: fromUserId,
      data: { type: 'answer', answer: pc.localDescription }
    }));
  } else if (data.type === 'answer' && pc) {
    await pc.setRemoteDescription(data.answer);
  } else if (data.type === 'ice-candidate' && pc) {
    await pc.addIceCandidate(data.candidate);
  }
}

function updateRTCStatus() {
  const states = Array.from(peerConnections.values()).map(pc => pc.connectionState);
  const connected = states.filter(s => s === 'connected').length;
  rtcStatus.textContent = `${connected}/${states.length} 接続`;
  rtcStatus.style.color = connected > 0 ? 'green' : 'orange';
}

// パン・ズーム
function startPan(e) {
  if (e.button === 2) {
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
    const canvasX = (mouseX - offsetX) / scale;
    const canvasY = (mouseY - offsetY) / scale;
    offsetX = mouseX - canvasX * newScale;
    offsetY = mouseY - canvasY * newScale;
    scale = newScale;
    updateCanvasPosition();
  }
}

function updateCanvasPosition() {
  layers.forEach(layer => {
    layer.canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    layer.canvas.style.transformOrigin = '0 0';
  });
}

// 描画
function getPointerPosition(e) {
  const containerRect = canvasContainer.getBoundingClientRect();
  return {
    x: (e.clientX - containerRect.left - offsetX) / scale,
    y: (e.clientY - containerRect.top - offsetY) / scale
  };
}

function startDrawing(e) {
  if (e.button === 2) return;
  if (isPinching) return;
  isDrawing = true;
  const pos = getPointerPosition(e);
  lastX = pos.x;
  lastY = pos.y;
  if (e.cancelable) e.preventDefault();
}

function handleTouchStart(e) {
  if (e.touches.length === 2) {
    isPinching = true;
    isDrawing = false;
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    lastPinchDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    lastTouchCenter = {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
    e.preventDefault();
  } else if (e.touches.length === 1 && !isPinching) {
    const touch = e.touches[0];
    const rect = canvasContainer.getBoundingClientRect();
    const x = (touch.clientX - rect.left - offsetX) / scale;
    const y = (touch.clientY - rect.top - offsetY) / scale;
    isDrawing = true;
    lastX = x;
    lastY = y;
  }
}

function handleTouchMove(e) {
  if (e.touches.length === 2) {
    if (!isPinching) {
      isPinching = true;
      isDrawing = false;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      lastPinchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      lastTouchCenter = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
    } else {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      
      if (lastPinchDistance > 0) {
        const delta = distance / lastPinchDistance;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * delta));
        
        if (newScale !== scale) {
          const rect = canvasContainer.getBoundingClientRect();
          const relCenterX = centerX - rect.left;
          const relCenterY = centerY - rect.top;
          const canvasX = (relCenterX - offsetX) / scale;
          const canvasY = (relCenterY - offsetY) / scale;
          offsetX = relCenterX - canvasX * newScale;
          offsetY = relCenterY - canvasY * newScale;
          scale = newScale;
          updateCanvasPosition();
        }
      }
      
      offsetX += centerX - lastTouchCenter.x;
      offsetY += centerY - lastTouchCenter.y;
      updateCanvasPosition();
      
      lastPinchDistance = distance;
      lastTouchCenter = { x: centerX, y: centerY };
    }
    e.preventDefault();
  } else if (e.touches.length === 1 && isDrawing && !isPinching) {
    const touch = e.touches[0];
    const rect = canvasContainer.getBoundingClientRect();
    const x = (touch.clientX - rect.left - offsetX) / scale;
    const y = (touch.clientY - rect.top - offsetY) / scale;
    const layer = getActiveLayer();
    
    if (layer) {
      drawLine(layer.ctx, lastX, lastY, x, y, currentColor, currentSize);
      
      const message = JSON.stringify({
        x1: lastX, y1: lastY, x2: x, y2: y,
        color: currentColor, size: currentSize,
        tool: currentTool,
        layerId: activeLayerId
      });
      
      dataChannels.forEach(dc => {
        if (dc.readyState === 'open') {
          dc.send(message);
        }
      });
    }
    
    lastX = x;
    lastY = y;
    e.preventDefault();
  }
}

function handleTouchEnd(e) {
  if (e.touches.length < 2) {
    isPinching = false;
    lastPinchDistance = 0;
  }
  if (e.touches.length === 0) {
    isDrawing = false;
  }
}

function draw(e) {
  if (!isDrawing || isPanning) return;
  
  const pos = getPointerPosition(e);
  const layer = getActiveLayer();
  
  if (layer) {
    drawLine(layer.ctx, lastX, lastY, pos.x, pos.y, currentColor, currentSize);
    
    const message = JSON.stringify({
      x1: lastX, y1: lastY, x2: pos.x, y2: pos.y,
      color: currentColor, size: currentSize,
      tool: currentTool,
      layerId: activeLayerId
    });
    
    dataChannels.forEach(dc => {
      if (dc.readyState === 'open') {
        dc.send(message);
      }
    });
  }
  
  lastX = pos.x;
  lastY = pos.y;
  sendCursorPosition(e);
  e.preventDefault();
}

function sendCursorPosition(e) {
  if (isPanning || !canvasContainer) return;
  
  const pos = getPointerPosition(e);
  
  const message = JSON.stringify({
    type: 'cursor',
    x: pos.x,
    y: pos.y,
    color: myColor
  });
  
  dataChannels.forEach(dc => {
    if (dc.readyState === 'open') {
      dc.send(message);
    }
  });
}

function updateRemoteCursor(userId, x, y, color) {
  let cursor = cursors.get(userId);
  
  if (!cursor) {
    const member = members.find(m => m.userId === userId);
    const nickname = member ? member.nickname : 'User';
    
    cursor = document.createElement('div');
    cursor.className = 'remote-cursor';
    cursor.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
        <path d="M0,0 L0,16 L5,11 L8,18 L10,17 L7,10 L13,10 Z" fill="${color}" stroke="white" stroke-width="0.5"/>
      </svg>
      <span class="cursor-nickname" style="color: ${color};">${nickname}</span>
    `;
    canvasContainer.appendChild(cursor);
    cursors.set(userId, cursor);
  }
  
  const screenX = x * scale + offsetX;
  const screenY = y * scale + offsetY;
  cursor.style.left = `${screenX}px`;
  cursor.style.top = `${screenY}px`;
}

function removeRemoteCursor(userId) {
  const cursor = cursors.get(userId);
  if (cursor) {
    cursor.remove();
    cursors.delete(userId);
  }
}

function stopDrawing() {
  isDrawing = false;
}

function drawLine(ctx, x1, y1, x2, y2, color, size) {
  if (currentTool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
  }
  
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
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
  cursorColorPicker = document.getElementById('cursorColorPicker');
  
  const bgLayer = createLayer('背景');
  bgLayer.ctx.fillStyle = '#FFFFFF';
  bgLayer.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  const layer1 = createLayer('レイヤー 1');
  setActiveLayer(layer1.id);
  
  canvasContainer.addEventListener('pointerdown', (e) => {
    if (e.button === 2) startPan(e);
    else startDrawing(e);
  });
  
  document.addEventListener('pointermove', (e) => {
    if (isPanning) pan(e);
    else if (isDrawing) draw(e);
    else sendCursorPosition(e);
  });
  
  document.addEventListener('pointerup', () => {
    stopDrawing();
    stopPan();
  });
  
  document.addEventListener('pointercancel', () => {
    stopDrawing();
    stopPan();
  });
  
  canvasContainer.addEventListener('contextmenu', (e) => e.preventDefault());
  canvasContainer.addEventListener('wheel', zoom, { passive: false });
  canvasContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvasContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvasContainer.addEventListener('touchend', handleTouchEnd);
  canvasContainer.addEventListener('touchcancel', handleTouchEnd);
  
  document.getElementById('addLayerBtn').addEventListener('click', () => {
    const layer = createLayer();
    setActiveLayer(layer.id);
  });
  
  penBtn.addEventListener('click', switchToPen);
  eraserBtn.addEventListener('click', switchToEraser);
  
  const updateColor = (e) => {
    if (currentTool === 'pen') {
      currentColor = e.target.value;
      savedPenColor = e.target.value;
    }
  };
  
  colorPicker.addEventListener('input', updateColor);
  colorPicker.addEventListener('change', updateColor);
  
  sizePicker.addEventListener('input', (e) => {
    savedPenSize = parseInt(e.target.value);
    if (currentTool === 'pen') currentSize = parseInt(e.target.value);
    sizeInput.value = e.target.value;
  });
  
  sizeInput.addEventListener('input', (e) => {
    const value = Math.max(1, Math.min(400, parseInt(e.target.value) || 1));
    savedPenSize = value;
    if (currentTool === 'pen') currentSize = value;
    sizePicker.value = value;
  });
  
  eraserSizePicker.addEventListener('input', (e) => {
    savedEraserSize = parseInt(e.target.value);
    if (currentTool === 'eraser') currentSize = parseInt(e.target.value);
    eraserSizeInput.value = e.target.value;
  });
  
  eraserSizeInput.addEventListener('input', (e) => {
    const value = Math.max(5, Math.min(800, parseInt(e.target.value) || 5));
    savedEraserSize = value;
    if (currentTool === 'eraser') currentSize = value;
    eraserSizePicker.value = value;
  });
  
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
      const message = JSON.stringify({ type: 'clear', layerId: activeLayerId });
      dataChannels.forEach(dc => {
        if (dc.readyState === 'open') dc.send(message);
      });
    }
  });
  
  document.getElementById('leaveBtn').addEventListener('click', () => {
    if (confirm('部屋を退出しますか？')) {
      window.location.href = 'menu.html';
    }
  });
  
  myColor = getRandomColor();
  cursorColorPicker.value = myColor;
  
  cursorColorPicker.addEventListener('input', (e) => {
    myColor = e.target.value;
  });
  
  connectWebSocket();
});
