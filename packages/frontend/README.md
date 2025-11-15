# フロントエンド

echa25のフロントエンドコード

## ローカル開発

開発時はキャッシュを無効化してサーバーを起動（推奨）:

```bash
# Node.js (http-server) - キャッシュ無効化
npx http-server -p 8000 -c-1
```

その他のHTTPサーバー:

```bash
# Python
python3 -m http.server 8000

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
