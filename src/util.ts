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
export const postRecentEmails = (): void => {
  try {
    // スクリプトプロパティからチャンネルIDを取得
    const channel = getEnv("MAIL_CHANNEL_ID");

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
export const archiveSlackMessages = (): void => {
  // スクリプトプロパティからチャンネルIDを取得
  const notificationChannel = getEnv("ARCHIVE_CHANNEL_ID");
  try {
    // 環境変数から設定を取得
    const driveId = getEnv("ARCHIVE_DRIVE_ID");
    const lookBackDays = parseInt(getEnv("ARCHIVE_LOOK_BACK"));

    // 設定の検証
    if (!driveId || driveId.trim() === "") {
      throw new Error("ARCHIVE_DRIVE_ID is not set or empty");
    }

    logToSheet(
      `Starting archive process with Drive ID: ${driveId}, Look back: ${lookBackDays} days`,
      "INFO"
    );

    // 現在時刻と対象期間の計算
    const now = new Date();
    const oldestTimestamp = Math.floor(
      (now.getTime() - lookBackDays * 24 * 60 * 60 * 1000) / 1000
    );
    const folderName = `slack-archive-${Utilities.formatDate(
      now,
      "JST",
      "yyyyMMdd-HHmmss"
    )}`;

    // Google Driveフォルダへのアクセスとフォルダ作成
    let parentFolder;
    try {
      parentFolder = DriveApp.getFolderById(driveId);
      logToSheet(
        `Successfully accessed folder: ${parentFolder.getName()}`,
        "INFO"
      );
    } catch (driveError: any) {
      logToSheet(
        `ERROR: Failed to access Drive folder with ID: ${driveId}. Error: ${driveError.message}`,
        "ERROR"
      );
      throw new Error(
        `Google Driveフォルダへのアクセスに失敗しました。フォルダID: ${driveId}`
      );
    }

    const newFolder = parentFolder.createFolder(folderName);
    const folderUrl = newFolder.getUrl();
    logToSheet(`Created archive folder: ${folderName}`, "INFO");

    // Slackチャンネル一覧を取得
    logToSheet("Fetching Slack channels...", "INFO");
    const channels = getSlackChannels();
    logToSheet(`Found ${channels.length} channels`, "INFO");

    let processedChannels = 0;
    let totalMessages = 0;
    let skippedChannels = 0;

    // 各チャンネルを処理
    for (const channel of channels) {
      try {
        const channelId = channel.id;
        const channelName = channel.name;
        const isPrivate = channel.is_private;
        const isMember = channel.is_member;

        logToSheet(
          `Processing channel: #${channelName} (ID: ${channelId}, Private: ${isPrivate}, Member: ${isMember})`,
          "INFO"
        );

        // プライベートチャンネルでボットがメンバーでない場合はスキップ
        if (isPrivate && !isMember) {
          logToSheet(
            `Skipping private channel #${channelName}: Bot is not a member`,
            "WARNING"
          );
          skippedChannels++;
          continue;
        }

        // パブリックチャンネルで参加していない場合は参加を試みる
        if (!isPrivate && !isMember) {
          logToSheet(`Attempting to join channel #${channelName}...`, "INFO");
          const joined = joinChannel(channelId);
          if (!joined) {
            logToSheet(
              `Failed to join channel #${channelName}, skipping`,
              "WARNING"
            );
            skippedChannels++;
            continue;
          }
          // 参加後、少し待機
          Utilities.sleep(1000);
        }

        // メッセージ履歴を取得
        const messages = getChannelHistory(channelId, oldestTimestamp);

        if (messages.length === 0) {
          logToSheet(
            `No messages found in #${channelName} for the specified period`,
            "INFO"
          );
        } else {
          // メッセージをJSON形式でファイルに保存
          const fileName = `${channelName}.json`;
          const fileContent = JSON.stringify(
            {
              channel_id: channelId,
              channel_name: channelName,
              is_private: isPrivate,
              archive_date: now.toISOString(),
              oldest_timestamp: oldestTimestamp,
              message_count: messages.length,
              messages: messages,
            },
            null,
            2
          );

          newFolder.createFile(fileName, fileContent, MimeType.PLAIN_TEXT);
          logToSheet(
            `Saved ${messages.length} messages from #${channelName} to ${fileName}`,
            "INFO"
          );

          totalMessages += messages.length;
        }

        processedChannels++;

        // API rate limitを避けるため、少し待機
        Utilities.sleep(1000);
      } catch (channelError: any) {
        logToSheet(
          `ERROR processing channel ${channel.name}: ${channelError.message}`,
          "ERROR"
        );
        skippedChannels++;
      }
    }

    // サマリーファイルを作成
    const summaryContent = JSON.stringify(
      {
        archive_date: now.toISOString(),
        look_back_days: lookBackDays,
        oldest_timestamp: oldestTimestamp,
        total_channels: channels.length,
        processed_channels: processedChannels,
        skipped_channels: skippedChannels,
        total_messages: totalMessages,
      },
      null,
      2
    );
    newFolder.createFile("_summary.json", summaryContent, MimeType.PLAIN_TEXT);

    // 成功メッセージを投稿
    const successMessage =
      `✅ アーカイブ処理が完了しました！\n\n` +
      `📊 *処理サマリー*\n` +
      `• 実行時刻: ${Utilities.formatDate(
        now,
        "JST",
        "yyyy/MM/dd HH:mm:ss"
      )}\n` +
      `• 対象期間: 過去${lookBackDays}日間\n` +
      `• 処理チャンネル数: ${processedChannels}/${channels.length}\n` +
      `• スキップ: ${skippedChannels}チャンネル\n` +
      `• 取得メッセージ数: ${totalMessages}件\n` +
      `• 保存先: <${folderUrl}|Google Drive>\n\n` +
      `フォルダ名: \`${folderName}\``;

    postMessage(notificationChannel, successMessage);
    logToSheet(
      `Archive completed successfully: ${processedChannels} channels, ${totalMessages} messages`,
      "INFO"
    );
  } catch (error: any) {
    const errorMsg = `アーカイブ処理中にエラーが発生しました: ${error.message}`;
    postMessage(notificationChannel, `❌ ${errorMsg}`);
    logToSheet(`ERROR: Archive failed. ${error.message}`, "ERROR");
    throw error;
  }
};
