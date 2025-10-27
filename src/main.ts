import { doGet, doPost } from "./App";
import { executeArchiveSlackMessages } from "./command";
import { postRecentEmails, archiveSlackMessages } from "./util";

interface Global {
  doGet: typeof doGet;
  doPost: typeof doPost;
  executeArchiveSlackMessages: typeof executeArchiveSlackMessages;
  postRecentEmails: typeof postRecentEmails;
  archiveSlackMessages: typeof archiveSlackMessages;
}
declare const global: Global;
// entryPoints
global.doGet = doGet;
global.doPost = doPost;
// トリガーから実行される関数
global.executeArchiveSlackMessages = executeArchiveSlackMessages;
global.postRecentEmails = postRecentEmails;
global.archiveSlackMessages = archiveSlackMessages;
