import { postMessage, logToSheet, postRecentEmails } from "./util";

/**
 * /hello コマンドを処理する関数
 */
export const handleHelloCommand = (payload: any) => {
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
 * /mail コマンドを処理する関数
 */
export const handleMailCommand = (payload: any) => {
  try {
    // 処理受付の通知
    postMessage(payload.channel_id, "メール取得処理を開始します...");

    // メール取得と投稿
    postRecentEmails(payload.channel_id);
  } catch (error: any) {
    logToSheet(
      "ERROR: Failed to process mail command. " + error.message,
      "ERROR"
    );
    postMessage(payload.channel_id, "メールの取得中にエラーが発生しました。");
  }
};
