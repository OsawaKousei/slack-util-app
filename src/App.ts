import { handleHelloCommand } from "./command";
import { logToSheet } from "./util";

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
        handleHelloCommand(payload);
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

  // レスポンスを返す（Slack APIの仕様に従う）
  return ContentService.createTextOutput();
};
