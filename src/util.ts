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

/**
 * Slackワークスペースからチャンネル一覧を取得する関数
 */
const getSlackChannels = (): any[] => {
  const token = getEnv("SLACK_BOT_TOKEN");
  const allChannels: any[] = [];
  let cursor = "";

  // パブリックチャンネルとプライベートチャンネルの両方を取得
  do {
    const url =
      `https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200` +
      (cursor ? `&cursor=${cursor}` : "");

    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: "get",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());

    if (!data.ok) {
      throw new Error(`Failed to fetch channels: ${data.error}`);
    }

    allChannels.push(...data.channels);
    cursor = data.response_metadata?.next_cursor || "";

    // API rate limitを避けるため、少し待機
    if (cursor) {
      Utilities.sleep(1000);
    }
  } while (cursor);

  return allChannels;
};

/**
 * ボットをチャンネルに参加させる関数
 */
const joinChannel = (channelId: string): boolean => {
  const token = getEnv("SLACK_BOT_TOKEN");
  const url = "https://slack.com/api/conversations.join";

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    payload: JSON.stringify({
      channel: channelId,
    }),
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    return data.ok;
  } catch (error: any) {
    logToSheet(
      `Failed to join channel ${channelId}: ${error.message}`,
      "WARNING"
    );
    return false;
  }
};

/**
 * 指定チャンネルから指定期間のメッセージ履歴を取得する関数
 */
const getChannelHistory = (
  channelId: string,
  oldestTimestamp: number
): any[] => {
  const token = getEnv("SLACK_BOT_TOKEN");
  const url = `https://slack.com/api/conversations.history?channel=${channelId}&oldest=${oldestTimestamp}&limit=1000`;

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: "get",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = UrlFetchApp.fetch(url, options);
  const data = JSON.parse(response.getContentText());

  if (!data.ok) {
    throw new Error(
      `Failed to fetch channel history for ${channelId}: ${data.error}`
    );
  }

  return data.messages || [];
};

/**
 * Slackメッセージをアーカイブし、Google Driveに保存する関数
 */
