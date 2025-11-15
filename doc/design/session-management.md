# セッション管理機能 設計書

## 概要

合言葉ベースのセッション（部屋）管理機能を追加し、複数の独立したお絵描きセッションを実現する。

## 要件

- 合言葉で部屋を分離
- ニックネーム設定
- ホスト管理（最初の入室者、退出時は次の人が昇格）
- キャンバスデータは完全揮発型（全員退出で消失）

## データモデル

### DynamoDB テーブル設計

#### ConnectionsTable（既存を拡張）
```
PK: connectionId (String)
Attributes:
  - roomId: String
  - userId: String (UUID)
  - nickname: String
  - joinedAt: Number (timestamp)
```

#### RoomsTable（新規）
```
PK: roomId (String)
SK: connectionId (String)
Attributes:
  - userId: String
  - nickname: String
  - joinedAt: Number
  - isHost: Boolean
GSI: roomId-joinedAt-index (roomIdでクエリ、joinedAtでソート)
```

## API設計

### WebSocket API Routes

#### 既存
- `$connect`: WebSocket接続確立
- `$disconnect`: WebSocket切断

#### 新規
- `join`: 部屋参加

#### 拡張
- `signal`: roomIdフィルタリング追加

### メッセージフォーマット

#### クライアント → サーバー

**部屋参加**
```json
{
  "action": "join",
  "roomId": "my-room",
  "nickname": "太郎"
}
```

**シグナリング**
```json
{
  "action": "signal",
  "roomId": "my-room",
  "targetUserId": "user-xxx",
  "data": { ... }
}
```

#### サーバー → クライアント

**部屋参加通知**
```json
{
  "type": "user-joined",
  "userId": "user-xxx",
  "nickname": "太郎",
  "isHost": false,
  "members": [
    { "userId": "user-yyy", "nickname": "花子", "isHost": true },
    { "userId": "user-xxx", "nickname": "太郎", "isHost": false }
  ]
}
```

**ユーザー退出通知**
```json
{
  "type": "user-left",
  "userId": "user-xxx",
  "newHost": "user-zzz"
}
```

**シグナリング**
```json
{
  "type": "signal",
  "fromUserId": "user-xxx",
  "data": { ... }
}
```

## Lambda関数設計

### connect (既存を拡張)
- WebSocket接続確立
- connectionIdをConnectionsTableに保存（roomIdはnull）

### join (新規)
```
入力: roomId, nickname
処理:
  1. userId生成（UUID）
  2. ConnectionsTable更新（roomId, userId, nickname, joinedAt追加）
  3. RoomsTableに追加
  4. 同室の既存メンバーをクエリ
  5. isHost判定（joinedAtが最小 = ホスト）
  6. 既存メンバーに通知
  7. 参加者にメンバーリスト返却
```

### disconnect (既存を拡張)
```
処理:
  1. ConnectionsTableから削除
  2. RoomsTableから削除
  3. 同室の残メンバーをクエリ
  4. 残メンバーがいる場合:
     - 新ホスト判定（joinedAtが最小）
     - 残メンバーに退出通知
  5. 残メンバーがいない場合:
     - 何もしない（自動的にセッション終了）
```

### signal (既存を拡張)
```
入力: roomId, targetUserId, data
処理:
  1. roomIdで送信者を検証
  2. targetUserIdのconnectionIdを取得（同じroomIdのみ）
  3. メッセージ転送
```

## フロントエンド設計

### 画面構成

#### メニュー画面 (index.html)
```
[echa25]
合言葉: [_________]
ニックネーム: [_________]
[部屋に入る]
```

#### お絵描き画面 (canvas.html)
```
[キャンバス領域]

[ツールバー]

[参加者リスト]
👑 花子 (ホスト)
   太郎

[退出]
```

### JavaScript モジュール

#### menu.js (新規)
- 合言葉・ニックネーム入力
- バリデーション
- canvas.htmlへ遷移（URLパラメータでroomId, nickname渡す）

#### websocket.js (拡張)
- join メッセージ送信
- user-joined, user-left ハンドリング
- メンバーリスト管理

#### webrtc.js (拡張)
- roomId単位でP2P接続管理
- 同室メンバーとのみ接続

#### canvas.js (拡張)
- メンバーリスト表示
- 退出ボタン

## 実装フロー

### 部屋参加フロー
```
1. ユーザーがメニュー画面で合言葉・ニックネーム入力
2. canvas.html?roomId=xxx&nickname=yyyへ遷移
3. WebSocket接続（$connect）
4. joinメッセージ送信
5. サーバーがRoomsTableに登録
6. 既存メンバーに通知 → WebRTC接続開始
7. メンバーリスト表示
```

### ホスト昇格フロー
```
1. ホストが退出
2. disconnect Lambda実行
3. RoomsTableから削除
4. 残メンバーをjoinedAtでソート
5. 最小のユーザーをisHost=trueに更新
6. 残メンバーに新ホスト通知
7. フロントエンドでホスト表示更新
```

### キャンバス同期フロー
```
1. 新規ユーザーが参加
2. 既存ユーザーとWebRTC接続確立
3. 既存ユーザーが現在のキャンバス状態を送信
4. 新規ユーザーがキャンバスに描画
```

## セキュリティ考慮事項

- 合言葉は平文（暗号化なし）
- 部屋の存在確認APIは提供しない（列挙攻撃防止）
- ニックネームは50文字制限
- 合言葉は100文字制限
- XSS対策（ニックネーム表示時にエスケープ）

## コスト影響

- DynamoDB: RoomsTable追加（読み書き増加、微増）
- Lambda: join関数追加、disconnect拡張（実行回数微増）
- 想定: 依然として無料枠内

## 今後の拡張案

- 部屋一覧表示（公開部屋のみ）
- パスワード保護
- 最大参加人数制限
- キャンバス履歴の一時保存（S3）
- 部屋の有効期限設定
