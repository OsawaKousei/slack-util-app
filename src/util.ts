const LOG_SPREADSHEET_ID = process.env.LOG_SPREADSHEET_ID;
const LOG_SHEET_NAME = "Logs";
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
/**
 * Slackにメッセージを投稿する汎用関数
 */
export const postMessage = (channelId: string, text: string): void => {
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
export const logToSheet = (
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
