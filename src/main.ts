import { doPost } from "./App";

interface Global {
  doPost: typeof doPost;
}
declare const global: Global;
// entryPoints
global.doPost = doPost;
