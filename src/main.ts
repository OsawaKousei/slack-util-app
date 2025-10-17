import { doGet, doPost } from "./App";

interface Global {
  doGet: typeof doGet;
  doPost: typeof doPost;
}
declare const global: Global;
// entryPoints
global.doGet = doGet;
global.doPost = doPost;
