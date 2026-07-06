import QRCode from "qrcode";
import { ACTIVITY_CONFIG, ASSETS, H5_COPY } from "@tata/shared-config";
import type { QuizResult } from "../types";

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

function containImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

export async function generatePoster(result: QuizResult) {
  const canvas = document.createElement("canvas");
  const width = 750;
  const height = 1180;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported");

  const logo = await loadImage(ASSETS.logo);
  const background = await loadImage(ASSETS.silentSpaceHero);
  const product = await loadImage(ASSETS.products[result.productKey]);

  coverImage(context, background, 0, 0, width, height);

  context.save();
  const wash = context.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, "rgba(245, 251, 255, 0.42)");
  wash.addColorStop(0.46, "rgba(238, 247, 251, 0.72)");
  wash.addColorStop(1, "rgba(232, 243, 249, 0.98)");
  context.fillStyle = wash;
  context.fillRect(0, 0, width, height);
  context.restore();

  context.save();
  context.strokeStyle = "rgba(123, 186, 217, 0.32)";
  context.lineWidth = 2;
  [150, 230, 320].forEach((radius) => {
    context.beginPath();
    context.arc(width - 138, 506, radius, -Math.PI * 0.92, Math.PI * 0.44);
    context.stroke();
  });
  context.restore();

  roundRect(context, 46, 46, 236, 76, 24);
  context.fillStyle = "rgba(11, 35, 49, 0.78)";
  context.fill();
  context.drawImage(logo, 72, 66, 184, 38);

  context.save();
  context.shadowColor = "rgba(45, 78, 101, 0.24)";
  context.shadowBlur = 30;
  containImage(context, product, 398, 306, 246, 470);
  context.restore();

  pill(context, 58, 168, 214, 52, "rgba(255, 255, 255, 0.74)", "rgba(217, 20, 39, 0.26)");
  context.fillStyle = "#D91427";
  context.font = '700 28px "Arial", sans-serif';
  context.fillText(result.levelDisplay, 84, 203);

  context.fillStyle = "#0B2331";
  context.font = '900 88px "Arial", sans-serif';
  context.fillText(result.title, 58, 308);
  context.fillStyle = "#5F7480";
  context.font = '600 34px "Arial", sans-serif';
  context.fillText(result.scene, 62, 366);

  roundRect(context, 58, 790, 634, 150, 28);
  context.fillStyle = "rgba(255, 255, 255, 0.82)";
  context.fill();
  context.strokeStyle = "rgba(45, 87, 105, 0.16)";
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = "#183140";
  context.font = '400 28px "Arial", sans-serif';
  const lines = wrapText(context, result.description, 575);
  lines.slice(0, 3).forEach((line, index) => {
    context.fillText(line, 86, 835 + index * 38);
  });

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, ACTIVITY_CONFIG.shareUrl, {
    width: 146,
    margin: 1,
    color: { dark: "#0B2331", light: "#FFFFFF" },
  });
  context.fillStyle = "#ffffff";
  roundRect(context, 78, 962, 182, 182, 24);
  context.fill();
  context.drawImage(qrCanvas, 96, 985, 146, 146);
  context.fillStyle = "#0B2331";
  context.font = '700 30px "Arial", sans-serif';
  context.fillText(H5_COPY.poster.bottomLines[0], 286, 1030);
  context.font = '400 24px "Arial", sans-serif';
  context.fillText(H5_COPY.poster.bottomLines[1], 286, 1078);
  context.fillStyle = "#D91427";
  context.font = '500 22px "Arial", sans-serif';
  context.fillText(H5_COPY.poster.qrLabel, 135, 1168);

  return canvas.toDataURL("image/png");
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

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
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

function pill(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke: string,
) {
  roundRect(context, x, y, width, height, height / 2);
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 2;
  context.stroke();
}
