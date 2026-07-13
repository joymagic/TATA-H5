import assert from "node:assert/strict";
import { isWeChatBrowser } from "../apps/h5/src/lib/browser.js";

assert.equal(
  isWeChatBrowser("Mozilla/5.0 (iPhone) AppleWebKit Mobile MicroMessenger/8.0.57"),
  true,
);
assert.equal(isWeChatBrowser("Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1"), false);
assert.equal(isWeChatBrowser("Mozilla/5.0 Chrome/126.0.0.0 Mobile Safari/537.36"), false);

console.log("Browser environment tests passed.");
