# 開発ガイド

## 開発環境セットアップ

### 必要なツール
- Node.js 20.x
- npm
- AWS CLI（認証情報設定済み）
- AWS CDK

### 初回セットアップ
```bash
# Node.jsバージョンの設定
nvm use

# 依存関係をインストール
npm run install

# AWS認証情報の確認
aws sts get-caller-identity
```

## プロジェクト構造

```
echa25/
├── packages/
│   ├── backend/          # CDKインフラコード
│   │   ├── bin/          # CDKアプリエントリーポイント
│   │   ├── lib/          # CDKスタック定義
│   │   ├── functions/    # Lambda関数コード
│   │   └── cdk.json      # CDK設定
│   └── frontend/         # フロントエンドコード
├── doc/                  # ドキュメント
├── package.json          # ルートpackage.json
└── README.md
```

## 開発フロー

### 1. リソースのデプロイ
```bash
npm run deploy
```

### 2. 開発作業
- フロントエンド: `packages/frontend/`
- Lambda関数: `packages/backend/functions/`
- インフラ: `packages/backend/lib/`

### 3. 変更の確認
```bash
# 差分確認
npm run diff

# CloudFormationテンプレート生成
npm run synth
```

### 4. 再デプロイ
```bash
npm run deploy
```

### 5. 作業終了時
```bash
# 全リソース削除
npm run destroy
```

## Lambda関数の追加

1. `packages/backend/functions/` に新しいディレクトリを作成
2. `index.js` を作成して関数を実装
3. `packages/backend/lib/` のスタックファイルに関数を追加

例:
```typescript
new lambda.Function(this, 'NewFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  code: lambda.Code.fromAsset(path.join(__dirname, '../functions/new-function')),
  handler: 'index.handler'
});
```

## デバッグ

### ローカルテスト
```bash
# Lambda関数のローカル実行
cd packages/backend/functions/hello-world
node -e "require('./index').handler({}).then(console.log)"
```

### AWSでのログ確認
```bash
# CloudWatch Logsを確認
aws logs tail /aws/lambda/LambdaStack-Handler --follow
```

## ベストプラクティス

- コミット前に `npm run diff` で変更を確認
- 作業終了時は必ず `npm run destroy` でリソース削除
- Lambda関数は小さく、単一責任に保つ
- 環境変数は CDK で管理
- シークレットは AWS Secrets Manager を使用