export const archiveSlackMessages = (channel: string): void => {
  try {
    // 環境変数から設定を取得
    const lookBackHours = parseInt(getEnv("ARCHIVE_LOOK_BACK"));
    const driveId = getEnv("ARCHIVE_DRIVE_ID");

    // 設定の検証
    if (isNaN(lookBackHours) || lookBackHours <= 0) {
      throw new Error(
        `Invalid ARCHIVE_LOOK_BACK value: ${getEnv(
          "ARCHIVE_LOOK_BACK"
        )}. Must be a positive number.`
      );
    }

    if (!driveId || driveId.trim() === "") {
      throw new Error("ARCHIVE_DRIVE_ID is not set or empty");
    }

    logToSheet(
      `Archive settings - Look back: ${lookBackHours} hours, Drive folder: ${driveId}`,
      "INFO"
    );

    // 現在時刻から指定時間前のタイムスタンプを計算
    const now = new Date();
    const startDate = new Date(now.getTime() - lookBackHours * 60 * 60 * 1000);
    const oldestTimestamp = Math.floor(startDate.getTime() / 1000);

    postMessage(channel, "📦 アーカイブ処理を開始します...");
    logToSheet(`Starting archive process for the last ${lookBackHours} hours`);

    // Slackチャンネル一覧を取得
    const channels = getSlackChannels();
    logToSheet(`Found ${channels.length} channels`);

    const archiveData: any = {
      archiveDate: now.toISOString(),
      lookBackHours: lookBackHours,
      channels: [],
      skippedChannels: [],
    };

    let totalMessageCount = 0;
    let successfulChannels = 0;
    let skippedPrivateChannels = 0;
    let skippedArchivedChannels = 0;
    let skippedOtherChannels = 0;

    // 各チャンネルからメッセージを取得
    channels.forEach((ch) => {
      try {
        // チャンネルがアーカイブされている場合はスキップ
        if (ch.is_archived) {
          logToSheet(`Skipping archived channel: #${ch.name}`, "INFO");
          archiveData.skippedChannels.push({
            name: ch.name,
            id: ch.id,
            reason: "archived",
          });
          skippedArchivedChannels++;
          return;
        }

        // ボットがチャンネルのメンバーでない場合は参加を試みる
        if (!ch.is_member) {
          // プライベートチャンネルの場合
          if (ch.is_private) {
            logToSheet(
              `Skipping private channel #${ch.name} (bot is not a member - please invite the bot to this channel)`,
              "WARNING"
            );
            archiveData.skippedChannels.push({
              name: ch.name,
              id: ch.id,
              reason: "private_not_member",
            });
            skippedPrivateChannels++;
            return;
          }

          // パブリックチャンネルの場合は参加を試みる
          logToSheet(`Attempting to join channel: #${ch.name}`, "INFO");
          const joined = joinChannel(ch.id);

          if (!joined) {
            logToSheet(
              `Could not join channel #${ch.name} (access restricted)`,
              "WARNING"
            );
            archiveData.skippedChannels.push({
              name: ch.name,
              id: ch.id,
              reason: "join_failed",
            });
            skippedOtherChannels++;
            return;
          }

          // 参加後、少し待機
          Utilities.sleep(500);
        }

        const messages = getChannelHistory(ch.id, oldestTimestamp);

        if (messages.length > 0) {
          archiveData.channels.push({
            id: ch.id,
            name: ch.name,
            is_private: ch.is_private || false,
            messageCount: messages.length,
            messages: messages,
          });
          totalMessageCount += messages.length;
          successfulChannels++;

          logToSheet(`Archived ${messages.length} messages from #${ch.name}`);
        } else {
          logToSheet(
            `No messages found in #${ch.name} for the specified period`,
            "INFO"
          );
        }

        // API rate limitを避けるため、少し待機
        Utilities.sleep(1000);
      } catch (error: any) {
        logToSheet(
          `WARNING: Failed to archive channel #${ch.name}: ${error.message}`,
          "WARNING"
        );
        archiveData.skippedChannels.push({
          name: ch.name,
          id: ch.id,
          reason: "error",
          error: error.message,
        });
        skippedOtherChannels++;
      }
    });

    // アーカイブデータをJSON形式で保存
    const fileName = `slack-archive-${Utilities.formatDate(
      now,
      "JST",
      "yyyyMMdd-HHmmss"
    )}.json`;
    const fileContent = JSON.stringify(archiveData, null, 2);

    logToSheet(
      `Preparing to save archive file: ${fileName} (${fileContent.length} bytes)`,
      "INFO"
    );

    // Google Driveに保存
    let file;
    let fileUrl;
    try {
      const folder = DriveApp.getFolderById(driveId);
      logToSheet(`Successfully accessed Drive folder: ${driveId}`, "INFO");

      file = folder.createFile(fileName, fileContent, "application/json");
      fileUrl = file.getUrl();

      logToSheet(`Successfully created file: ${fileName}`, "INFO");
    } catch (driveError: any) {
      logToSheet(
        `ERROR: Failed to save file to Google Drive. Folder ID: ${driveId}, Error: ${driveError.message}`,
        "ERROR"
      );
      throw new Error(
        `Failed to save archive to Google Drive (Folder ID: ${driveId}): ${driveError.message}`
      );
    }

    const totalSkipped =
      skippedPrivateChannels + skippedArchivedChannels + skippedOtherChannels;

    // 完了メッセージを投稿
    let summaryMessage =
      `✅ アーカイブが完了しました！\n\n` +
      `📊 *アーカイブサマリー*\n` +
      `• 対象期間: 過去${lookBackHours}時間\n` +
      `• 総チャンネル数: ${channels.length}\n` +
      `• アーカイブ成功: ${successfulChannels}チャンネル\n` +
      `• スキップ: ${totalSkipped}チャンネル\n`;

    if (skippedPrivateChannels > 0) {
      summaryMessage += `  - プライベート(未参加): ${skippedPrivateChannels}\n`;
    }
    if (skippedArchivedChannels > 0) {
      summaryMessage += `  - アーカイブ済み: ${skippedArchivedChannels}\n`;
    }
    if (skippedOtherChannels > 0) {
      summaryMessage += `  - その他: ${skippedOtherChannels}\n`;
    }

    summaryMessage +=
      `• メッセージ総数: ${totalMessageCount}件\n` +
      `• ファイル名: ${fileName}\n` +
      `• 保存先: <${fileUrl}|Google Drive>`;

    if (skippedPrivateChannels > 0) {
      summaryMessage +=
        `\n\n💡 *プライベートチャンネルについて*\n` +
        `プライベートチャンネルをアーカイブするには、各チャンネルにボットを招待してください。\n` +
        `スキップされたチャンネルの詳細はアーカイブファイルをご確認ください。`;
    }

    postMessage(channel, summaryMessage);
    logToSheet(
      `Archive completed: ${totalMessageCount} messages from ${successfulChannels} channels saved to ${fileName} (${totalSkipped} channels skipped: ${skippedPrivateChannels} private, ${skippedArchivedChannels} archived, ${skippedOtherChannels} other)`
    );
  } catch (error: any) {
    logToSheet(
      `ERROR: Failed to archive Slack messages. ${error.message}`,
      "ERROR"
    );
    throw error;
  }
};
