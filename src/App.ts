// --- .envから読み込む秘密情報 ---
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

/**
 * Slackからのすべてのリクエストを受け取るメイン関数
 */
export const doPost = (e: GoogleAppsScript.Events.DoPost) => {
  const payload = JSON.parse(e.postData.contents);

  // Slack App設定時のURL検証リクエストに応答するためのコード
  if (payload.type === "url_verification") {
    return ContentService.createTextOutput(payload.challenge);
  }

  // ここからがメインの処理(ルーター部分)
  // 今回はスラッシュコマンドを処理する
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
