import QRCode from "qrcode";
import { ACTIVITY_CONFIG } from "@tata/shared-config";
import type { QuizResult } from "../types";

const POSTER_LOGO = "/assets/figma/figma-tata-logo.png";

const POSTER_META = {
  level1: {
    bg: "#d6b36d",
    accent: "#956a3f",
    roman: "Ⅰ",
    value: "隔声量20(dB)≤Rw+C<25(dB)",
  },
  level2: {
    bg: "#c18be4",
    accent: "#4b2b7c",
    roman: "Ⅱ",
    value: "隔声量25(dB)≤Rw+C<30(dB)",
  },
  level3: {
    bg: "#bed8c7",
    accent: "#203c36",
    roman: "Ⅲ",
    value: "隔声量30(dB)≤Rw+C<35(dB)",
  },
  level4: {
    bg: "#b9d8ef",
    accent: "#1a75b4",
    roman: "Ⅳ",
    value: "隔声量Rw+C≥35(dB)",
  },
} as const;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function coverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

export async function generatePoster(result: QuizResult, sceneUrl?: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 750;
  canvas.height = 1400;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported");

  const meta = POSTER_META[result.productKey];
  const [logo, scene] = await Promise.all([
    loadImage(POSTER_LOGO),
    loadImage(sceneUrl || `/assets/result-backgrounds/${result.productKey}/1.png`),
  ]);

  context.scale(2, 2);
  context.fillStyle = meta.bg;
  context.fillRect(0, 0, 375, 700);
  context.drawImage(logo, 107, 22, 161, 33);

  coverImage(context, scene, 42, 68, 292, 520);
  drawLevel(context, result, meta);
  drawCard(context, result, meta);
  drawQrArea(context);

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, ACTIVITY_CONFIG.shareUrl, {
    width: 154,
    margin: 1,
    color: { dark: "#2b2424", light: "#f5dfb7" },
  });
  context.drawImage(qrCanvas, 72, 595, 82, 82);

  context.fillStyle = "#ffffff";
  context.font = '700 18px "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
  context.textBaseline = "top";
  context.fillText("扫码生成", 169, 605);
  context.fillText("我的静音人格海报", 169, 633);

  return canvas.toDataURL("image/png");
}

function drawLevel(
  context: CanvasRenderingContext2D,
  result: QuizResult,
  meta: (typeof POSTER_META)[QuizResult["productKey"]],
) {
  context.save();
  context.fillStyle = meta.accent;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.font = '900 46px "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
  context.fillText(result.levelName, 187.5, 129);
  context.font = '900 34px "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
  context.fillText(`${meta.roman}级静音`, 187.5, 170);
  context.font = '700 13px "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
  context.fillText(meta.value, 187.5, 196);
  context.strokeStyle = meta.accent;
  context.lineWidth = 3;
  [84, 91, 98].forEach((x) => {
    context.beginPath();
    context.moveTo(x, 105);
    context.lineTo(x, 119);
    context.stroke();
  });
  [277, 284, 291].forEach((x) => {
    context.beginPath();
    context.moveTo(x, 105);
    context.lineTo(x, 119);
    context.stroke();
  });
  context.restore();
}

function drawCard(
  context: CanvasRenderingContext2D,
  result: QuizResult,
  meta: (typeof POSTER_META)[QuizResult["productKey"]],
) {
  context.save();
  roundedRect(context, 69, 256, 239, 146, 15);
  context.fillStyle = "rgba(255, 255, 255, 0.72)";
  context.fill();
  roundedRect(context, 80, 242, 76, 21, 5);
  context.fillStyle = "rgba(255, 255, 255, 0.75)";
  context.fill();

  context.fillStyle = meta.accent;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = '500 15px "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
  context.fillText("静音人格", 118, 252.5);
  context.font = '900 36px "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
  context.fillText(result.title, 188.5, 304);

  context.font = '500 14px "PingFang SC", "Microsoft YaHei", Arial, sans-serif';
  const lines = wrapText(context, formatDescription(result), 221);
  lines.slice(0, 3).forEach((line, index) => context.fillText(line, 188.5, 337 + index * 20));
  context.restore();
}

function formatDescription(result: QuizResult) {
  const roman = POSTER_META[result.productKey].roman;
  return result.description
    .replace("IV级", `${roman}级`)
    .replace("III级", `${roman}级`)
    .replace("II级", `${roman}级`)
    .replace("I级", `${roman}级`);
}

function drawQrArea(context: CanvasRenderingContext2D) {
  context.save();
  context.shadowColor = "#2b2424";
  context.shadowBlur = 0;
  context.shadowOffsetX = 4;
  context.shadowOffsetY = 5;
  context.fillStyle = "#f5dfb7";
  roundedRect(context, 58, 585, 102, 96, 4);
  context.fill();
  context.restore();

  context.strokeStyle = "#2b2424";
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(58, 608);
  context.lineTo(58, 585);
  context.lineTo(156, 585);
  context.lineTo(160, 608);
  context.moveTo(160, 657);
  context.lineTo(156, 681);
  context.lineTo(58, 681);
  context.lineTo(58, 657);
  context.stroke();
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let current = "";
  for (const char of text) {
    const next = current + char;
    if (context.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const corner = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + corner, y);
  context.lineTo(x + width - corner, y);
  context.quadraticCurveTo(x + width, y, x + width, y + corner);
  context.lineTo(x + width, y + height - corner);
  context.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
  context.lineTo(x + corner, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - corner);
  context.lineTo(x, y + corner);
  context.quadraticCurveTo(x, y, x + corner, y);
  context.closePath();
}
