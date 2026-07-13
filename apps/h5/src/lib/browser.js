export function isWeChatBrowser(userAgent = "") {
  return /MicroMessenger/i.test(userAgent);
}
