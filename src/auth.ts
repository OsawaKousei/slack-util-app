import { logToSheet } from "./util";

/**
 * Slack Verification Tokenを使った認証を行う関数
 *
 * 【重要な注意事項】
 * この認証方法は、Slackによって非推奨とされています。
 * 理由:
 * - トークン自体がリクエストのbodyに含まれてネットワークを流れる
 * - トークンが漏洩した場合、なりすましが可能になる
 * - リプレイ攻撃を防ぐことができない
 *
 * 本来は「Signing Secret」を使った署名検証が推奨されますが、
 * GAS環境ではHTTPヘッダーを読み取れないため、この方法を採用しています。
 *
 * セキュリティリスクを理解した上で使用してください。
 *
 * @param payload リクエストのペイロード (e.parameter または JSON.parse(e.postData.contents))
 * @returns 認証に成功した場合はtrue、失敗した場合はfalse
 */
export const verifySlackRequest = (payload: any): boolean => {
  try {
    // 1. スクリプトプロパティから保存したVerification Tokenを取得
    const properties = PropertiesService.getScriptProperties();
    const SLACK_VERIFICATION_TOKEN = properties.getProperty(
      "SLACK_VERIFICATION_TOKEN"
    );

    // 2. トークンが設定されているか確認
    if (!SLACK_VERIFICATION_TOKEN) {
      logToSheet(
        "ERROR: SLACK_VERIFICATION_TOKEN is not set in script properties",
        "ERROR"
      );
      return false;
    }

    // 3. リクエストのbodyからトークンを取得
    const requestToken = payload.token;

    // 4. トークンが存在するか確認
    if (!requestToken) {
      logToSheet(
        "ERROR: No token found in request payload. Possible unauthorized access.",
        "ERROR"
      );
      return false;
    }

    // 5. トークンを比較
    if (requestToken !== SLACK_VERIFICATION_TOKEN) {
      logToSheet(
        `ERROR: Invalid Verification Token. Expected: ${SLACK_VERIFICATION_TOKEN.substring(
          0,
          4
        )}..., Received: ${requestToken.substring(0, 4)}...`,
        "ERROR"
      );
      return false;
    }

    // 認証成功
    logToSheet(
      `Verification Token validated successfully for command: ${
        payload.command || "unknown"
      }`,
      "INFO"
    );
    return true;
  } catch (error: any) {
    logToSheet(
      `ERROR: Exception during token verification. ${error.message}`,
      "ERROR"
    );
    return false;
  }
};

/**
 * 認証失敗時のレスポンスを返す関数
 *
 * @returns Unauthorizedレスポンス
 */
export const createUnauthorizedResponse =
  (): GoogleAppsScript.Content.TextOutput => {
    return ContentService.createTextOutput("Unauthorized");
  };
