# echa25

リアルタイム共同お絵描きアプリケーション

## 概要

echa25は、複数人が同じキャンバスにリアルタイムで絵を描くことができるWebアプリケーションです。お絵描きチャットのような体験を提供します。

### 主な機能
- ブラウザ上で動作するキャンバス
- 複数ユーザーによる同時描画
- リアルタイム同期（WebRTC P2P通信）

### 技術的特徴
- **サーバーレスアーキテクチャ**: AWS CDKで管理
- **WebRTC P2P通信**: 描画データはブラウザ間で直接通信（完全無料）
- **コスト最適化**: 開発時のみリソースを起動、非開発時は完全削除

## 技術スタック

### フロントエンド
- HTML5 Canvas
- JavaScript (WebRTC API)
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

## プロジェクト構造

```
echa25/
├── packages/
│   ├── backend/          # CDKインフラコード + Lambda関数
│   │   ├── bin/          # CDKアプリエントリーポイント
│   │   ├── lib/          # CDKスタック定義
│   │   ├── functions/    # Lambda関数コード
│   │   │   └── hello-world/
│   │   └── cdk.json
│   └── frontend/         # フロントエンドコード
├── doc/                  # ドキュメント
│   ├── architecture.md
│   ├── development.md
│   ├── implementation-plan.md
│   └── requirements.md
├── package.json          # ルートスクリプト
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
```

## 使い方

### 開発開始

```bash
# リソースをデプロイ
npm run deploy
```

デプロイ後、以下が作成されます：
- S3バケット（フロントエンド配信用）
- API Gateway WebSocket API（シグナリング用）
- Lambda関数
- DynamoDBテーブル

### 開発中

```bash
# フロントエンド開発サーバー起動
npm run dev

# 変更差分を確認
npm run diff

# CloudFormationテンプレートを生成
npm run synth

# 再デプロイ
npm run deploy
```

### 開発終了

```bash
# 全リソースを削除（料金発生を防ぐ）
npm run destroy
```

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

## ドキュメント

詳細なドキュメントは`doc/`ディレクトリを参照してください。

- [requirements.md](doc/requirements.md) - プロジェクト要件
- [architecture.md](doc/architecture.md) - システムアーキテクチャ
- [implementation-plan.md](doc/implementation-plan.md) - 実装計画
- [development.md](doc/development.md) - 開発ガイド

## ライセンス

## 注意事項

- このプロジェクトはPoC（概念実証）段階です
- 2人での同時描画を前提としています
- 本番環境での使用には追加のセキュリティ対策が必要です

MIT License