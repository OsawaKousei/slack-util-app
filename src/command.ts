import { postMessage, logToSheet } from "./util";

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
