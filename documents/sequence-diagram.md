# echa25 システムシーケンス図

WebRTCの同期バグ原因究明のための詳細なシーケンス図

## 1. 初期接続フロー

```mermaid
sequenceDiagram
    participant C1 as Client1 (Browser)
    participant S3 as S3 (Static Hosting)
    participant AGW as API Gateway (WebSocket)
    participant LC as Lambda (onConnect)
    participant LJ as Lambda (onJoin)
    participant DDB as DynamoDB
    participant C2 as Client2 (Browser)

    Note over C1,C2: 初期接続とルーム参加

    C1->>S3: GET /
    S3->>C1: React App (HTML/JS/CSS)
    
    C1->>C1: ユーザーがroomId, nicknameを入力
    
    C1->>AGW: WebSocket接続開始
    AGW->>LC: onConnect Lambda実行
    LC->>DDB: connectionId保存 (connections table)
    LC->>AGW: 200 OK
    AGW->>C1: WebSocket接続確立
    
    C1->>AGW: {"action": "join", "roomId": "room1", "nickname": "user1"}
    AGW->>LJ: onJoin Lambda実行
    LJ->>DDB: ユーザー情報更新 (connections table)
    LJ->>DDB: ルーム情報保存 (rooms table)
    LJ->>AGW: {"type": "joined", "userId": "uuid1", "isHost": true, "members": [...]}
    AGW->>C1: ルーム参加完了通知
    
    Note over C1: Client1がホストとして参加完了
```

## 2. 2番目のユーザー参加とWebRTC接続確立（リトライ機能付き）

```mermaid
sequenceDiagram
    participant C1 as Client1 (Host)
    participant AGW as API Gateway
    participant LJ as Lambda (onJoin)
    participant LS as Lambda (onSignaling)
    participant DDB as DynamoDB
    participant C2 as Client2 (New User)
    participant UI as Loading UI

    Note over C1,C2: 2番目のユーザー参加とWebRTC接続

    C2->>AGW: WebSocket接続 + join
    AGW->>LJ: onJoin実行
    LJ->>DDB: ユーザー情報保存
    LJ->>DDB: 既存メンバー取得
    
    Note over LJ: 既存メンバーに新規参加を通知
    LJ->>AGW: user-joined通知 (to C1)
    AGW->>C1: {"type": "user-joined", "userId": "uuid2", "nickname": "user2"}
    
    LJ->>AGW: joined通知 (to C2)
    AGW->>C2: {"type": "joined", "userId": "uuid2", "members": [...]}
    
    Note over C2,UI: 既存メンバーがいる場合、ローディング表示開始
    C2->>UI: setIsConnecting(true)
    UI->>C2: ローディング画面表示 + "部屋を退出"ボタン
    
    Note over C1,C2: WebRTC接続開始 (myUserId < userId の場合C1が開始)
    
    C1->>C1: createPeerConnection(uuid2)
    C1->>C1: createDataChannel('draw')
    C1->>C1: createOffer()
    C1->>AGW: {"action": "signal", "targetUserId": "uuid2", "data": {"type": "offer", "offer": {...}}}
    AGW->>LS: onSignaling実行
    LS->>DDB: 送信者情報取得
    LS->>AGW: signal転送 (to C2)
    AGW->>C2: {"type": "signal", "fromUserId": "uuid1", "data": {"type": "offer", "offer": {...}}}
    
    alt 正常な接続フロー
        C2->>C2: setRemoteDescription(offer)
        C2->>C2: createAnswer()
        C2->>AGW: {"action": "signal", "targetUserId": "uuid1", "data": {"type": "answer", "answer": {...}}}
        AGW->>LS: onSignaling実行
        LS->>AGW: signal転送 (to C1)
        AGW->>C1: {"type": "signal", "fromUserId": "uuid2", "data": {"type": "answer", "answer": {...}}}
        
        C1->>C1: setRemoteDescription(answer)
        
        Note over C1,C2: ICE Candidate交換
        C1->>AGW: ICE Candidate
        AGW->>LS: onSignaling
        LS->>AGW: 転送
        AGW->>C2: ICE Candidate
        
        C2->>AGW: ICE Candidate  
        AGW->>LS: onSignaling
        LS->>AGW: 転送
        AGW->>C1: ICE Candidate
        
        Note over C1,C2: DataChannel接続確立
        C1->>C2: DataChannel 'open' event
        C2->>C1: DataChannel 'open' event
        
        Note over C2,UI: 接続成功でローディング終了
        C2->>UI: setIsConnecting(false)
        UI->>C2: ローディング画面非表示
        
    else 接続失敗時のリトライフロー
        Note over C2: 5秒間隔でリトライ開始
        loop 5秒間隔でリトライ
            C2->>C2: console.log("🔄 Retrying connection")
            C2->>C2: createPeerConnection(uuid1) 再実行
            C2->>AGW: 再度Offer送信
            Note over C2: 接続成功まで継続
        end
        
        alt ユーザーが部屋を退出する場合
            UI->>C2: "部屋を退出"ボタンクリック
            C2->>C2: navigate('/')
            Note over C2: メニュー画面に戻る
        end
    end
```

