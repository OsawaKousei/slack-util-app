/**
 * Cloud Functions for Firebaseのエントリポイント
 * Slack Boltフレームワークを使用してSlackアプリを初期化・起動します。
 */
const { App, ExpressReceiver } = require("@slack/bolt");

// 秘密情報は環境変数から読み込みます。
// GCP Secret Managerから自動的に設定されます。
const signingSecret = process.env.SLACK_SIGNING_SECRET;
const token = process.env.SLACK_BOT_TOKEN;

// ExpressReceiver を使用して、Cloud Functions の HTTP トリガーに対応させます。
const expressReceiver = new ExpressReceiver({
  signingSecret: signingSecret,
  // エンドポイントを明示的にルートパス ('/') に設定します。
  endpoints: "/",
  processBeforeResponse: true, // Slackに3秒以内にACKを返すための設定は維持します。
});

// Boltアプリを初期化
const app = new App({
  token: token,
  receiver: expressReceiver,
});

/**
 * /hello コマンドをリッスンする
 */
app.command("/hello", async ({ command, ack, say }) => {
  try {
    // コマンドリクエストを受け取ったことをSlackに通知（3秒以内の応答）
    await ack();

    // 'say' を使ってチャンネルにメッセージを投稿
    await say(`Hello, <@${command.user_id}>!`);
  } catch (error) {
    console.error("Error in /hello command:", error);
    // エラーが発生した場合もユーザーに何かフィードバックを返すことが望ましい
    // この部分はなくても動作しますが、ユーザー体験が向上します。
    // await say("Sorry, something went wrong.");
  }
});

/**
 * エラーハンドリング
 */
app.error(async (error) => {
  console.error("Bolt app error:", error);
});

// Cloud FunctionsのエントリポイントとしてExpressReceiverのExpressアプリをエクスポート
exports.slackApp = expressReceiver.app;
