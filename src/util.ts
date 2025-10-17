/**
 * スクリプトプロパティから環境変数を取得する
 */
export const getEnv = (key: string): string => {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
};

/**
 * Slackにメッセージを投稿する関数
 */
export const postMessage = (channel: string, text: string): void => {
  const token = getEnv("SLACK_BOT_TOKEN");
  const url = "https://slack.com/api/chat.postMessage";
  const payload = {
    channel: channel,
    text: text,
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    payload: JSON.stringify(payload),
  };

  UrlFetchApp.fetch(url, options);
};

/**
 * スプレッドシートにログを記録する関数
 */
export const logToSheet = (message: string, level: string = "INFO"): void => {
  const spreadsheetId = getEnv("LOG_SPREADSHEET_ID");
  const sheet = SpreadsheetApp.openById(spreadsheetId).getActiveSheet();
  const timestamp = new Date();
  sheet.appendRow([timestamp, level, message]);
};
