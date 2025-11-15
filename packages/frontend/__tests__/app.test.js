/**
 * @jest-environment jsdom
 */

let switchToPen, switchToEraser;

describe('echa25 Drawing App', () => {
  let penBtn, eraserBtn, colorPicker, sizePicker, clearBtn;
  
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="container">
        <div id="toolbar">
          <button id="penBtn" class="tool-btn active">✏️ ペン</button>
          <button id="eraserBtn" class="tool-btn">🧹 消しゴム</button>
          <input type="color" id="colorPicker" value="#000000">
          <input type="range" id="sizePicker" min="1" max="20" value="2">
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
    clearBtn = document.getElementById('clearBtn');
    
    const module = require('../app.js');
    switchToPen = module.switchToPen;
    switchToEraser = module.switchToEraser;
    
    global.penBtn = penBtn;
    global.eraserBtn = eraserBtn;
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

  test('サイズピッカーのデフォルト値が2', () => {
    expect(sizePicker.value).toBe('2');
  });
});
