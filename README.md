# echa25

リアルタイム共同お絵描きアプリケーション

## 概要

echa25は、複数人が同じキャンバスにリアルタイムで絵を描くことができるWebアプリケーションです。お絵描きチャットのような体験を提供します。

### 主な機能
- HTML5 Canvasによる描画（ペン・消しゴム・色・サイズ変更）
- 複数ユーザーによる同時描画
- リアルタイム同期（WebRTC P2P通信）
- ホイールズーム・右クリックパン操作
- WebRTC接続状態の可視化
- 参加者リスト表示

### 技術的特徴
- **サーバーレスアーキテクチャ**: AWS CDKで管理
- **WebRTC P2P通信**: 描画データはブラウザ間で直接通信（完全無料）
- **コスト最適化**: 開発時のみリソースを起動、非開発時は完全削除
- **React + TypeScript**: モダンなフロントエンド開発
- **Material-UI**: UIコンポーネントライブラリ

## 技術スタック

### フロントエンド
- React 18
- TypeScript
- Vite
- Material-UI (MUI)
- HTML5 Canvas
- WebRTC API
- React Router
- S3静的ホスティング

### バックエンド
- AWS Lambda (Node.js 20.x)
- API Gateway (WebSocket API)
- DynamoDB
- AWS CDK (TypeScript)

### 開発ツール
- Node.js 20.x
- TypeScript
- AWS CLI
- Vite

## プロジェクト構造

```
echa25/
├── packages/
│   ├── backend/                    # CDKインフラコード + Lambda関数
│   │   ├── bin/                    # CDKアプリエントリーポイント
│   │   ├── lib/                    # CDKスタック定義
│   │   ├── functions/              # Lambda関数コード
│   │   │   ├── onConnect/          # WebSocket接続
│   │   │   ├── onDisconnect/       # WebSocket切断
│   │   │   ├── onJoin/             # ルーム参加
│   │   │   └── onSignal/           # WebRTCシグナリング
│   │   └── cdk.json
│   └── frontend/                   # Reactフロントエンド
│       ├── src/
│       │   ├── components/         # Reactコンポーネント
│       │   │   ├── molecules/      # 小さなコンポーネント
│       │   │   └── organisms/      # 大きなコンポーネント
│       │   ├── contexts/           # React Context
│       │   ├── hooks/              # カスタムフック
│       │   ├── pages/              # ページコンポーネント
│       │   ├── types/              # TypeScript型定義
│       │   └── utils/              # ユーティリティ関数
│       ├── vite.config.ts
│       └── package.json
├── documents/                      # ドキュメント
├── package.json                    # ルートスクリプト
└── README.md
```

## セットアップ

### 前提条件
- Node.js 20.x
- AWS CLI（認証情報設定済み）
- AWSアカウント

### 初回セットアップ

```bash
# Node.jsバージョンの設定
nvm use

# 依存関係をインストール
npm run install

# AWS認証情報の確認
aws sts get-caller-identity

# 環境設定ファイルを作成
cp packages/backend/.env.example packages/backend/.env
# .envファイルを編集してENV_SUFFIXを設定（例: dev, prod, staging, 個人名など）
```

## 環境管理

AWSリソース名に環境サフィックスを付けて複数環境を分離できます。

```bash
# packages/backend/.env で環境を設定
ENV_SUFFIX=dev    # 開発環境
ENV_SUFFIX=prod   # 本番環境
ENV_SUFFIX=zoe    # 個人環境
```

各環境で以下のリソースが作成されます：
- スタック: `Echa25BackendStack-{ENV_SUFFIX}`
- DynamoDB: `echa25-connections-{ENV_SUFFIX}`, `echa25-rooms-{ENV_SUFFIX}`
- Lambda: `echa25-onConnect-{ENV_SUFFIX}`, etc.
- S3: `echa25-frontend-{ENV_SUFFIX}-{accountId}`

## 使い方

### 開発開始

```bash
# リソースをデプロイ
npm run deploy
```

デプロイ後、以下が作成されます：
- S3バケット（フロントエンド配信用）
- API Gateway WebSocket API（シグナリング用）
- Lambda関数（onConnect, onDisconnect, onJoin, onSignal）
- DynamoDBテーブル（connections, rooms）

デプロイ完了後、コンソールに表示されるURLにアクセスしてください。

### 開発中

```bash
# フロントエンドのみビルド
cd packages/frontend && npm run build

# 変更差分を確認
npm run diff

# CloudFormationテンプレートを生成
npm run synth

# 再デプロイ（フロントエンド + バックエンド）
npm run deploy
```

### 開発終了

```bash
# 全リソースを削除（料金発生を防ぐ）
npm run destroy
```

## アプリケーションの使い方

1. デプロイ後のURLにアクセス
2. ルームIDとニックネームを入力して参加
3. 他のユーザーも同じルームIDで参加
4. WebRTC接続が確立されると、参加者リストに緑の枠が表示される
5. キャンバス上で描画すると、リアルタイムで他のユーザーに同期される

### 操作方法

