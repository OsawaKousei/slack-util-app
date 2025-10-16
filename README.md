# Google Apps Script TypeScript テンプレート

このリポジトリは、TypeScript を使用して Google Apps Script（GAS）アプリケーションを開発するためのテンプレートです。モダンな TypeScript 開発環境と Google Apps Script の統合を簡単に始められます。

## 特徴

- 🚀 TypeScript による型安全な開発
- 📦 esbuild による高速バンドル
- 🔐 環境変数による秘密情報の管理
- 🛠️ Google Apps Script CLI (clasp) との統合
- 📝 ESNext の最新 JavaScript 機能をサポート

## 前提条件

- Node.js
- npm
- Google Apps Script CLI (clasp)

```bash
npm install -g @google/clasp
```

## プロジェクト構成

```
GasAppTsTemplate/
├── src/
│   ├── main.ts          # エントリーポイント
│   ├── App.ts           # メインアプリケーションロジック
│   └── environment.d.ts # 環境変数の型定義
├── env.template         # 環境変数テンプレート
├── .gitignore           # gitignore
├── esbuild.js           # ビルド設定
├── tsconfig.json        # TypeScript設定
└── package.json         # プロジェクト設定
```

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.template`をコピーして`.env`ファイルを作成し、必要な環境変数を設定します。

```bash
cp .env.template .env
```

`.env`ファイルを編集して、実際の API キーを設定してください：

```bash
APP_API_KEY="your-actual-api-key-here"
```

### 3. 新しい環境変数の追加（必要に応じて）

新しい環境変数を追加する場合は、以下のファイルを更新してください：

1. `.env`ファイルに環境変数を追加
2. `esbuild.js`の define セクションに追加
3. `src/environment.d.ts`に型定義を追加

### 4. Google Apps Script プロジェクトの作成

Google アカウントにログインし、新しい GAS プロジェクトを作成します：

```bash
# Googleアカウントにログイン
clasp login

# 新しいGASプロジェクトを作成
clasp create --title "Your Project Title" --type standalone --rootDir ./
```

このスクリプトを実行すると`.clasp.json`と`appsscript.json`が生成され、アカウントの Drive に AppScript の実態が作成されます。

## 開発ワークフロー

### ビルド

TypeScript コードを JavaScript にトランスパイルし、バンドルします：

```bash
npm run build
```

※ 最初のビルド実行後に、`.clasp.json`で`"rootDir": "./dist",`としてください。

### プッシュ

ビルドしたコードを Google Apps Script にアップロードします：

```bash
npm run push
```

### デプロイ（ビルド + プッシュ）

ビルドとプッシュを一度に実行します：

```bash
npm run deploy
```

## 使用方法

### 基本的なアプリケーションの作成

`src/App.ts`にメインのアプリケーションロジックを記述します：

```typescript
export const App = (e: string) => {
  console.log("App started with event:", e);
  // ここにアプリケーションロジックを追加
};
```

### 環境変数の使用

環境変数は`process.env`を通じてアクセスできます：

```typescript
const apiKey = process.env.APP_API_KEY;
```

## トラブルシューティング

### ビルドエラー

- TypeScript の型エラーがある場合は、`tsconfig.json`の設定を確認してください
- 環境変数が正しく設定されているか`.env`ファイルを確認してください

### プッシュエラー

- `clasp login`でログインしているか確認してください
- `.clasp.json`で`"rootDir": "./dist",`としているか確認してください

### 環境変数が読み込まれない

- `.env`ファイルが存在するか確認してください
- `esbuild.js`の define セクションに変数が追加されているか確認してください
