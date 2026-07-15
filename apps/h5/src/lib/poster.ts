import QRCode from "qrcode";
import { ACTIVITY_CONFIG } from "@tata/shared-config";
import type { QuizResult } from "../types";

const POSTER_LOGO = "/assets/figma/figma-tata-logo.png";
const POSTER_TITLE = "/assets/figma/result-titles";
const POSTER_ASSET_VERSION = "20260715-1";

const POSTER_META = {
  level1: {
    bg: "#d6b36d",
  },
  level2: {
    bg: "#c18be4",
  },
  level3: {
    bg: "#bed8c7",
  },
  level4: {
    bg: "#b9d8ef",
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
  await document.fonts.load('600 16px "Alibaba PuHuiTi"');
  const [logo, scene, levelTitle] = await Promise.all([
    loadImage(POSTER_LOGO),
    loadImage(sceneUrl || `/assets/result-backgrounds-web/${result.productKey}/1.webp`),
    loadImage(`${POSTER_TITLE}/${result.productKey}.png?v=${POSTER_ASSET_VERSION}`),
  ]);

  context.scale(2, 2);
  context.fillStyle = meta.bg;
  context.fillRect(0, 0, 375, 700);
  context.drawImage(logo, 107, 22, 161, 33);

  coverImage(context, scene, 42, 68, 292, 553);
  context.drawImage(levelTitle, 84, 101, 207, 134);
  drawQrArea(context);

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

function drawQrArea(context: CanvasRenderingContext2D) {
  context.save();
  context.shadowColor = "#2b2424";
  context.shadowBlur = 0;
  context.shadowOffsetX = 3;
  context.shadowOffsetY = 3;
  context.fillStyle = "#ffffff";
  context.fillRect(231, 589, 90, 90);
  context.restore();

  context.strokeStyle = "rgba(255, 255, 255, 0.92)";
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
