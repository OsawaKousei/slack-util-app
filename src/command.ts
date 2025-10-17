import {
  postMessage,
  logToSheet,
  postRecentEmails,
  archiveSlackMessages,
} from "./util";

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

/**
 * /logtest コマンドを処理する関数
 */
export const handleLogTestCommand = (payload: any) => {
  try {
    const timestamp = new Date().toISOString();
    const userName = payload.user_name || "Unknown User";
    const channelName = payload.channel_name || "Unknown Channel";

    // デバッグメッセージをスプレッドシートに出力
    logToSheet(
      `Log test command executed by ${userName} in #${channelName} at ${timestamp}`,
      "DEBUG"
    );

    // Slackに成功メッセージを送信
    postMessage(
      payload.channel_id,
      `✅ ログテスト成功！スプレッドシートにデバッグログを出力しました。\n実行者: ${userName}\n実行時刻: ${timestamp}`
    );
  } catch (error: any) {
    logToSheet(
      "ERROR: Failed to process logtest command. " + error.message,
      "ERROR"
    );
    postMessage(
      payload.channel_id,
      "ログテストの実行中にエラーが発生しました。"
    );
  }
};

/**
 * /slack-archive コマンドを処理する関数
 */
export const handleArchiveCommand = (payload: any) => {
  try {
    // 処理受付の通知
    postMessage(payload.channel_id, "アーカイブ処理を開始します...");

    // Slackメッセージのアーカイブを実行
    archiveSlackMessages(payload.channel_id);
  } catch (error: any) {
    logToSheet(
      "ERROR: Failed to process archive command. " + error.message,
      "ERROR"
    );
    postMessage(payload.channel_id, "アーカイブ処理中にエラーが発生しました。");
  }
};
