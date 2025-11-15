# フロントエンド

echa25のフロントエンドコード

## ローカル開発

任意のHTTPサーバーで起動:

```bash
# Python
python3 -m http.server 8000

# Node.js (http-server)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

ブラウザで http://localhost:8000 を開く

## ファイル構成

- `index.html` - メインHTML
- `style.css` - スタイル
- `app.js` - WebRTC + Canvas描画ロジック

## 設定

`app.js` の `WS_URL` をバックエンドのWebSocket URLに変更:

```javascript
const WS_URL = 'wss://your-api-gateway-url';
```
