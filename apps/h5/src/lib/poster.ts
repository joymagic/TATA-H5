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

export async function generatePoster(result: QuizResult) {
  const canvas = document.createElement("canvas");
  const width = 750;
  const height = 1180;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported");

  const logo = await loadImage(ASSETS.logo);

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#050506");
  gradient.addColorStop(0.45, "#160306");
  gradient.addColorStop(1, "#07080b");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.32;
  for (let i = 0; i < 48; i += 1) {
    context.strokeStyle = i % 5 === 0 ? "#ff1e2d" : "#323238";
    context.lineWidth = i % 5 === 0 ? 2 : 1;
    context.beginPath();
    context.moveTo(0, 120 + i * 18);
    context.lineTo(width, 60 + i * 14);
    context.stroke();
  }
  context.restore();

  context.save();
  context.shadowColor = "#ff1e2d";
  context.shadowBlur = 28;
  context.strokeStyle = "#ff1e2d";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(58, 58);
  context.lineTo(width - 58, 58);
  context.lineTo(width - 28, height - 78);
  context.lineTo(42, height - 78);
  context.closePath();
  context.stroke();
  context.restore();

  context.drawImage(logo, 54, 54, 210, 44);

  drawNeonRoom(context, 270, 300, 330, 420);

  context.fillStyle = "#ffffff";
  context.font = '700 44px "Arial", sans-serif';
  context.fillText(result.levelDisplay, 58, 178);
  context.fillStyle = "#ff1e2d";
  context.font = '900 88px "Arial", sans-serif';
  context.fillText(result.title, 58, 275);
  context.fillStyle = "#ffffff";
  context.font = '600 34px "Arial", sans-serif';
  context.fillText(result.scene, 62, 335);

  context.fillStyle = "rgba(8, 8, 10, 0.78)";
  context.strokeStyle = "#ff1e2d";
  context.lineWidth = 2;
  context.fillRect(58, 785, 634, 145);
  context.strokeRect(58, 785, 634, 145);
  context.fillStyle = "#ffffff";
  context.font = '400 28px "Arial", sans-serif';
  const lines = wrapText(context, result.description, 575);
  lines.slice(0, 3).forEach((line, index) => {
    context.fillText(line, 86, 835 + index * 38);
  });

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, ACTIVITY_CONFIG.shareUrl, {
    width: 146,
    margin: 1,
    color: { dark: "#0D0D0F", light: "#FFFFFF" },
  });
  context.fillStyle = "#ffffff";
  context.fillRect(86, 975, 166, 166);
  context.drawImage(qrCanvas, 96, 985, 146, 146);
  context.fillStyle = "#ffffff";
  context.font = '700 30px "Arial", sans-serif';
  context.fillText(H5_COPY.poster.bottomLines[0], 286, 1030);
  context.font = '400 24px "Arial", sans-serif';
  context.fillText(H5_COPY.poster.bottomLines[1], 286, 1078);
  context.fillStyle = "#ff1e2d";
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

function drawNeonRoom(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  context.save();
  context.shadowColor = "#ff1e2d";
  context.shadowBlur = 24;
  context.strokeStyle = "#ff1e2d";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(x + 56, y + 20);
  context.lineTo(x + width - 16, y + 64);
  context.lineTo(x + width - 34, y + height);
  context.lineTo(x + 20, y + height - 38);
  context.closePath();
  context.stroke();

  context.shadowBlur = 12;
  context.strokeStyle = "rgba(255, 255, 255, 0.38)";
  context.lineWidth = 2;
  for (let i = 0; i < 5; i += 1) {
    context.beginPath();
    context.moveTo(x + 48 + i * 45, y + 62);
    context.lineTo(x + 22 + i * 38, y + height - 42);
    context.stroke();
  }

  context.strokeStyle = "#ff1e2d";
  context.lineWidth = 4;
  context.strokeRect(x + 118, y + 108, 118, 238);
  context.fillStyle = "#ff1e2d";
  context.font = '800 28px "Arial", sans-serif';
  context.fillText("TATA", x + 146, y + 232);
  context.restore();
}
