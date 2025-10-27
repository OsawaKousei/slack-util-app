# Slack Util App

Google Apps Script (GAS) を用いた多機能 Slack ユーティリティアプリケーションです。Slack スラッシュコマンドを通じて、Gmail の受信メール取得、Slack メッセージのアーカイブ、ログ記録などの便利な機能を提供します。

## 目次

- [概要](#概要)
- [主な機能](#主な機能)
- [技術スタック](#技術スタック)
- [導入方法](#導入方法)
  - [前提条件](#前提条件)
  - [1. リポジトリのクローン](#1-リポジトリのクローン)
  - [2. 依存関係のインストール](#2-依存関係のインストール)
  - [3. Google Apps Script プロジェクトの設定](#3-google-apps-script-プロジェクトの設定)
  - [4. Slack アプリの作成と設定](#4-slack-アプリの作成と設定)
  - [5. 環境変数の設定](#5-環境変数の設定)
  - [6. デプロイ](#6-デプロイ)
  - [7. Slack アプリの URL 設定](#7-slack-アプリの-url-設定)
- [使用方法](#使用方法)
  - [/hello - 挨拶コマンド](#hello---挨拶コマンド)
  - [/mail - メール取得コマンド](#mail---メール取得コマンド)
  - [/logtest - ログテストコマンド](#logtest---ログテストコマンド)
  - [/slack-archive - アーカイブコマンド](#slack-archive---アーカイブコマンド)
- [開発者向け情報](#開発者向け情報)
  - [プロジェクト構成](#プロジェクト構成)
  - [ビルドとデプロイ](#ビルドとデプロイ)
  - [開発ワークフロー](#開発ワークフロー)
  - [コード構造](#コード構造)
  - [カスタマイズ](#カスタマイズ)
- [トラブルシューティング](#トラブルシューティング)
- [ライセンス](#ライセンス)

## 概要

このアプリケーションは、Google Apps Script をバックエンドとして動作し、Slack ワークスペースと連携する Bot アプリです。TypeScript で記述され、esbuild によってバンドル・ミニファイされた JavaScript として GAS にデプロイされます。

Slack のスラッシュコマンドを通じて、以下のような業務効率化機能を提供します：

- Gmail の最新メールを Slack チャンネルに自動投稿
- Slack の全チャンネルのメッセージを Google Drive にアーカイブ
- 操作ログをスプレッドシートに記録

## 主な機能

### 1. **挨拶コマンド (`/hello`)**

簡単な動作確認用の挨拶機能です。

### 2. **メール取得コマンド (`/mail`)**

指定期間内（デフォルト：過去 N 時間）に受信した Gmail メールを取得し、Slack チャンネルに整形して投稿します。

- メールの差出人、宛先、件名、日時、本文を含む
- 複数のメールスレッドに対応
- API レート制限を考慮した待機処理

### 3. **ログテストコマンド (`/logtest`)**

スプレッドシートへのログ記録機能をテストします。

- 実行者、チャンネル、タイムスタンプを記録
- デバッグ情報の動作確認

### 4. **アーカイブコマンド (`/slack-archive`)**

Slack ワークスペース内の全チャンネルのメッセージを Google Drive にアーカイブします。

- パブリック/プライベートチャンネルの自動検出
- 指定期間（デフォルト：過去 N 日間）のメッセージを取得
- JSON 形式で Google Drive に保存
- サマリーファイル（処理統計）の自動生成
- 30 秒のタイムアウト制限を回避するためのトリガー処理

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: Google Apps Script (V8)
- **ビルドツール**: esbuild + esbuild-gas-plugin
- **パッケージマネージャー**: npm
- **デプロイツール**: clasp (Command Line Apps Script Projects)
- **外部 API**: Slack Web API, Gmail API, Google Drive API, Google Sheets API

## 導入方法

### 前提条件

- Node.js (v16 以上推奨)
- npm
- Google アカウント
- Slack ワークスペースの管理者権限
- clasp CLI (`npm install -g @google/clasp`)

### 1. リポジトリのクローン

```bash
git clone https://github.com/OsawaKousei/slack-util-app.git
cd slack-util-app
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Google Apps Script プロジェクトの設定

#### 3.1. clasp でログイン

```bash
clasp login
```

ブラウザで Google アカウントにログインします。

#### 3.2. 新しい GAS プロジェクトを作成（初回のみ）

```bash
clasp create --type standalone --title "Slack Util App"
```

作成されたプロジェクトの Script ID が `.clasp.json` に自動的に設定されます。

#### 3.3. ログ用スプレッドシートの作成

1. [Google Sheets](https://sheets.google.com/) で新しいスプレッドシートを作成
2. スプレッドシート URL から ID をコピー（例：`https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit` の `{SPREADSHEET_ID}` 部分）

#### 3.4. アーカイブ用 Google Drive フォルダの作成

1. [Google Drive](https://drive.google.com/) で新しいフォルダを作成
2. フォルダを開き、URL から ID をコピー（例：`https://drive.google.com/drive/folders/{FOLDER_ID}` の `{FOLDER_ID}` 部分）

### 4. Slack アプリの作成と設定

#### 4.1. Slack アプリの作成

1. [Slack API](https://api.slack.com/apps) にアクセス
2. "Create New App" → "From an app manifest" を選択
3. ワークスペースを選択
4. `slack-app-manifest.json` の内容を貼り付け（URL 部分は後で設定）

#### 4.2. 必要な権限（Scopes）の確認

以下の Bot Token Scopes が設定されていることを確認：

- `commands` - スラッシュコマンドの使用
- `chat:write` - メッセージの投稿
- `channels:read` - パブリックチャンネル情報の取得
- `channels:history` - パブリックチャンネル履歴の取得
- `channels:join` - チャンネルへの参加
- `groups:read` - プライベートチャンネル情報の取得
- `groups:history` - プライベートチャンネル履歴の取得

#### 4.3. Bot Token の取得

1. "OAuth & Permissions" ページに移動
2. "Install to Workspace" をクリック
3. 表示される "Bot User OAuth Token" (`xoxb-...` で始まる) をコピー

#### 4.4. Verification Token の取得（認証用）

1. "Basic Information" ページに移動
2. "App Credentials" セクションまでスクロール
3. "Verification Token" をコピー

#### 4.5. チャンネル ID の取得

1. Slack アプリで対象チャンネルを開く
2. チャンネル名をクリック → "About" タブ
3. 最下部の "Channel ID" をコピー
   - メール投稿用チャンネル ID
   - アーカイブ通知用チャンネル ID

### 5. 環境変数の設定

GAS スクリプトプロパティに以下の環境変数を設定します。

#### 5.1. スクリプトエディタを開く

```bash
clasp open
```

#### 5.2. スクリプトプロパティの設定

GAS エディタで「プロジェクトの設定」→「スクリプト プロパティ」に以下を追加：

| プロパティ名               | 説明                                      | 例                    |
| -------------------------- | ----------------------------------------- | --------------------- |
| `SLACK_BOT_TOKEN`          | Slack Bot User OAuth Token                | `xoxb-1234567890-...` |
| `SLACK_VERIFICATION_TOKEN` | Slack Verification Token（認証用）        | `uLdvxyZUiPOq8...`    |
| `LOG_SPREADSHEET_ID`       | ログ記録用スプレッドシートの ID           | `1ABC...XYZ`          |
| `MAIL_CHANNEL_ID`          | メール投稿先チャンネル ID                 | `C01234567`           |
| `MAIL_LOOK_BACK`           | メール取得期間（時間）                    | `24`                  |
| `ARCHIVE_CHANNEL_ID`       | アーカイブ通知先チャンネル ID             | `C01234567`           |
| `ARCHIVE_DRIVE_ID`         | アーカイブ保存先 Google Drive フォルダ ID | `1ABC...XYZ`          |
| `ARCHIVE_LOOK_BACK`        | アーカイブ対象期間（日数）                | `30`                  |

### 6. デプロイ

#### 6.1. ビルドとプッシュ

```bash
npm run deploy
```

このコマンドは以下を実行します：

1. TypeScript を esbuild でバンドル・ミニファイ
2. `dist/main.js` と `dist/appsscript.json` を生成
3. clasp で GAS プロジェクトにプッシュ

#### 6.2. Web アプリとしてデプロイ

1. GAS エディタで「デプロイ」→「新しいデプロイ」
2. 種類：「ウェブアプリ」を選択
3. 設定：
   - **説明**: 任意（例：「v1.0」）
   - **次のユーザーとして実行**: 自分
   - **アクセスできるユーザー**: 全員
4. 「デプロイ」をクリック
5. 表示される **Web アプリの URL** をコピー

### 7. Slack アプリの URL 設定

#### 7.1. スラッシュコマンドの URL を更新

1. [Slack API](https://api.slack.com/apps) で作成したアプリを開く
2. "Slash Commands" に移動
3. 各コマンド (`/hello`, `/mail`, `/logtest`, `/slack-archive`) の "Request URL" を GAS の Web アプリ URL に更新

#### 7.2. インタラクティビティの URL を更新

1. "Interactivity & Shortcuts" に移動
2. "Request URL" を GAS の Web アプリ URL に更新
3. 保存

#### 7.3. アプリの再インストール（必要に応じて）

設定を変更した場合、"Install App" から再インストールが必要な場合があります。

## 使用方法

### `/hello` - 挨拶コマンド

Slack チャンネルで以下を入力：

```
/hello
```

Bot が "Hello!" と返信します。動作確認に最適です。

### `/mail` - メール取得コマンド

指定期間内の Gmail メールを取得して Slack に投稿します。

```
/mail
```

**動作フロー**:

1. 処理開始メッセージが表示されます
2. 設定された期間（`MAIL_LOOK_BACK` 時間）内の Gmail メールを取得
3. 各メールを整形して指定チャンネル（`MAIL_CHANNEL_ID`）に投稿
4. 完了メッセージが表示されます

**投稿内容**:

- 差出人（From）
- 宛先（To）
- 件名（Subject）
- 日時（Date）
- 本文（プレーンテキスト）

### `/logtest` - ログテストコマンド

スプレッドシートへのログ機能をテストします。

```
/logtest
```

**動作**:

- 実行者、チャンネル、タイムスタンプをスプレッドシートに記録
- Slack に成功メッセージを返信

### `/slack-archive` - アーカイブコマンド

Slack ワークスペース全体のメッセージを Google Drive にアーカイブします。

```
/slack-archive
```

**動作フロー**:

1. 処理受付メッセージが即座に表示されます（30 秒タイムアウト回避）
2. バックグラウンドでアーカイブ処理が実行されます
3. 全チャンネルのメッセージを取得（パブリック/プライベート対応）
4. JSON 形式で Google Drive に保存
5. 完了後、指定チャンネル（`ARCHIVE_CHANNEL_ID`）に通知

**アーカイブ内容**:

- 各チャンネルごとに JSON ファイル作成
- ファイル名：`{チャンネル名}.json`
- 内容：チャンネル情報、メッセージ配列
- サマリーファイル：`_summary.json`（処理統計）

**注意事項**:

- プライベートチャンネルは Bot が参加しているもののみ取得可能
- パブリックチャンネルには自動参加を試みます
- 大量のチャンネルがある場合、処理に時間がかかります

## 開発者向け情報

### プロジェクト構成

```
slack-util-app/
├── src/
│   ├── main.ts           # エントリーポイント（グローバル関数のエクスポート）
│   ├── App.ts            # doGet/doPost ハンドラー
│   ├── command.ts        # スラッシュコマンドの処理ロジック
│   ├── auth.ts           # 認証処理（Verification Token検証）
│   └── util.ts           # ユーティリティ関数（Slack API、Gmail、Drive等）
├── dist/                 # ビルド出力ディレクトリ（自動生成）
│   ├── main.js          # バンドル・ミニファイ済み JS
│   └── appsscript.json  # GAS メタデータ
├── .clasp.json          # clasp 設定（GAS プロジェクト ID）
├── appsscript.json      # GAS プロジェクト設定
├── esbuild.js           # esbuild ビルドスクリプト
├── tsconfig.json        # TypeScript 設定
├── package.json         # npm スクリプトと依存関係
├── slack-app-manifest.json  # Slack アプリマニフェスト
└── README.md            # このファイル
```

### ビルドとデプロイ

#### 利用可能な npm スクリプト

```bash
# ビルド（TypeScript → JavaScript バンドル）
npm run build

# GAS にプッシュ
npm run push

# GAS エディタを開く
npm run open

# ビルド + プッシュ（一括デプロイ）
npm run deploy
```

#### ビルドプロセス

`esbuild.js` で定義：

1. エントリーポイント：`src/main.ts`
2. バンドル：すべてのモジュールを 1 ファイルに統合
3. ミニファイ：コードを圧縮
4. GAS Plugin：`global` スコープへの関数エクスポート
5. ソースマップ：インライン形式で出力
6. ターゲット：ES2020

### 開発ワークフロー

#### 1. ローカル開発

```bash
# ファイルを編集
code src/

# ビルド
npm run build
```

#### 2. デプロイ

```bash
# GAS にプッシュ
npm run deploy
```

#### 3. テスト

- Slack でスラッシュコマンドを実行
- GAS エディタで「実行ログ」を確認
- スプレッドシートでログを確認

#### 4. デバッグ

- `logToSheet()` 関数でカスタムログを記録
- GAS エディタの「実行ログ」でエラーを確認
- Slack への投稿エラーはスプレッドシートに記録されます

### コード構造

#### `main.ts` - グローバル関数のエクスポート

GAS の制約により、Web アプリとして動作する関数やトリガーから実行される関数は `global` スコープに配置する必要があります。

```typescript
global.doGet = doGet; // GET リクエストハンドラー
global.doPost = doPost; // POST リクエストハンドラー
global.executeArchiveSlackMessages = executeArchiveSlackMessages; // トリガー関数
```

#### `App.ts` - リクエストハンドラー

- `doGet()`: Slack の URL 検証（challenge パラメータを返却）
- `doPost()`: スラッシュコマンドのルーティングと認証処理

#### `auth.ts` - 認証処理

- `verifySlackRequest()`: Verification Token による認証
- `createUnauthorizedResponse()`: 認証失敗時のレスポンス生成

#### `command.ts` - コマンド処理

各スラッシュコマンドに対応する関数：

- `handleHelloCommand()`
- `handleMailCommand()`
- `handleLogTestCommand()`
- `handleArchiveCommand()`

長時間処理（アーカイブ）は即座にレスポンスを返し、トリガーで非同期実行します。

#### `util.ts` - ユーティリティ関数

**環境変数管理**:

- `getEnv()`: スクリプトプロパティから取得

**Slack API**:

- `postMessage()`: メッセージ投稿
- `getSlackChannels()`: チャンネル一覧取得
- `joinChannel()`: チャンネル参加
- `getChannelHistory()`: メッセージ履歴取得

**Google サービス**:

- `logToSheet()`: スプレッドシートへのログ記録
- `postRecentEmails()`: Gmail メール取得と投稿
- `archiveSlackMessages()`: Slack アーカイブ処理

### カスタマイズ

#### 新しいコマンドの追加

1. **`slack-app-manifest.json` にコマンド定義を追加**:

```json
{
  "command": "/mycommand",
  "url": "your-app-url-here",
  "description": "My custom command",
  "should_escape": false
}
```

2. **`command.ts` にハンドラー関数を作成**:

```typescript
export const handleMyCommand = (payload: any) => {
  try {
    // コマンド処理
    postMessage(payload.channel_id, "My response");
  } catch (error: any) {
    logToSheet(`ERROR: ${error.message}`, "ERROR");
  }
};
```

3. **`App.ts` の `doPost()` にルーティング追加**:

```typescript
case "/mycommand":
  handleMyCommand(payload);
  break;
```

4. **Slack アプリの設定を更新**し、再デプロイ

#### 環境変数の追加

1. GAS の「スクリプト プロパティ」に新しい変数を追加
2. `util.ts` の `getEnv()` を使用して取得

```typescript
const myVar = getEnv("MY_VARIABLE");
```

## トラブルシューティング

### 認証に関する注意事項

このアプリケーションでは、**Verification Token（検証トークン）** を使用した認証を実装しています。

#### ⚠️ セキュリティ上の重要な注意

**この認証方法は Slack によって非推奨とされています。**

理由：

- トークン自体がリクエストの body に含まれてネットワークを流れる
- トークンが漏洩した場合、なりすましが可能になる
- リプレイ攻撃（同じリクエストの使い回し）を防ぐことができない

#### なぜこの方法を採用しているのか

本来、Slack は **Signing Secret（署名シークレット）** を使った署名検証を推奨しています。この方法では：

- 秘密鍵とタイムスタンプを使ってリクエストごとに署名を生成
- トークン（秘密鍵）自体がネットワークを流れない
- リプレイ攻撃も防げる

しかし、**Google Apps Script (GAS) の制約により、HTTP リクエストのヘッダーを読み取ることができません**。署名検証はヘッダーに含まれる `X-Slack-Signature` と `X-Slack-Request-Timestamp` を使用するため、GAS 環境では実装不可能です。

このため、ヘッダーが読めない GAS 環境下では、**Verification Token が唯一の現実的な認証手段**となります。

#### 認証の仕組み

1. Slack からのリクエストには、body に `token` パラメータが含まれます
2. GAS 側で、この `token` をスクリプトプロパティに保存した `SLACK_VERIFICATION_TOKEN` と比較します
3. 一致した場合のみ、リクエストを処理します

実装コードは `src/auth.ts` にまとめられています。

#### セキュリティ対策

トークン漏洩のリスクを最小限に抑えるため、以下の対策を推奨します：

1. **トークンを絶対に公開しない**

   - GitHub などにコミットしない
   - スクリプトプロパティに保存し、コードには含めない

2. **GAS の Web アプリ URL を秘密にする**

   - URL が漏洩すると、トークンと組み合わせてなりすましが可能

3. **ログを定期的に監視する**

   - 不審なリクエストがないか、スプレッドシートのログを確認

4. **可能であれば別の実行環境を検討する**
   - Node.js + Express などのサーバーであれば、署名検証が可能

### エラー: "Environment variable X is not set"

**原因**: スクリプトプロパティが未設定

**解決方法**:

1. `clasp open` で GAS エディタを開く
2. 「プロジェクトの設定」→「スクリプト プロパティ」
3. 不足している変数を追加

### Slack コマンドがタイムアウトする

**原因**: 処理が 3 秒以上かかる

**解決方法**:

- `/slack-archive` のようにトリガーを使用した非同期処理を実装
- 即座にレスポンスを返し、処理完了後に通知

### アーカイブがプライベートチャンネルを取得できない

**原因**: Bot がチャンネルのメンバーではない

**解決方法**:

- 手動で Bot をプライベートチャンネルに招待
- チャンネルで `/invite @slack-util-app` を実行

### Gmail API のクォータエラー

**原因**: API 呼び出し制限を超過

**解決方法**:

- `MAIL_LOOK_BACK` を短縮してメール件数を減らす
- コード内の `Utilities.sleep()` を増やして待機時間を延長

### デプロイ後に変更が反映されない

**原因**: キャッシュまたはデプロイバージョン

**解決方法**:

1. ブラウザのキャッシュをクリア
2. GAS エディタで新しいバージョンとして再デプロイ
3. Slack アプリの URL が最新のデプロイ URL を指しているか確認

## ライセンス

MIT License

---

**開発者**: OsawaKousei  
**リポジトリ**: https://github.com/OsawaKousei/slack-util-app  
**ブランチ**: dev

ご質問や問題が発生した場合は、GitHub Issues でお知らせください。