- **描画**: 左クリック + ドラッグ
- **パン**: 右クリック + ドラッグ
- **ズーム**: マウスホイール
- **ツール切り替え**: ツールバーでペン/消しゴムを選択
- **色変更**: カラーピッカーで色を選択
- **サイズ変更**: スライダーでブラシサイズを調整
- **クリア**: クリアボタンでキャンバスをクリア
- **接続管理**: 参加者リストで接続状態を確認、接続中は「部屋を退出」で部屋から退出可能

## コスト

### 想定コスト
- **ほぼ完全無料**（AWS無料利用枠内）
- Lambda実行: 接続時のみ（月300回程度）
- API Gateway: シグナリングメッセージのみ
- 描画データ通信: **完全無料**（WebRTC P2P）

### コスト削減のポイント
- 開発時のみリソースを起動
- 作業終了時に`npm run destroy`で完全削除
- WebRTC P2Pで描画データを直接通信

## アーキテクチャ

### WebSocket通信（シグナリング）

1. ユーザーがルームに参加
2. API Gateway WebSocket経由でLambda関数を呼び出し
3. DynamoDBに接続情報を保存
4. 既存の参加者に新規参加を通知

### WebRTC P2P通信（描画データ）

1. WebSocketでSDP Offer/Answerを交換
2. ICE Candidateを交換してP2P接続を確立
3. Data Channelで描画データを直接送受信
4. サーバーを経由しないため完全無料

### 主要コンポーネント

#### フロントエンド

- **SessionContext**: ユーザーセッション管理（roomId, nickname, userId, color）
- **WebRTCContext**: WebRTC接続管理（peerConnections, dataChannels, members）
- **useWebSocket**: WebSocket接続とメッセージ処理
- **useWebRTC**: WebRTC接続確立とシグナリング処理
- **Canvas**: HTML5 Canvasによる描画処理
- **Toolbar**: ツール選択UI
- **MemberPanel**: 参加者リストとWebRTC接続状態表示

#### バックエンド

- **onConnect**: WebSocket接続時の処理
- **onDisconnect**: WebSocket切断時の処理、ホスト移譲
- **onJoin**: ルーム参加処理、メンバー情報の管理
- **onSignal**: WebRTCシグナリングメッセージの中継

## 実装の変更履歴

### React + TypeScriptへの移行

- Vanilla JSからReact 18 + TypeScriptに完全リファクタリング
- Viteをビルドツールとして採用
- Material-UIでUIコンポーネントを実装

### キャンバス機能

- HTML5 Canvasで描画機能を実装
- ペン・消しゴムツール
- 色・サイズ変更
- ホイールズーム（0.1x～5x）
- 右クリックパン操作
- 市松模様の背景
- 固定サイズ（1920x1080）

### WebRTC実装

- ICE Candidateキューイングでタイミング問題を解決
- Data Channel接続状態の可視化
- 参加者リストに接続状態を表示（緑枠・接続状態テキスト）
- 5秒間隔での自動リトライ機能
- 接続をあきらめる手動終了機能
- デバッグログの追加

### デプロイ自動化

- WebSocket URLを自動取得してビルド時に注入
- S3にSPAルーティング対応（websiteErrorDocument）
- 環境変数による環境分離（ENV_SUFFIX）

## トラブルシューティング

### 描画が同期されない

1. ブラウザのコンソールを開く
2. 以下のログを確認：
   - `✅ WebRTC connected:` - 接続確立
   - `📤 Broadcasting draw:` - 送信
   - `📢 Broadcasting to X peers` - ブロードキャスト
   - `📥 Received from:` - 受信
   - `🔄 Retrying connection to` - リトライ中
3. 参加者リストで緑枠と「✅ WebRTC接続済み」が表示されているか確認
4. Data Channelの状態が`open`か確認

### 接続に時間がかかる

- ローディング画面が表示されている場合、自動リトライが5秒間隔で実行されます
- 待ちたくない場合は「部屋を退出」ボタンでメニューに戻る
- 別の部屋で再度試すか、時間を置いて再参加してください

### WebSocket接続エラー

- `.env`ファイルの`ENV_SUFFIX`が正しいか確認
- デプロイが完了しているか確認
- CloudFormationスタックが正常に作成されているか確認

### デプロイエラー

- AWS認証情報が正しく設定されているか確認
- Node.js 20.xを使用しているか確認
- `npm run install`で依存関係をインストール

## ドキュメント

詳細なドキュメントは`documents/`ディレクトリを参照してください。

- [requirements.md](documents/requirements.md) - プロジェクト要件
- [architecture.md](documents/architecture.md) - システムアーキテクチャ
- [implementation-plan.md](documents/implementation-plan.md) - 実装計画
- [development.md](documents/development.md) - 開発ガイド

## 注意事項

- このプロジェクトはPoC（概念実証）段階です
- 複数人での同時描画に対応していますが、大人数での使用は想定していません
- 本番環境での使用には追加のセキュリティ対策が必要です
- レイヤー機能は削除されました（シンプル化のため）

## ライセンス

MIT License