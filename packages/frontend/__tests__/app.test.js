/**
 * @jest-environment jsdom
 */

let switchToPen, switchToEraser;

describe('echa25 Drawing App', () => {
  let penBtn, eraserBtn, colorPicker, sizePicker, eraserSizePicker, clearBtn;
  let switchToPen, switchToEraser;
  
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="container">
        <div id="toolbar">
          <button id="penBtn" class="tool-btn active">✏️ ペン</button>
          <button id="eraserBtn" class="tool-btn">🧹 消しゴム</button>
          <input type="color" id="colorPicker" value="#000000">
          <input type="range" id="sizePicker" min="1" max="20" value="2">
          <input type="range" id="eraserSizePicker" min="5" max="50" value="20">
          <button id="clearBtn">クリア</button>
        </div>
        <canvas id="canvas" width="1000" height="600"></canvas>
        <div id="status">
          <span id="wsStatus">未接続</span>
          <span id="rtcStatus">未接続</span>
        </div>
      </div>
    `;
    
    penBtn = document.getElementById('penBtn');
    eraserBtn = document.getElementById('eraserBtn');
    colorPicker = document.getElementById('colorPicker');
    sizePicker = document.getElementById('sizePicker');
    eraserSizePicker = document.getElementById('eraserSizePicker');
    clearBtn = document.getElementById('clearBtn');
    
    const module = require('../app.js');
    switchToPen = module.switchToPen;
    switchToEraser = module.switchToEraser;
    
    global.penBtn = penBtn;
    global.eraserBtn = eraserBtn;
    global.colorPicker = colorPicker;
  });

  test('ペンボタンがデフォルトでアクティブ', () => {
    expect(penBtn.classList.contains('active')).toBe(true);
    expect(eraserBtn.classList.contains('active')).toBe(false);
  });

  test('消しゴムボタンをクリックするとアクティブになる', () => {
    switchToEraser();
    expect(eraserBtn.classList.contains('active')).toBe(true);
    expect(penBtn.classList.contains('active')).toBe(false);
  });

  test('消しゴムからペンに切り替えられる', () => {
    switchToEraser();
    expect(eraserBtn.classList.contains('active')).toBe(true);
    
    switchToPen();
    expect(penBtn.classList.contains('active')).toBe(true);
    expect(eraserBtn.classList.contains('active')).toBe(false);
  });



  test('カラーピッカーのデフォルト値が黒', () => {
    expect(colorPicker.value).toBe('#000000');
  });

  test('ペンサイズピッカーのデフォルト値が2', () => {
    expect(sizePicker.value).toBe('2');
  });

  test('消しゴムサイズピッカーのデフォルト値が20', () => {
    expect(eraserSizePicker.value).toBe('20');
  });

  test('ペンサイズの範囲が1-20', () => {
    expect(sizePicker.min).toBe('1');
    expect(sizePicker.max).toBe('20');
  });

  test('消しゴムサイズの範囲が5-50', () => {
    expect(eraserSizePicker.min).toBe('5');
    expect(eraserSizePicker.max).toBe('50');
  });

  test('ペンと消しゴムを交互に切り替えられる', () => {
    switchToEraser();
    expect(eraserBtn.classList.contains('active')).toBe(true);
    expect(penBtn.classList.contains('active')).toBe(false);
    
    switchToPen();
    expect(penBtn.classList.contains('active')).toBe(true);
    expect(eraserBtn.classList.contains('active')).toBe(false);
    
    switchToEraser();
    expect(eraserBtn.classList.contains('active')).toBe(true);
    expect(penBtn.classList.contains('active')).toBe(false);
  });

  test('ペンと消しゴムの状態が保持される', () => {
    // 消しゴムに切り替え
    switchToEraser();
    expect(eraserBtn.classList.contains('active')).toBe(true);
    
    // ペンに戻す
    switchToPen();
    expect(penBtn.classList.contains('active')).toBe(true);
  });

  test('クリアボタンが存在する', () => {
    expect(clearBtn).toBeDefined();
    expect(clearBtn.textContent).toBe('クリア');
  });
});
