# SubscMan - サブスク管理アプリ

サブスクリプションサービスの支出を管理・可視化する家計管理アプリです。

## ✨ 機能

- 📊 **ダッシュボード** - 月額/年額の合計表示、カテゴリ別円グラフ
- 💰 **為替対応** - USD/JPY の自動計算（API取得または手動入力）
- ➕ **簡単登録** - サブスクの追加・編集・削除
- 🤖 **AIアドバイザー** - OpenAI を使った節約アドバイス
- 📱 **レスポンシブ** - スマホ・PC両対応

## 🚀 使い方

### ローカルで起動

```bash
cd /Users/hiroshi/.gemini/antigravity/scratch/subscman
npx -y serve .
```

ブラウザで `http://localhost:3000` を開きます。

### または直接開く

`index.html` をブラウザにドラッグ＆ドロップするだけでも動作します。

## 📁 ファイル構成

```
subscman/
├── index.html      # メインHTML
├── css/
│   └── style.css   # スタイルシート
├── js/
│   ├── app.js      # アプリ初期化
│   ├── storage.js  # データ保存（LocalStorage）
│   ├── calculator.js # 金額計算
│   ├── ui.js       # UI操作
│   └── ai-advisor.js # AIアドバイザー
└── README.md       # このファイル
```

## ⚙️ 設定

### 為替レート
画面右上の🌐ボタンから設定できます。
- **手動入力**: 数値を入力して保存
- **自動取得**: 「最新を取得」ボタンでAPIから取得

### AIアドバイザー
OpenAI API キーが必要です。
1. [OpenAI](https://platform.openai.com/api-keys) でAPIキーを取得
2. AIアドバイザーセクションの「API設定」ボタンをクリック
3. APIキーを入力して保存

## 📝 データについて

すべてのデータはブラウザの LocalStorage に保存されます。
- サーバー不要で即座に使用可能
- ブラウザを閉じてもデータは保持
- 他のデバイスとは同期されません

## 🎨 カスタマイズ

`css/style.css` の `:root` セクションで色やスペーシングを変更できます。

## 📜 ライセンス

MIT License
