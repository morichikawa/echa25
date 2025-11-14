# echa25

## 環境構築

```bash
# Node.jsバージョンの設定
nvm use

# バックエンドの依存関係をインストール
cd backend
npm install

# デプロイ
npx cdk deploy

# リソースの削除
npx cdk destroy --force
```