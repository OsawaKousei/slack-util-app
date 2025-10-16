// --- .envから読み込む秘密情報 ---
const APP_API_KEY = process.env.APP_API_KEY;

// --- ここにアプリケーションのコードを記述 ---
export const App = (e: string) => {
  console.log("App started with event:", e);
};
