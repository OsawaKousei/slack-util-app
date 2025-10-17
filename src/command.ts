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
    postRecentEmails();

    // 完了メッセージを投稿
    postMessage(payload.channel_id, "✅ メール投稿が完了しました");
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
    // 処理受付の通知を即座に返す
    postMessage(
      payload.channel_id,
      "アーカイブ処理を受け付けました。処理が完了次第、結果を通知します。"
    );

    // トリガーを作成して少し後に実行(30秒のタイムアウトを回避)
    ScriptApp.newTrigger("executeArchiveSlackMessages")
      .timeBased()
      .after(1) // 5秒後に実行
      .create();

    logToSheet("Archive trigger created successfully", "INFO");
  } catch (error: any) {
    logToSheet(
      "ERROR: Failed to create archive trigger. " + error.message,
      "ERROR"
    );
    postMessage(
      payload.channel_id,
      "アーカイブ処理のスケジュール作成中にエラーが発生しました。"
    );
  }
};

/**
 * トリガーから実行されるアーカイブ処理の実行関数
 * グローバルスコープから呼び出し可能にする必要があります
 */
export const executeArchiveSlackMessages = () => {
  try {
    // アーカイブ処理を実行
    archiveSlackMessages();

    // 実行後、トリガーを削除
    deleteCurrentTrigger();
  } catch (error: any) {
    logToSheet(`ERROR: Failed to execute archive. ${error.message}`, "ERROR");
    // エラー時もトリガーを削除
    deleteCurrentTrigger();
  }
};

/**
 * 現在実行中のトリガーを削除する関数
 */
const deleteCurrentTrigger = () => {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach((trigger) => {
      if (trigger.getHandlerFunction() === "executeArchiveSlackMessages") {
        ScriptApp.deleteTrigger(trigger);
      }
    });
  } catch (error: any) {
    logToSheet(
      `WARNING: Failed to delete trigger. ${error.message}`,
      "WARNING"
    );
  }
};
