// --- .envから読み込む秘密情報 ---
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const LOG_SPREADSHEET_ID = process.env.LOG_SPREADSHEET_ID;
const LOG_SHEET_NAME = "Logs";

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

  // スラッシュコマンドの処理
  if (payload.command) {
    switch (payload.command) {
      case "/hello":
        handleHelloCommand(payload); // /helloコマンドの処理へ
        break;
      default:
        logToSheet(`Received unknown command: ${payload.command}`, "ERROR");
        break;
    }
  } else {
    logToSheet(
      `Received unsupported payload format. ${JSON.stringify(payload)}`,
      "ERROR"
    );
  }

  return ContentService.createTextOutput();
};

/**
 * /hello コマンドを処理する関数
 */
const handleHelloCommand = (payload: any) => {
  try {
    postMessage(payload.channel_id, "Hello!");
  } catch (error: any) {
    logToSheet(
      "ERROR: Failed to post message to Slack. " + error.message,
      "ERROR"
    );
  }
};

/**
 * Slackにメッセージを投稿する汎用関数
 */
const postMessage = (channelId: string, text: string): void => {
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

/**
 * スプレッドシートにログを出力する関数
 */
const logToSheet = (
  message: string,
  level: "INFO" | "ERROR" | "DEBUG" = "INFO"
): void => {
  try {
    if (!LOG_SPREADSHEET_ID) {
      console.log("LOG_SPREADSHEET_ID is not set. Falling back to console.log");
      console.log(`[${level}] ${message}`);
      return;
    }

    const spreadsheet = SpreadsheetApp.openById(LOG_SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(LOG_SHEET_NAME);

    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = spreadsheet.insertSheet(LOG_SHEET_NAME);
      sheet.appendRow(["Timestamp", "Level", "Message"]);
    }

    const timestamp = new Date();
    sheet.appendRow([timestamp, level, message]);

    // 古いログを削除（1000行を超えたら古いものから削除）
    const lastRow = sheet.getLastRow();
    if (lastRow > 1000) {
      sheet.deleteRows(2, lastRow - 1000);
    }
  } catch (error) {
    // ログ出力自体が失敗した場合のフォールバック
    console.log(`Failed to log to sheet: ${error}`);
    console.log(`Original message: [${level}] ${message}`);
  }
};