## 3. 複数人参加時の接続管理

```mermaid
sequenceDiagram
    participant C1 as Client1 (Host)
    participant C2 as Client2
    participant C3 as Client3
    participant C4 as Client4 (New User)
    participant AGW as API Gateway
    participant LJ as Lambda (onJoin)

    Note over C1,C4: 4人目のユーザー参加時の接続管理

    C4->>AGW: WebSocket接続 + join
    AGW->>LJ: onJoin実行
    LJ->>AGW: joined通知 (to C4)
    AGW->>C4: {"type": "joined", "members": [C1, C2, C3, C4]}
    
    Note over C4: 既存3人との接続を開始
    C4->>C4: setIsConnecting(true) - ローディング開始
    
    par C4 → C1 接続
        C4->>C1: WebRTC接続確立
        Note over C4,C1: 成功
    and C4 → C2 接続
        C4->>C2: WebRTC接続確立
        Note over C4,C2: 成功
    and C4 → C3 接続
        C4->>C3: WebRTC接続試行
        Note over C4,C3: 失敗（リトライ対象）
    end
    
    Note over C4: 5秒間隔でC3への接続をリトライ
    loop リトライループ
        C4->>C4: console.log("🔄 Retrying connection to C3")
        C4->>C3: 再接続試行
        alt 接続成功
            C4->>C3: DataChannel確立
            C4->>C4: setIsConnecting(false)
            Note over C4: 全員との接続完了
        else 接続失敗
            Note over C4: 5秒後に再試行
        end
    end
    
    alt ユーザーが待ちきれない場合
        C4->>C4: "部屋を退出"ボタンクリック
        C4->>C4: navigate('/')
        Note over C4: メニュー画面に戻る
    end
```

## 4. 描画データ同期フロー

```mermaid
sequenceDiagram
    participant C1 as Client1
    participant Canvas1 as Canvas1 (HTML5)
    participant DC as DataChannel (WebRTC P2P)
    participant Canvas2 as Canvas2 (HTML5)
    participant C2 as Client2

    Note over C1,C2: 描画データのリアルタイム同期

    C1->>Canvas1: mousedown (描画開始)
    C1->>Canvas1: mousemove (描画中)
    Canvas1->>Canvas1: drawLine(ctx, x1, y1, x2, y2, color, size, tool)
    
    Note over C1: onDraw コールバック実行
    Canvas1->>C1: onDraw({x1, y1, x2, y2, color, size, tool})
    
    Note over C1: WebRTCContext.broadcast() 実行
    C1->>C1: broadcast(drawData)
    C1->>DC: JSON.stringify({x1, y1, x2, y2, color, size, tool})
    
    Note over DC: P2P通信 (サーバー経由なし)
    DC->>C2: 描画データ受信
    
    C2->>C2: onmessage event
    C2->>Canvas2: drawLine(ctx, x1, y1, x2, y2, color, size, tool)
    Canvas2->>Canvas2: 描画反映
    
    Note over C1,C2: 描画同期完了
```

## 5. 潜在的な同期バグのポイント

### 4.1 ICE Candidate タイミング問題

```mermaid
sequenceDiagram
    participant C1 as Client1
    participant C2 as Client2
    
    Note over C1,C2: 🚨 潜在的バグ: ICE Candidateの順序問題
    
    C1->>C2: Offer
    C1->>C2: ICE Candidate (早すぎる)
    Note over C2: remoteDescription未設定のため<br/>ICE Candidateが無視される可能性
    C2->>C1: Answer
    C2->>C2: setRemoteDescription(answer)
    
    Note over C1,C2: 解決策: ICE Candidateキューイング実装済み
```

