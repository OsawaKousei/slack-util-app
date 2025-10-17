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

/**
 * 指定期間内に受信したメールを取得してSlackに投稿する関数
 */
export const postRecentEmails = (channel: string): void => {
  try {
    // 環境変数から期間(時間単位)を取得
    const lookBackHours = parseInt(getEnv("MAIL_LOOK_BACK"));

    // 現在時刻から指定時間前の日時を計算
    const now = new Date();
    const startDate = new Date(now.getTime() - lookBackHours * 60 * 60 * 1000);

    // Gmailから指定期間のメールスレッドを取得
    const query = `after:${Math.floor(startDate.getTime() / 1000)}`;
    const threads = GmailApp.search(query, 0, 100); // 最大100件

    if (threads.length === 0) {
      postMessage(
        channel,
        `過去${lookBackHours}時間以内に受信したメールはありません。`
      );
      logToSheet(`No emails found in the last ${lookBackHours} hours`);
      return;
    }

    // サマリーメッセージを投稿
    postMessage(
      channel,
      `📧 *過去${lookBackHours}時間以内に受信したメール (${threads.length}件のスレッド)*\n各メールを個別に投稿します...`
    );

    let totalMessageCount = 0;

    // 各スレッドのメッセージを個別に投稿
    threads.forEach((thread, threadIndex) => {
      const messages = thread.getMessages();

      messages.forEach((message, messageIndex) => {
        const from = message.getFrom();
        const to = message.getTo();
        const subject = message.getSubject();
        const date = message.getDate();
        const body = message.getPlainBody(); // プレーンテキスト本文を取得

        // メッセージを整形して投稿（コードブロックなし、分割なし）
        let messageText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        messageText += `📨 *メール ${threadIndex + 1}-${messageIndex + 1}*\n\n`;
        messageText += `*From:* ${from}\n`;
        messageText += `*To:* ${to}\n`;
        messageText += `*Subject:* ${subject}\n`;
        messageText += `*Date:* ${Utilities.formatDate(
          date,
          "JST",
          "yyyy/MM/dd HH:mm:ss"
        )}\n\n`;
        messageText += `*本文:*\n${body}`;

        postMessage(channel, messageText);
        totalMessageCount++;

        // API rate limitを避けるため、少し待機
        Utilities.sleep(1000);
      });
    });

    // 完了メッセージを投稿
    postMessage(
      channel,
      `✅ メール投稿が完了しました。合計 ${totalMessageCount} 件のメッセージを投稿しました。`
    );
    logToSheet(
      `Posted ${totalMessageCount} messages from ${threads.length} threads to Slack channel ${channel}`
    );
  } catch (error: any) {
    logToSheet(
      `ERROR: Failed to fetch or post emails. ${error.message}`,
      "ERROR"
    );
    throw error;
  }
};
