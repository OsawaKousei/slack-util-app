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
export const doPost = (
  e: GoogleAppsScript.Events.DoPost
): GoogleAppsScript.Content.TextOutput => {
  // デバッグ出力: 受け取ったリクエストの内容をログに記録
  Logger.log("Received request:", JSON.stringify(e));
  Logger.log("Post data contents:", e.postData.contents);

  let payload: any;

  // try...catch構文でデータ形式を自動的に判別する
  try {
    // まずJSONとして解析を試みる (イベント、ボタン操作などはこちら)
    payload = JSON.parse(e.postData.contents);
  } catch (error) {
    // JSON解析に失敗した場合、スラッシュコマンド形式と判断し e.parameter を使う
    // GASは urlencoded 形式を自動で e.parameter に格納してくれる
    payload = e.parameter;
  }

  Logger.log("Parsed payload:", JSON.stringify(payload));

  // スラッシュコマンドの処理
  if (payload.command) {
    switch (payload.command) {
      case "/hello":
        return handleHelloCommand(payload); // /helloコマンドの処理へ
    }
  }

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
const postMessage = (channelId: string, text: string): void => {
  // 1. トークンが正しく設定されているか確認
  if (!SLACK_BOT_TOKEN || !SLACK_BOT_TOKEN.startsWith("xoxb-")) {
    Logger.log(
      "ERROR: SLACK_BOT_TOKEN is invalid or missing in build process."
    );
    return; // トークンがなければ処理を中断
  }

  Logger.log(`Attempting to post to channel: ${channelId}`);
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
    muteHttpExceptions: true, // 2. エラーレスポンスも正常に受け取る
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    // 3. Slackからの応答をすべてログに出力【最重要】
    Logger.log(`Slack API Response Code: ${responseCode}`);
    Logger.log(`Slack API Response Body: ${responseBody}`);
  } catch (error) {
    if (error instanceof Error) {
      Logger.log("FATAL: Failed to call Slack API. Error: " + error.message);
    } else {
      Logger.log(
        "FATAL: Failed to call Slack API. Unknown error: " +
          JSON.stringify(error)
      );
    }
  }
};
