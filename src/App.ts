// --- .envから読み込む秘密情報 ---
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

/**
 * SlackからのURL検証(GETリクエスト)に対応するための関数
 */
export const doGet = (
  e: GoogleAppsScript.Events.DoGet
): GoogleAppsScript.Content.TextOutput => {
  // Slackから送られてきた 'challenge' パラメータを取得
  const challenge = e.parameter.challenge;

  // challengeパラメータをそのままテキストとして返却する
  return ContentService.createTextOutput(challenge);
};

/**
 * Slackからのすべてのリクエストを受け取るメイン関数
 */
export const doPost = (e: GoogleAppsScript.Events.DoPost) => {
  // デバッグ出力: 受け取ったリクエストの内容をログに記録
  console.log("Received request:", JSON.stringify(e));
  console.log("Post data contents:", e.postData.contents);

  const payload = JSON.parse(e.postData.contents);

  // スラッシュコマンドを処理する
  if (payload.command) {
    switch (payload.command) {
      case "/hello":
        return handleHelloCommand(payload); // /helloコマンドの処理へ
    }
  }

  // 想定外のリクエストは無視
  return ContentService.createTextOutput();
};

/**
 * /hello コマンドを処理する関数
 */
const handleHelloCommand = (payload: any) => {
  // Slack APIにメッセージを投稿する
  postMessage(payload.channel_id, "Hello!");
  // Slackに即時応答を返す(これがないとエラー表示になる)
  return ContentService.createTextOutput();
};

/**
 * Slackにメッセージを投稿する汎用関数
 */
const postMessage = (channelId: string, text: string) => {
  const url = "https://slack.com/api/chat.postMessage";
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: "post",
    contentType: "application/json; charset=utf-8",
    headers: {
      Authorization: "Bearer " + SLACK_BOT_TOKEN,
    },
    payload: JSON.stringify({
      channel: channelId,
      text: text,
    }),
  };

  UrlFetchApp.fetch(url, options);
};
