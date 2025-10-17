declare namespace NodeJS {
  interface ProcessEnv {
    readonly SLACK_BOT_TOKEN: string;
    readonly SLACK_SIGNING_SECRET: string;
    readonly LOG_SPREADSHEET_ID: string;
  }
}