### 4.2 DataChannel状態管理

```mermaid
sequenceDiagram
    participant Canvas as Canvas Component
    participant WebRTC as WebRTC Context
    participant DC as DataChannel
    
    Note over Canvas,DC: 🚨 潜在的バグ: DataChannel状態確認不足
    
    Canvas->>WebRTC: broadcast(drawData)
    WebRTC->>WebRTC: dataChannels.forEach()
    
    alt DataChannel状態が'open'
        WebRTC->>DC: send(JSON.stringify(data))
        Note over DC: ✅ 正常送信
    else DataChannel状態が'connecting'/'closed'
        WebRTC->>DC: send() 失敗
        Note over DC: ❌ データ損失
    end
```

### 4.3 Canvas描画の競合状態

```mermaid
sequenceDiagram
    participant User as User Input
    participant Local as Local Canvas
    participant Remote as Remote Canvas
    participant DC as DataChannel
    
    Note over User,DC: 🚨 潜在的バグ: 描画の競合状態
    
    User->>Local: 描画開始
    Local->>Local: drawLine() 実行
    Local->>DC: broadcast(drawData)
    
    par 同時描画
        DC->>Remote: 受信データ1
        Remote->>Remote: drawLine() 実行
    and
        DC->>Remote: 受信データ2 (重複?)
        Remote->>Remote: drawLine() 重複実行?
    end
    
    Note over Remote: 結果: 線が太くなる/重複描画
```

## 6. デバッグ推奨ポイント

### 5.1 WebRTC接続状態の確認

```javascript
// ブラウザコンソールで実行
console.log('DataChannels:', window.dataChannels)
window.dataChannels.forEach((dc, userId) => {
  console.log(`Peer ${userId}: ${dc.readyState}`)
})
```

### 5.2 描画データフローの追跡

```javascript
// useWebRTC.ts の setupDataChannel 内
dc.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('📥 Received from', userId, ':', data)
  
  // 重複チェック
  if (window.lastDrawData && 
      JSON.stringify(window.lastDrawData) === JSON.stringify(data)) {
    console.warn('🚨 Duplicate draw data detected!')
    return
  }
  window.lastDrawData = data
  
  // 描画処理...
}
```

### 5.3 Canvas状態の確認

```javascript
// Canvas.tsx の onDraw コールバック内
const handleDraw = (data) => {
  console.log('📤 Broadcasting draw:', data)
  
  // 描画データの整合性チェック
  if (data.x1 === data.x2 && data.y1 === data.y2) {
    console.warn('🚨 Zero-length line detected!')
  }
  
  broadcast(data)
}
```

## 7. 修正提案

### 6.1 重複描画防止

```typescript
// WebRTCContext.tsx に追加
const [lastBroadcastData, setLastBroadcastData] = useState<any>(null)

const broadcast = useCallback((message: any) => {
  // 重複チェック
  if (lastBroadcastData && 
      JSON.stringify(lastBroadcastData) === JSON.stringify(message)) {
    console.warn('Duplicate broadcast prevented')
    return
  }
  
  setLastBroadcastData(message)
  // 既存のbroadcast処理...
}, [dataChannels, lastBroadcastData])
```

### 6.2 DataChannel状態の厳密チェック

```typescript
// useWebRTC.ts の broadcast 内
dataChannels.forEach((dc, userId) => {
  if (dc.readyState === 'open') {
    try {
      dc.send(JSON.stringify(message))
    } catch (error) {
      console.error(`Failed to send to ${userId}:`, error)
    }
  } else {
    console.warn(`DataChannel to ${userId} not ready: ${dc.readyState}`)
  }
})
```

### 6.3 描画データの一意性確保

```typescript
// Canvas.tsx に描画ID追加
const [drawId, setDrawId] = useState(0)

const handleDraw = (data) => {
  const drawData = {
    ...data,
    id: drawId,
    timestamp: Date.now()
  }
  setDrawId(prev => prev + 1)
  onDraw(drawData)
}
```

この詳細なシーケンス図により、WebRTCの同期バグの原因を特定し、適切な修正を行うことができます。