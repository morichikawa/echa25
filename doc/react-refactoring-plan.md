# React + Atomic Design リファクタリング計画

## 概要

既存のVanilla JSアプリケーションをReact + Atomic Designで再構築する。

## 技術スタック

- **React 18**
- **Vite** (ビルドツール)
- **TypeScript** (型安全性)
- **Material-UI (MUI)** (UIコンポーネント)

## ディレクトリ構造

```
packages/frontend/
├── src/
│   ├── components/
│   │   ├── atoms/          # 最小単位のコンポーネント
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── ColorPicker/
│   │   │   └── Slider/
│   │   ├── molecules/      # 複数のatomsを組み合わせたコンポーネント
│   │   │   ├── ToolButton/
│   │   │   ├── LayerItem/
│   │   │   ├── MemberItem/
│   │   │   └── RemoteCursor/
│   │   ├── organisms/      # 複数のmoleculesを組み合わせたコンポーネント
│   │   │   ├── Toolbar/
│   │   │   ├── LayerPanel/
│   │   │   ├── MemberPanel/
│   │   │   └── Canvas/
│   │   └── templates/      # ページレイアウト
│   │       ├── MenuLayout/
│   │       └── CanvasLayout/
│   ├── pages/              # ページコンポーネント
│   │   ├── MenuPage/
│   │   └── CanvasPage/
│   ├── hooks/              # カスタムフック
│   │   ├── useWebSocket.ts
│   │   ├── useWebRTC.ts
│   │   ├── useCanvas.ts
│   │   ├── useLayer.ts
│   │   └── useDraw.ts
│   ├── contexts/           # React Context
│   │   ├── SessionContext.tsx
│   │   ├── LayerContext.tsx
│   │   └── WebRTCContext.tsx
│   ├── utils/              # ユーティリティ関数
│   │   ├── constants.ts
│   │   ├── drawingEngine.ts
│   │   └── helpers.ts
│   ├── types/              # 型定義
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── public/
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 実装手順

### Phase 1: セットアップ (30分)

1. **Vite + React + TypeScript プロジェクト初期化**
   ```bash
   cd packages/frontend
   npm create vite@latest . -- --template react-ts
   npm install
   ```

2. **必要な依存関係追加**
   ```bash
   npm install react-router-dom
   ```

3. **既存ファイルのバックアップ**
   ```bash
   mkdir ../frontend-backup
   cp -r html css js ../frontend-backup/
   ```

### Phase 2: 基礎構造 (1時間)

4. **型定義作成** (`src/types/index.ts`)
   - Layer, Member, DrawingData, WebSocketMessage等

5. **定数・ユーティリティ移行** (`src/utils/`)
   - constants.ts
   - helpers.ts
   - drawingEngine.ts

6. **Context作成** (`src/contexts/`)
   - SessionContext (roomId, nickname, userId, color)
   - LayerContext (layers, activeLayer, CRUD操作)
   - WebRTCContext (connections, dataChannels, broadcast)

### Phase 3: Atoms (スキップ)

7. **MUI使用** - カスタムAtomsは作成せず、MUIコンポーネントを直接使用

### Phase 4: Molecules (1.5時間)

8. **複合コンポーネント作成**
   - `ToolButton/` - ツール切り替えボタン
   - `LayerItem/` - レイヤーアイテム（ドラッグ可能）
   - `MemberItem/` - メンバー表示
   - `RemoteCursor/` - リモートカーソル

### Phase 5: Organisms (2時間)

9. **大規模コンポーネント作成**
   - `Toolbar/` - ツールバー全体
   - `LayerPanel/` - レイヤーパネル
   - `MemberPanel/` - メンバーパネル
   - `Canvas/` - キャンバス本体

### Phase 6: カスタムフック (2時間)

10. **ビジネスロジック分離**
    - `useWebSocket.ts` - WebSocket接続管理
    - `useWebRTC.ts` - WebRTC接続管理
    - `useCanvas.ts` - キャンバス操作
    - `useLayer.ts` - レイヤー管理
    - `useDraw.ts` - 描画ロジック

### Phase 7: Pages & Templates (1時間)

11. **ページコンポーネント作成**
    - `MenuPage/` - 入室ページ
    - `CanvasPage/` - 描画ページ

12. **ルーティング設定** (`App.tsx`)
    ```tsx
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/canvas" element={<CanvasPage />} />
      </Routes>
    </BrowserRouter>
    ```

### Phase 8: CDK統合 (30分)

13. **ビルド設定更新**
    - `vite.config.ts` でWebSocket URL置換設定
    - CDKスタックでViteビルド出力をデプロイ

14. **環境変数設定**
    ```typescript
    // vite.config.ts
    export default defineConfig({
      define: {
        'import.meta.env.VITE_WS_URL': JSON.stringify(process.env.WS_URL || 'WEBSOCKET_URL_PLACEHOLDER')
      }
    })
    ```

### Phase 9: テスト & デバッグ (1時間)

15. **動作確認**
    - ローカル開発サーバーで動作確認
    - 2人での接続テスト
    - 描画同期テスト
    - レイヤー操作テスト

16. **デプロイ & 本番確認**
    ```bash
    npm run deploy
    ```

## 実装優先順位

### 最優先 (MVP)
1. メニューページ (入室機能)
2. キャンバス描画
3. WebSocket接続
4. WebRTC P2P通信
5. 基本的な描画同期

### 次優先
6. レイヤー管理
7. ツール切り替え (ペン/消しゴム)
8. カーソル共有
9. メンバー表示

### 後回し
10. タッチ操作
11. ピンチズーム
12. ドラッグ&ドロップ

## コンポーネント設計原則

### Atoms
- 単一責任
- propsのみで動作
- 状態を持たない
- 再利用可能

### Molecules
- 複数のAtomsを組み合わせ
- 最小限の状態管理
- 特定の機能を持つ

### Organisms
- 複雑なビジネスロジック
- Contextを使用可能
- カスタムフックを活用

### Pages
- ルーティング対応
- データフェッチング
- 全体的な状態管理

## 注意点

1. **段階的移行**: 一度に全て書き換えない
2. **型安全性**: TypeScriptを最大限活用
3. **パフォーマンス**: useMemo, useCallback適切に使用
4. **テスト**: 各フェーズで動作確認
5. **バックアップ**: 既存コードは削除せず保存

## 完了条件

- [ ] メニューページで部屋に入室できる
- [ ] キャンバスで描画できる
- [ ] 2人で同時描画が同期される
- [ ] レイヤー追加・削除・切り替えができる
- [ ] ツール切り替えができる
- [ ] メンバーリストが表示される
- [ ] カーソル位置が共有される
- [ ] デプロイが成功する

## 推定時間

合計: **約10時間**

- セットアップ: 30分
- 基礎構造: 1時間
- Atoms: 1時間
- Molecules: 1.5時間
- Organisms: 2時間
- カスタムフック: 2時間
- Pages: 1時間
- CDK統合: 30分
- テスト: 1時間
