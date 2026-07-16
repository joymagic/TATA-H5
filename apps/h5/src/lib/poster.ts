import QRCode from "qrcode";
import { ACTIVITY_CONFIG } from "@tata/shared-config";
import type { QuizResult } from "../types";

const POSTER_LOGO = "/assets/figma/figma-tata-logo.png";
const POSTER_TITLE = "/assets/figma/result-titles";
const POSTER_ASSET_VERSION = "20260716-1";

const POSTER_META = {
  level1: {
    bg: "#d6b36d",
    accent: "#edd8b2",
  },
  level2: {
    bg: "#c18be4",
    accent: "#dfb9ff",
  },
  level3: {
    bg: "#bed8c7",
    accent: "#c9edd2",
  },
  level4: {
    bg: "#b9d8ef",
    accent: "#c0e3ff",
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
  await Promise.all([
    document.fonts.load('500 14px "Alibaba PuHuiTi"'),
    document.fonts.load('600 16px "Alibaba PuHuiTi"'),
    document.fonts.load('700 36px "Alibaba PuHuiTi"'),
  ]);
  const [logo, scene, levelTitle, level4WhiteTitle] = await Promise.all([
    loadImage(POSTER_LOGO),
    loadImage(sceneUrl || `/assets/result-backgrounds-web/${result.productKey}/1.webp`),
    loadImage(`${POSTER_TITLE}/${result.productKey}.png?v=${POSTER_ASSET_VERSION}`),
    result.productKey === "level4"
      ? loadImage(`${POSTER_TITLE}/level4-white.png?v=${POSTER_ASSET_VERSION}`)
      : Promise.resolve(null),
  ]);

  context.scale(2, 2);
  context.fillStyle = meta.bg;
  context.fillRect(0, 0, 375, 700);
  context.drawImage(logo, 107, 22, 161, 33);

  coverImage(context, scene, 42, 68, 292, 553);
  if (level4WhiteTitle) {
    context.drawImage(level4WhiteTitle, 83, 101, 209, 119);
    context.drawImage(levelTitle, 84, 102, 209, 134);
  } else {
    context.drawImage(levelTitle, 84, 101, 207, 134);
  }
  drawResultCard(context, result, meta.accent);
  drawQrArea(context, meta.accent);

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, ACTIVITY_CONFIG.shareUrl, {
    width: 156,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#2b2424", light: "#ffffff" },
  });
  context.drawImage(qrCanvas, 237, 595, 78, 78);

  context.fillStyle = "#ffffff";
  context.font = '600 16px "Alibaba PuHuiTi", sans-serif';
  context.textAlign = "right";
  context.textBaseline = "top";
  context.fillText("扫码生成", 190, 630);
  context.fillText("我的静音人格海报", 195, 655);
  context.beginPath();
  context.moveTo(196, 635);
  context.lineTo(201, 639);
  context.lineTo(196, 643);
  context.strokeStyle = "#ffffff";
  context.lineWidth = 1.5;
  context.stroke();

  return canvas.toDataURL("image/png");
}

function drawResultCard(context: CanvasRenderingContext2D, result: QuizResult, accent: string) {
  const x = 58;
  const y = 236;
  const width = 260;
  const height = 170;

  context.save();
  drawCutCornerRect(context, x, y, width, height, 13, 12);
  context.fillStyle = "rgba(0, 0, 0, 0.6)";
  context.fill();
  context.strokeStyle = accent;
  context.lineWidth = 1.5;
  context.stroke();

  const labelX = 73;
  const labelY = 226;
  const labelWidth = 77;
  const labelHeight = 23;
  context.beginPath();
  context.moveTo(labelX + 8, labelY);
  context.lineTo(labelX + labelWidth, labelY);
  context.lineTo(labelX + labelWidth - 8, labelY + labelHeight);
  context.lineTo(labelX, labelY + labelHeight);
  context.closePath();
  const labelGradient = context.createLinearGradient(labelX, labelY, labelX + labelWidth, labelY);
  labelGradient.addColorStop(0, "#f8e3b9");
  labelGradient.addColorStop(1, accent);
  context.fillStyle = labelGradient;
  context.fill();

  context.fillStyle = "#40270e";
  context.font = '700 16px "Alibaba PuHuiTi", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("静音人格", labelX + labelWidth / 2, labelY + labelHeight / 2);

  context.fillStyle = accent;
  context.font = '700 36px "Alibaba PuHuiTi", sans-serif';
  context.textBaseline = "top";
  context.fillText(result.title, x + width / 2, 261);

  context.font = '500 14px "Alibaba PuHuiTi", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "top";
  result.description.split("\n").forEach((line, index) => {
    context.fillText(line, x + width / 2, 319 + index * 19);
  });
  context.restore();
}

function drawCutCornerRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerX: number,
  cornerY: number,
) {
  context.beginPath();
  context.moveTo(x + cornerX, y);
  context.lineTo(x + width - cornerX, y);
  context.lineTo(x + width, y + cornerY);
  context.lineTo(x + width, y + height - cornerY);
  context.lineTo(x + width - cornerX, y + height);
  context.lineTo(x + cornerX, y + height);
  context.lineTo(x, y + height - cornerY);
  context.lineTo(x, y + cornerY);
  context.closePath();
}

function drawQrArea(context: CanvasRenderingContext2D, borderColor: string) {
  context.save();
  context.shadowColor = "#2b2424";
  context.shadowBlur = 0;
  context.shadowOffsetX = 3;
  context.shadowOffsetY = 3;
  context.fillStyle = "#ffffff";
  context.fillRect(231, 589, 90, 90);
  context.restore();

  context.strokeStyle = borderColor;
  context.lineWidth = 1;
  context.strokeRect(231.5, 589.5, 89, 89);
  context.beginPath();
  context.moveTo(231, 601);
  context.lineTo(231, 589);
  context.lineTo(243, 589);
  context.moveTo(309, 589);
  context.lineTo(321, 589);
  context.lineTo(321, 601);
  context.moveTo(321, 667);
  context.lineTo(321, 679);
  context.lineTo(309, 679);
  context.moveTo(243, 679);
  context.lineTo(231, 679);
  context.lineTo(231, 667);
  context.stroke();
}
