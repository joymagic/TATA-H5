import {
  Check,
  ChevronDown,
  ChevronRight,
  Music2,
  RotateCcw,
  ScrollText,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ACTIVITY_CONFIG, H5_COPY, QUESTIONS } from "@tata/shared-config";
import { audioEngine } from "./lib/audio";
import { isWeChatBrowser } from "./lib/browser";
import { generatePoster } from "./lib/poster";
import { LEGAL_DOCUMENTS, type LegalDocumentKey } from "./legalContent";
import { LotteryRuleError, activityApi } from "./services/api";
import type { LeadFormState, LotteryPrize, OptionKey, QuizResult, Screen, SessionState } from "./types";

const initialLead: LeadFormState = {
  name: "",
  phone: "",
  province: "",
  city: "",
  privacyConsent: false,
};

const ANALYSIS_STEPS = ["分析答题数据", "识别宅家人格", "匹配静音等级", "生成专属报告"];
const INITIAL_LOADING_MIN_MS = 3000;
const RESULT_LOADING_STEP_GAP_MS = 420;
const RESULT_LOADING_REVEAL_MS = 300;
const RESULT_IMAGE_COUNT = 4;
const RESULT_LEVEL_VALUES = {
  level1: "隔声量20(dB)≤Rw+C<25(dB)",
  level2: "隔声量25(dB)≤Rw+C<30(dB)",
  level3: "隔声量30(dB)≤Rw+C<35(dB)",
  level4: "隔声量Rw+C≥35(dB)",
} as const;
const RESULT_THEMES = {
  level1: { bg: "#d6b36d", accent: "#956a3f", button: "#f1dbb1", cardText: "#edd8b2", roman: "Ⅰ" },
  level2: { bg: "#c18be4", accent: "#4b2b7c", button: "#c18be4", cardText: "#dfb9ff", roman: "Ⅱ" },
  level3: { bg: "#bed8c7", accent: "#203c36", button: "#d5efd9", cardText: "#c9edd2", roman: "Ⅲ" },
  level4: { bg: "#b9d8ef", accent: "#1a75b4", button: "#b9d8ef", cardText: "#c0e3ff", roman: "Ⅳ" },
} as const;
const LOTTERY_PRIZE_TARGET_ROTATION: Record<LotteryPrize["prizeLevel"], number> = {
  SPECIAL: 0,
  FIRST: 295,
  SECOND: 205,
  THIRD: 90,
};
const LOTTERY_FAST_SPIN_MS = 2000;
const LOTTERY_FAST_SPIN_ROUNDS = 6;
const LOTTERY_SETTLE_MS = 650;
const UPDATED_ASSET_VERSION = "20260716-1";
const LOTTERY_PAGE_URL = `/assets/figma/figma-lottery-page.webp?v=${UPDATED_ASSET_VERSION}`;
const LOTTERY_WHEEL_URL = `/assets/figma/figma-lottery-wheel.webp?v=${UPDATED_ASSET_VERSION}-centerfix1`;
const LOTTERY_CENTER_URL = `/assets/figma/figma-lottery-center.webp?v=${UPDATED_ASSET_VERSION}`;
const PRIZE_BACKGROUND_URL = `/assets/figma/figma-prize-background.webp?v=${UPDATED_ASSET_VERSION}`;
const LOTTERY_VISUAL_PATHS = [LOTTERY_PAGE_URL, LOTTERY_WHEEL_URL, LOTTERY_CENTER_URL];
const QUIZ_VISUAL_PATHS = [
  "/assets/figma/quiz-web/quiz-question-01.webp",
  "/assets/figma/quiz-web/quiz-question-02.webp",
  "/assets/figma/quiz-web/quiz-question-03.webp",
  "/assets/figma/quiz-web/quiz-question-04.webp",
  `/assets/figma/quiz-web/quiz-question-05.webp?v=${UPDATED_ASSET_VERSION}`,
];
const WAVEFORM_HEIGHTS = [8, 14, 24, 34, 20, 12, 28, 38, 18, 30, 16, 36, 22, 12, 29, 39, 25, 14, 32, 20, 37, 17, 27, 39, 23, 12, 31, 18, 26, 10];
const imagePreloadCache = new Map<string, { image: HTMLImageElement; promise: Promise<void> }>();

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function preloadImage(src: string) {
  const cached = imagePreloadCache.get(src);
  if (cached) return cached.promise;
  const image = new Image();
  const promise = new Promise<void>((resolve, reject) => {
    image.decoding = "async";
    image.onload = () => {
      if (typeof image.decode === "function") {
        void image.decode().then(resolve, resolve);
      } else {
        resolve();
      }
    };
    image.onerror = () => {
      imagePreloadCache.delete(src);
      reject(new Error(`Failed to preload ${src}`));
    };
    image.src = src;
  });
  imagePreloadCache.set(src, { image, promise });
  return promise;
}

function nextWheelRotation(currentRotation: number, prizeLevel: LotteryPrize["prizeLevel"]) {
  const targetRotation = LOTTERY_PRIZE_TARGET_ROTATION[prizeLevel];
  const currentNormalized = ((currentRotation % 360) + 360) % 360;
  const deltaToTarget = (targetRotation - currentNormalized + 360) % 360;
  return currentRotation + (deltaToTarget === 0 ? 360 : deltaToTarget);
}

function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [session, setSession] = useState<SessionState | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<OptionKey[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [resultBackground, setResultBackground] = useState("");
  const [lead, setLead] = useState<LeadFormState>(initialLead);
  const [validation, setValidation] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelSpinMode, setWheelSpinMode] = useState<"idle" | "spinning" | "settling">("idle");
  const [prize, setPrize] = useState<LotteryPrize | null>(null);
  const [posterDataUrl, setPosterDataUrl] = useState("");
  const [posterPreviewOpen, setPosterPreviewOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [resultError, setResultError] = useState(false);
  const [resultLoadingStep, setResultLoadingStep] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(audioEngine.isEnabled);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [legalDocument, setLegalDocument] = useState<LegalDocumentKey | null>(null);
  const [drawReminderOpen, setDrawReminderOpen] = useState(false);
  const selectTimer = useRef<number | null>(null);
  const currentQuestion = QUESTIONS[questionIndex];
  const activeResult = result;
  const weChatBrowser = isWeChatBrowser(window.navigator.userAgent);
  const isFigmaScreen = ["loading", "home", "quiz", "resultLoading", "result", "lead", "lottery", "lotteryResult"].includes(screen);

  useEffect(() => {
    const entryResumeTimers = new Set<number>();
    const clearEntryResumeTimers = () => {
      entryResumeTimers.forEach((timer) => window.clearTimeout(timer));
      entryResumeTimers.clear();
    };
    const scheduleEntryAudioResume = () => {
      clearEntryResumeTimers();
      [0, 500, 2000, 4000].forEach((delay) => {
        const timer = window.setTimeout(() => {
          entryResumeTimers.delete(timer);
          if (document.visibilityState === "visible") {
            void audioEngine.resumeFromWeChatBridge();
          }
        }, delay);
        entryResumeTimers.add(timer);
      });
    };
    const resumeAudio = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-audio-toggle]")) return;
      void audioEngine.resumeFromGesture();
    };
    const resumeWeChatAudio = () => {
      scheduleEntryAudioResume();
    };
    const resumeVisibleAudio = () => {
      if (document.visibilityState === "visible") resumeWeChatAudio();
    };
    const resumePageAudio = () => {
      scheduleEntryAudioResume();
    };
    const unsubscribePlayback = audioEngine.onPlaybackChange((playing) => {
      setAudioEnabled(playing);
      if (playing) clearEntryResumeTimers();
    });
    window.addEventListener("click", resumeAudio);
    window.addEventListener("focus", resumePageAudio);
    window.addEventListener("pageshow", resumePageAudio);
    document.addEventListener("visibilitychange", resumeVisibleAudio);
    document.addEventListener("WeixinJSBridgeReady", resumeWeChatAudio);
    audioEngine.preload();
    scheduleEntryAudioResume();
    return () => {
      clearEntryResumeTimers();
      unsubscribePlayback();
      window.removeEventListener("click", resumeAudio);
      window.removeEventListener("focus", resumePageAudio);
      window.removeEventListener("pageshow", resumePageAudio);
      document.removeEventListener("visibilitychange", resumeVisibleAudio);
      document.removeEventListener("WeixinJSBridgeReady", resumeWeChatAudio);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      QUIZ_VISUAL_PATHS.forEach((src) => {
        void preloadImage(src).catch(() => undefined);
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (screen !== "result" || !activeResult || !resultBackground) return;
    let cancelled = false;
    void generatePoster(activeResult, resultBackground)
      .then((dataUrl) => {
        if (!cancelled) setPosterDataUrl(dataUrl);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [screen, activeResult, resultBackground]);

  useEffect(() => {
    const paths = screen === "lottery"
      ? [PRIZE_BACKGROUND_URL]
      : screen === "quiz" || screen === "resultLoading" || screen === "result" || screen === "lead"
        ? LOTTERY_VISUAL_PATHS
        : [];
    if (paths.length === 0) return;
    const timer = window.setTimeout(() => {
      paths.forEach((src) => {
        void preloadImage(src).catch(() => undefined);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [screen]);

  useEffect(() => {
    let cancelled = false;
    let revealTimer = 0;
    const progressTimer = window.setInterval(() => {
      setLoadingProgress((current) => Math.min(current + 3 + Math.floor(Math.random() * 3), 92));
    }, 140);

    void Promise.all([
      activityApi.createSession(new URLSearchParams(window.location.search).get("channel") ?? "direct"),
      Promise.all([
        preloadImage(`/assets/figma/figma-home-bg.png?v=${UPDATED_ASSET_VERSION}`),
        preloadImage(`/assets/figma/figma-home-title.png?v=${UPDATED_ASSET_VERSION}`),
        preloadImage(`/assets/figma/figma-tata-logo.png?v=${UPDATED_ASSET_VERSION}`),
      ]),
      wait(INITIAL_LOADING_MIN_MS),
    ])
      .then(([nextSession]) => {
        if (cancelled) return;
        window.clearInterval(progressTimer);
        setSession(nextSession);
        setLoadingProgress(100);
        revealTimer = window.setTimeout(() => {
          if (!cancelled) setScreen("home");
        }, 220);
      })
      .catch(() => {
        if (!cancelled) setToast("页面资源加载失败，请刷新后重试");
      });

    return () => {
      cancelled = true;
      window.clearInterval(progressTimer);
      window.clearTimeout(revealTimer);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const leadHint = useMemo(() => {
    if (!activeResult) return "";
    return `${activeResult.title} · ${activeResult.levelDisplay}`;
  }, [activeResult]);

  function startQuiz() {
    void audioEngine.resumeFromGesture();
    audioEngine.play("tap");
    setQuestionIndex(0);
    setAnswers([]);
    setResult(null);
    setResultBackground("");
    setLead(initialLead);
    setPrize(null);
    setPosterDataUrl("");
    setPosterPreviewOpen(false);
    setWheelSpinMode("idle");
    setWheelRotation(0);
    setDrawReminderOpen(false);
    setValidation("");
    setScreen("quiz");
  }

  function handleBackInQuiz() {
    audioEngine.play("tap");
    if (selectTimer.current) window.clearTimeout(selectTimer.current);
    if (questionIndex === 0) {
      setScreen("home");
      return;
    }
    setQuestionIndex((index) => index - 1);
  }

  async function resolveQuizResult(answerSet: OptionKey[], playRevealSound: boolean) {
    const nextResult = await activityApi.submitQuiz(answerSet);
    const nextBackground = pickResultBackground(nextResult.productKey);
    const backgroundReady = preloadImage(nextBackground);
    const titleReady = Promise.all([
      preloadImage(`/assets/figma/result-titles/${nextResult.productKey}.png?v=${UPDATED_ASSET_VERSION}`),
      ...(nextResult.productKey === "level4"
        ? [preloadImage(`/assets/figma/result-titles/level4-white.png?v=${UPDATED_ASSET_VERSION}`)]
        : []),
    ]);

    setResultLoadingStep(1);
    await wait(RESULT_LOADING_STEP_GAP_MS);
    setResultLoadingStep(2);
    await Promise.all([titleReady, wait(RESULT_LOADING_STEP_GAP_MS)]);
    setResultLoadingStep(3);
    await Promise.all([backgroundReady, wait(RESULT_LOADING_STEP_GAP_MS)]);
    setResultLoadingStep(4);
    setResult(nextResult);
    setResultBackground(nextBackground);
    await wait(RESULT_LOADING_REVEAL_MS);
    if (playRevealSound) audioEngine.play("reveal");
    setScreen("result");
  }

  function selectAnswer(answer: OptionKey) {
    audioEngine.play("select");
    const nextAnswers = [...answers];
    nextAnswers[questionIndex] = answer;
    setAnswers(nextAnswers);
    if (selectTimer.current) window.clearTimeout(selectTimer.current);
    selectTimer.current = window.setTimeout(async () => {
      if (questionIndex < QUESTIONS.length - 1) {
        setQuestionIndex((index) => index + 1);
        return;
      }
      setScreen("resultLoading");
      setResultLoadingStep(0);
      setResultError(false);
      audioEngine.play("scan");
      try {
        await resolveQuizResult(nextAnswers, true);
      } catch {
        setResultError(true);
        setToast(H5_COPY.resultLoading.error);
      }
    }, 720);
  }

  async function retryResult() {
    setScreen("resultLoading");
    setResultLoadingStep(0);
    setResultError(false);
    try {
      await resolveQuizResult(answers, false);
    } catch {
      setResultError(true);
      setToast(H5_COPY.resultLoading.error);
    }
  }

  async function downloadPoster() {
    if (!activeResult) return;
    audioEngine.play("tap");
    try {
      const dataUrl = posterDataUrl || await generatePoster(activeResult, resultBackground);
      await downloadDataUrl(dataUrl, `TATA-${activeResult.title}-静音人格海报.png`);
    } catch {
      setToast(H5_COPY.system.posterFailed);
    }
  }

  function validateLead() {
    if (!lead.name.trim()) return H5_COPY.lead.validation.name;
    if (!/^1[3-9]\d{9}$/.test(lead.phone.trim())) return H5_COPY.lead.validation.phone;
    if (!lead.province) return "请选择省份";
    if (!lead.city) return H5_COPY.lead.validation.city;
    if (!lead.privacyConsent) return H5_COPY.lead.validation.privacy;
    return "";
  }

  async function submitLead() {
    audioEngine.play("tap");
    const error = validateLead();
    setValidation(error);
    if (error) return;
    releaseFormFocus();
    setIsSubmittingLead(true);
    try {
      await activityApi.submitLead(lead);
      setScreen("lottery");
      window.requestAnimationFrame(() => window.scrollTo(0, 0));
    } catch {
      setValidation(H5_COPY.lead.validation.submitFailed);
    } finally {
      setIsSubmittingLead(false);
    }
  }

  async function drawLottery() {
    if (isDrawing) return;
    audioEngine.play("spin");
    setIsDrawing(true);
    setWheelSpinMode("spinning");
    setWheelRotation((rotation) => rotation + LOTTERY_FAST_SPIN_ROUNDS * 360);
    const spinStartedAt = Date.now();
    try {
      const nextPrize = await activityApi.drawLottery(`${session?.sessionToken ?? "session"}-${Date.now()}`);
      await wait(Math.max(0, LOTTERY_FAST_SPIN_MS - (Date.now() - spinStartedAt)));
      setPrize(nextPrize);
      setWheelSpinMode("settling");
      setWheelRotation((rotation) => nextWheelRotation(rotation, nextPrize.prizeLevel));
      window.setTimeout(() => {
        audioEngine.play("win");
        setScreen("lotteryResult");
        setIsDrawing(false);
        setWheelSpinMode("idle");
      }, LOTTERY_SETTLE_MS);
    } catch (error) {
      if (error instanceof LotteryRuleError && error.code === "LEAD_REQUIRED") {
        setToast(H5_COPY.system.drawLeadRequired);
      } else if (error instanceof LotteryRuleError && error.code === "ACTIVITY_INACTIVE") {
        setToast(H5_COPY.system.drawInactive);
      } else if (error instanceof LotteryRuleError && error.code === "PHONE_ALREADY_DRAWN") {
        setDrawReminderOpen(true);
      } else {
        setToast(H5_COPY.system.drawFailed);
      }
      setIsDrawing(false);
      setWheelSpinMode("idle");
    }
  }

  async function backHome() {
    audioEngine.play("tap");
    activityApi.clearFlow();
    const nextSession = await activityApi.createSession(new URLSearchParams(window.location.search).get("channel") ?? "direct");
    setSession(nextSession);
    setQuestionIndex(0);
    setAnswers([]);
    setResult(null);
    setLead(initialLead);
    setPrize(null);
    setPosterDataUrl("");
    setPosterPreviewOpen(false);
    setWheelSpinMode("idle");
    setWheelRotation(0);
    setDrawReminderOpen(false);
    setValidation("");
    setScreen("home");
  }

  async function toggleAudio() {
    const enabled = await audioEngine.toggle();
    setAudioEnabled(enabled);
  }

  return (
    <main className="app-shell">
      <div className="ambient-grid" />
      <div className="ambient-beams" />
      <div className={`phone-stage ${isFigmaScreen ? "has-figma-screen" : ""}`}>
        <span className="env-badge">{ACTIVITY_CONFIG.environmentLabel}</span>
        {screen === "loading" && <LoadingScreen progress={loadingProgress} />}
        {screen === "home" && (
          <HomeScreen
            audioEnabled={audioEnabled}
            onAudioToggle={toggleAudio}
            onRules={() => setRulesOpen(true)}
            onStart={startQuiz}
          />
        )}
        {screen === "quiz" && currentQuestion && (
          <QuizScreen
            answer={answers[questionIndex]}
            completedAnswerCount={answers.filter(Boolean).length}
            question={currentQuestion}
            questionIndex={questionIndex}
            onBack={handleBackInQuiz}
            onSelect={selectAnswer}
          />
        )}
        {screen === "resultLoading" && (
          <ResultLoadingScreen completedSteps={resultLoadingStep} hasError={resultError} onBack={() => setScreen("quiz")} onRetry={retryResult} />
        )}
        {screen === "result" && activeResult && (
          <FigmaResultScreen
            result={activeResult}
            background={resultBackground}
            onBack={() => setScreen("quiz")}
            onSaveAndLead={() => {
              if (weChatBrowser) {
                setPosterPreviewOpen(true);
                return;
              }
              void downloadPoster();
              setScreen("lead");
            }}
          />
        )}
        {screen === "lead" && activeResult && (
          <LeadScreen
            hint={leadHint}
            lead={lead}
            validation={validation}
            isSubmitting={isSubmittingLead}
            onBack={() => setScreen("result")}
            onChange={setLead}
            onLegalDocument={setLegalDocument}
            onSubmit={submitLead}
          />
        )}
        {screen === "lottery" && (
          <LotteryScreen
            isDrawing={isDrawing}
            spinMode={wheelSpinMode}
            rotation={wheelRotation}
            onBack={() => setScreen("lead")}
            onDraw={drawLottery}
          />
        )}
        {screen === "lotteryResult" && prize && (
          <LotteryResultScreen prize={prize} onBackHome={backHome} onRules={() => setRulesOpen(true)} />
        )}
        {rulesOpen && <ActivityRulesModal onClose={() => setRulesOpen(false)} />}
        {legalDocument && (
          <LegalDocumentModal documentKey={legalDocument} onClose={() => setLegalDocument(null)} />
        )}
        {drawReminderOpen && <DrawReminderModal onClose={() => setDrawReminderOpen(false)} />}
        {posterPreviewOpen && (
          <WeChatPosterPreview
            dataUrl={posterDataUrl}
            onClose={() => setPosterPreviewOpen(false)}
            onContinue={() => {
              setPosterPreviewOpen(false);
              setScreen("lead");
              window.requestAnimationFrame(() => window.scrollTo(0, 0));
            }}
          />
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function LoadingScreen({ progress }: { progress: number }) {
  return (
    <section className="screen figma-screen figma-loading-screen">
      <img className="figma-bg" src={`/assets/figma/figma-loading-bg.png?v=${UPDATED_ASSET_VERSION}`} alt="" aria-hidden="true" />
      <img className="figma-loading-logo" src="/assets/figma/figma-tata-logo.png" alt={H5_COPY.loading.brand} />
      <Waveform />
      <div className="figma-progress-track">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="figma-loading-percent">{progress}%</p>
      <p className="figma-icp-record">沪 ICP 备 2026033411 号</p>
    </section>
  );
}

function Waveform({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 3);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#c80028";
      const barWidth = 3;
      const gap = 3;
      const waveformWidth = WAVEFORM_HEIGHTS.length * barWidth + (WAVEFORM_HEIGHTS.length - 1) * gap;
      const startX = Math.round((width - waveformWidth) / 2);
      WAVEFORM_HEIGHTS.forEach((maximum, index) => {
        const motion = reduceMotion ? 1 : 0.58 + 0.42 * ((Math.sin(time / 150 + index * 0.72) + 1) / 2);
        const barHeight = Math.max(4, Math.round(maximum * motion));
        context.fillRect(startX + index * (barWidth + gap), Math.round((height - barHeight) / 2), barWidth, barHeight);
      });
      if (!reduceMotion) frame = window.requestAnimationFrame(draw);
    };

    resize();
    draw(0);
    const observer = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(0);
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      context.clearRect(0, 0, width, height);
    };
  }, []);

  return (
    <div className={`figma-waveform ${className}`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}

function HomeScreen({
  audioEnabled,
  onAudioToggle,
  onRules,
  onStart,
}: {
  audioEnabled: boolean;
  onAudioToggle: () => void;
  onRules: () => void;
  onStart: () => void;
}) {
  return (
    <section className="screen figma-screen figma-home-screen">
      <img className="figma-bg" src={`/assets/figma/figma-home-bg.png?v=${UPDATED_ASSET_VERSION}`} alt="" aria-hidden="true" />
      <img className="figma-home-logo" src={`/assets/figma/figma-tata-logo.png?v=${UPDATED_ASSET_VERSION}`} alt={H5_COPY.loading.brand} />
      <div className="figma-home-actions">
        <button
          type="button"
          data-audio-toggle
          onClick={onAudioToggle}
          aria-label={audioEnabled ? "关闭背景音乐" : "开启背景音乐"}
          aria-pressed={audioEnabled}
        >
          {audioEnabled ? <Music2 size={13} /> : <VolumeX size={13} />}
          <span>背景音乐</span>
        </button>
        <button type="button" onClick={onRules}>
          <ScrollText size={13} />
          <span>活动规则</span>
        </button>
      </div>
      <div className="figma-home-copy">
        <div className="figma-home-title-frame">
          <img src={`/assets/figma/figma-home-title.png?v=${UPDATED_ASSET_VERSION}`} alt="测测你的宅家人格 静化到哪一级了" />
        </div>
        <p>5道题，找到你的宅家人格<br />并匹配你所需要的静音等级</p>
      </div>
      <button className="figma-primary-button figma-home-cta" type="button" onClick={onStart}>
        <span>{H5_COPY.home.startButton.replace(/\s*→$/, "")}</span>
        <ChevronRight aria-hidden="true" />
      </button>
      <p className="figma-icp-record">沪 ICP 备 2026033411 号</p>
    </section>
  );
}

function ActivityRulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="rules-backdrop legal-backdrop" role="presentation" onClick={onClose}>
      <button className="rules-close" type="button" onClick={onClose} aria-label="关闭活动规则">
        <X size={20} />
      </button>
      <section
        className="rules-modal legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-rules-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="rules-modal-header legal-modal-header">
          <div>
            <span className="rules-eyebrow">{H5_COPY.rules.brand}</span>
            <h2 id="activity-rules-title">{H5_COPY.rules.title}</h2>
          </div>
        </header>
        <div className="rules-scroll-body legal-scroll-body">
          {H5_COPY.rules.sections.map((section) => (
            <article className="legal-section" key={section.title}>
              <h3>{section.title}</h3>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function LegalDocumentModal({ documentKey, onClose }: { documentKey: LegalDocumentKey; onClose: () => void }) {
  const document = LEGAL_DOCUMENTS[documentKey];
  const titleId = `legal-document-${documentKey}`;

  return (
    <div className="rules-backdrop legal-backdrop" role="presentation" onClick={onClose}>
      <button className="rules-close" type="button" onClick={onClose} aria-label={`关闭${document.title}`}>
        <X size={20} />
      </button>
      <section
        className="rules-modal legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="rules-modal-header legal-modal-header">
          <div>
            <span className="rules-eyebrow">TATA 木门</span>
            <h2 id={titleId}>{document.title}</h2>
          </div>
        </header>
        <div className="rules-scroll-body legal-scroll-body">
          {document.sections.map((section) => (
            <article className="legal-section" key={section.title}>
              <h3>{section.title}</h3>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.items && (
                <ol>
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ol>
              )}
              {section.table && (
                <div className="legal-table-wrap">
                  <table>
                    <thead>
                      <tr>{section.table.headers.map((header) => <th key={header}>{header}</th>)}</tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row) => (
                        <tr key={row.join("-")}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ))}
          {document.effectiveDate && <p className="legal-effective-date">{document.effectiveDate}</p>}
        </div>
      </section>
    </div>
  );
}

function DrawReminderModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="draw-reminder-backdrop" role="presentation" onClick={onClose}>
      <section
        className="draw-reminder-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="draw-reminder-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="draw-reminder-close" type="button" onClick={onClose} aria-label="关闭温馨提醒">
          <X size={18} />
        </button>
        <h2 id="draw-reminder-title">温馨提醒</h2>
        <p>该手机号已参与过抽奖，每个手机号仅有一次抽奖机会。感谢您的参与！</p>
        <button className="draw-reminder-confirm" type="button" onClick={onClose}>我知道了</button>
      </section>
    </div>
  );
}

function QuizScreen({
  answer,
  completedAnswerCount,
  question,
  questionIndex,
  onBack,
  onSelect,
}: {
  answer?: OptionKey;
  completedAnswerCount: number;
  question: (typeof QUESTIONS)[number];
  questionIndex: number;
  onBack: () => void;
  onSelect: (answer: OptionKey) => void;
}) {
  return (
    <section className="screen figma-screen figma-quiz-screen">
      <img className="figma-bg" src="/assets/figma/figma-quiz-bg.png" alt="" aria-hidden="true" />
      <button className="figma-back-button" type="button" onClick={onBack} aria-label="返回">
        <img src={`/assets/figma/figma-back.png?v=${UPDATED_ASSET_VERSION}`} alt="" />
      </button>
      <div className="figma-quiz-count">
        <strong>{String(questionIndex + 1).padStart(2, "0")}</strong>
        <span>/</span><small>05</small>
      </div>
      <div className="figma-quiz-progress" aria-hidden="true">
        <span>{String(questionIndex + 1).padStart(2, "0")}</span>
        <i><b style={{ width: `${(completedAnswerCount / QUESTIONS.length) * 100}%` }} /></i>
        <span>05</span>
      </div>
      <div className="figma-quiz-visual-frame">
        <div className="figma-quiz-photo-shell">
          <img
            className="figma-quiz-visual"
            src={QUIZ_VISUAL_PATHS[questionIndex]}
            alt={`第 ${questionIndex + 1} 题场景`}
            decoding="async"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/assets/figma/figma-quiz-visual.png";
            }}
          />
        </div>
        <span className="figma-quiz-visual-index">{String(questionIndex + 1).padStart(3, "0")}</span>
        <i className="figma-quiz-visual-stripes" aria-hidden="true" />
      </div>
      <h1 className="figma-question-title">{question.title}</h1>
      <div className="figma-option-list">
        {question.options.map((option) => (
          <div className={`figma-option-shell ${answer === option.key ? "is-selected" : ""}`} key={option.key}>
            <button
              className="figma-option-button"
              type="button"
              onClick={() => onSelect(option.key as OptionKey)}
            >
              <strong>{option.key}</strong>
              <span>{option.text}</span>
              <i aria-hidden="true">{answer === option.key ? <Check size={15} strokeWidth={3} /> : null}</i>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultLoadingScreen({ completedSteps, hasError, onBack, onRetry }: { completedSteps: number; hasError: boolean; onBack: () => void; onRetry: () => void }) {
  return (
    <section className="screen figma-screen figma-result-loading-screen">
      <img className="figma-bg" src={`/assets/figma/figma-result-loading-bg.png?v=${UPDATED_ASSET_VERSION}`} alt="" aria-hidden="true" />
      <button className="figma-back-button" type="button" onClick={onBack} aria-label="返回">
        <img src={`/assets/figma/figma-back.png?v=${UPDATED_ASSET_VERSION}`} alt="" />
      </button>
      <img className="figma-result-loading-logo" src={`/assets/figma/figma-tata-logo.png?v=${UPDATED_ASSET_VERSION}`} alt="TATA 木门" />
      <div className="figma-result-loading-copy">
        <small>ANALYZING</small>
        <h1>宅家人格<br /><strong>静化</strong>报告生成中</h1>
      </div>
      <Waveform className="figma-result-waveform" />
      <div className="figma-analysis-panel" aria-label="分析答题数据、识别宅家人格、匹配静音等级、生成专属报告">
        <i className="figma-analysis-dots" aria-hidden="true" />
        <ul>
          {ANALYSIS_STEPS.map((step, index) => (
            <li className={index < completedSteps ? "is-complete" : ""} key={step}>
              <span className="figma-analysis-check" aria-hidden="true" />
              <strong>{step}</strong>
            </li>
          ))}
        </ul>
        <i className="figma-analysis-stripes" aria-hidden="true" />
      </div>
      {hasError && (
        <button className="ghost-action figma-retry" type="button" onClick={onRetry}>
          <RotateCcw size={16} />
          {H5_COPY.resultLoading.retry}
        </button>
      )}
    </section>
  );
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function releaseFormFocus() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  window.scrollTo(0, 0);
}

function getResultBackgroundUrl(productKey: QuizResult["productKey"], index: number) {
  return `/assets/result-backgrounds-web/${productKey}/${index}.webp`;
}

function pickResultBackground(productKey: QuizResult["productKey"]) {
  const storageKey = `tata-result-bg-history-${productKey}`;
  const indexes = Array.from({ length: RESULT_IMAGE_COUNT }, (_, index) => index + 1);
  try {
    const history = JSON.parse(window.localStorage.getItem(storageKey) || "[]") as number[];
    const available = indexes.filter((index) => !history.includes(index));
    const nextIndex = available.length > 0 ? available[0] : indexes[Math.floor(Math.random() * indexes.length)];
    const nextHistory = available.length > 0 ? [...history, nextIndex] : [nextIndex];
    window.localStorage.setItem(storageKey, JSON.stringify(nextHistory.slice(-RESULT_IMAGE_COUNT)));
    return getResultBackgroundUrl(productKey, nextIndex);
  } catch {
    return getResultBackgroundUrl(productKey, Math.floor(Math.random() * RESULT_IMAGE_COUNT) + 1);
  }
}

function FigmaResultScreen({
  result,
  background,
  onBack,
  onSaveAndLead,
}: {
  result: QuizResult;
  background: string;
  onBack: () => void;
  onSaveAndLead: () => void | Promise<void>;
}) {
  const theme = RESULT_THEMES[result.productKey];
  const descriptionLines = result.description.split("\n");
  return (
    <section className="screen figma-screen figma-static-screen figma-result-screen">
      <div
        className="figma-static-canvas figma-result-canvas"
        style={{ "--result-bg": theme.bg, "--result-accent": theme.accent, "--result-button": theme.button, "--result-card-text": theme.cardText } as CSSProperties}
      >
        <img className="figma-result-scene" src={background || getResultBackgroundUrl(result.productKey, 1)} alt="" aria-hidden="true" />
        <button className="figma-back-button figma-result-visible-back" type="button" onClick={onBack} aria-label="返回">
          <img src={`/assets/figma/figma-back.png?v=${UPDATED_ASSET_VERSION}`} alt="" />
        </button>
        {result.productKey === "level4" ? (
          <div
            className="figma-result-title-stack"
            role="img"
            aria-label={`${result.levelName} ${theme.roman}级静音 ${RESULT_LEVEL_VALUES[result.productKey]}`}
          >
            <img
              className="figma-result-title-white"
              src={`/assets/figma/result-titles/level4-white.png?v=${UPDATED_ASSET_VERSION}`}
              alt=""
            />
            <img
              className="figma-result-title-foreground"
              src={`/assets/figma/result-titles/level4.png?v=${UPDATED_ASSET_VERSION}`}
              alt=""
            />
          </div>
        ) : (
          <img
            className="figma-result-title-art"
            src={`/assets/figma/result-titles/${result.productKey}.png?v=${UPDATED_ASSET_VERSION}`}
            alt={`${result.levelName} ${theme.roman}级静音 ${RESULT_LEVEL_VALUES[result.productKey]}`}
          />
        )}
        <article className="figma-dynamic-card">
          <span>静音人格</span>
          <h1>{result.title}</h1>
          <p>
            {descriptionLines.map((line) => (
              <span className="figma-result-description-line" key={line}>{line}</span>
            ))}
          </p>
        </article>
        <button className="figma-hit-area figma-result-save-hit" type="button" onClick={() => void onSaveAndLead()}>
          <span>点击保存</span>
        </button>
      </div>
    </section>
  );
}

function WeChatPosterPreview({
  dataUrl,
  onClose,
  onContinue,
}: {
  dataUrl: string;
  onClose: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="wechat-poster-backdrop" role="presentation">
      <section className="wechat-poster-dialog" role="dialog" aria-modal="true" aria-labelledby="wechat-poster-title">
        <button className="wechat-poster-close" type="button" onClick={onClose} aria-label="关闭海报">
          <X size={20} />
        </button>
        <div className="wechat-poster-heading">
          <h2 id="wechat-poster-title">长按保存专属海报</h2>
          <p>长按下方海报，选择“保存到手机”</p>
        </div>
        <div className="wechat-poster-image">
          {dataUrl ? <img src={dataUrl} alt="静音人格海报" /> : <span>专属海报生成中...</span>}
        </div>
        <button className="wechat-poster-continue" type="button" onClick={onContinue}>
          我已保存，开始抽奖
        </button>
      </section>
    </div>
  );
}

function LotteryScreen({
  isDrawing,
  spinMode,
  rotation,
  onBack,
  onDraw,
}: {
  isDrawing: boolean;
  spinMode: "idle" | "spinning" | "settling";
  rotation: number;
  onBack: () => void;
  onDraw: () => void;
}) {
  return (
    <section className="screen figma-screen figma-static-screen figma-lottery-screen">
      <div className="figma-static-canvas">
        <img className="figma-static-art" src={LOTTERY_PAGE_URL} alt="" aria-hidden="true" />
        <button className="figma-hit-area figma-lottery-back-hit" type="button" onClick={onBack} aria-label="返回">
          <img src={`/assets/figma/figma-back.png?v=${UPDATED_ASSET_VERSION}`} alt="" />
        </button>
        <div className="figma-lottery-title">
          <h1>点击抽奖</h1>
          <strong>获取您的美好人居大奖</strong>
        </div>
        <div
          className={`figma-lottery-wheel is-${spinMode}`}
          style={{ "--wheel-rotation": `${rotation}deg` } as CSSProperties}
          aria-hidden="true"
        >
          <img src={LOTTERY_WHEEL_URL} alt="" />
        </div>
        <div className="figma-lottery-pointer" aria-hidden="true" />
        <button className="figma-lottery-draw-hit" disabled={isDrawing} type="button" onClick={onDraw}>
          <img src={LOTTERY_CENTER_URL} alt="" aria-hidden="true" />
          <span className="sr-only">{H5_COPY.lottery.button}</span>
        </button>
      </div>
    </section>
  );
}

function LeadScreen({
  hint,
  lead,
  validation,
  isSubmitting,
  onBack,
  onChange,
  onLegalDocument,
  onSubmit,
}: {
  hint: string;
  lead: LeadFormState;
  validation: string;
  isSubmitting: boolean;
  onBack: () => void;
  onChange: (lead: LeadFormState) => void;
  onLegalDocument: (document: LegalDocumentKey) => void;
  onSubmit: () => void;
}) {
  const provinceCities = ACTIVITY_CONFIG.provinceCities;
  const selectedProvince = provinceCities.find((item) => item.province === lead.province);
  const cities = selectedProvince?.cities ?? [];

  return (
    <section className="screen figma-screen figma-lead-screen" data-result-hint={hint}>
      <img className="figma-bg" src="/assets/figma/figma-lead-bg.png" alt="" aria-hidden="true" />
      <button className="figma-back-button" type="button" onClick={onBack} aria-label="返回">
        <img src={`/assets/figma/figma-back.png?v=${UPDATED_ASSET_VERSION}`} alt="" />
      </button>
      <div className="figma-lead-card">
        <div className="figma-lead-intro">
          <p>TATA 木门深度参编行业标准《室内木质隔声门》LY/T3134-2019，依托专业隔声数值，建立四级静音分级体系，完整覆盖茶室、书房、卧室、电竞房等全生活场景。</p>
          <strong>填写您的基础信息，参与抽奖，即可获得美好人居<span>大奖</span></strong>
        </div>
        <div className="figma-form-stack">
          <Field label={H5_COPY.lead.fields.name.label}>
            <input
              value={lead.name}
              placeholder={H5_COPY.lead.fields.name.placeholder}
              onChange={(event) => onChange({ ...lead, name: event.target.value })}
            />
          </Field>
          <Field label={H5_COPY.lead.fields.phone.label}>
            <input
              inputMode="numeric"
              maxLength={11}
              value={lead.phone}
              placeholder={H5_COPY.lead.fields.phone.placeholder}
              onChange={(event) => onChange({ ...lead, phone: event.target.value.replace(/\D/g, "") })}
            />
          </Field>
          <div className="figma-location-grid">
            <Field label="省份">
              <div className="select-wrap">
                <select
                  value={lead.province}
                  onChange={(event) => onChange({ ...lead, province: event.target.value, city: "" })}
                  required
                >
                  <option value="">请选择省份</option>
                  {provinceCities.map((item) => (
                    <option value={item.province} key={item.province}>
                      {item.province}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} />
              </div>
            </Field>
            <Field label={H5_COPY.lead.fields.city.label}>
              <div className="select-wrap">
                <select
                  value={lead.city}
                  onChange={(event) => onChange({ ...lead, city: event.target.value })}
                  disabled={!lead.province}
                  required
                >
                  <option value="">{H5_COPY.lead.fields.city.placeholder}</option>
                  {cities.map((city) => (
                    <option value={city} key={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <ChevronDown size={18} />
              </div>
            </Field>
          </div>
        </div>
        <label className="figma-privacy-row">
          <input
            type="checkbox"
            checked={lead.privacyConsent}
            onChange={(event) => onChange({ ...lead, privacyConsent: event.target.checked })}
          />
          <span>
            我已阅读并同意
            <button
              className="figma-rules-link"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onLegalDocument("privacy");
              }}
            >
              《隐私政策》
            </button>
            和
            <button
              className="figma-rules-link"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onLegalDocument("authorization");
              }}
            >
              《个人信息处理授权书》
            </button>
            ，授权 TATA 木门处理我的个人信息，用于提供定制化服务及后续联系。
          </span>
        </label>
        {validation && <p className="validation-message">{validation}</p>}
        <button className="figma-submit-button" disabled={!lead.privacyConsent || isSubmitting} type="button" onClick={onSubmit}>
          <span>{H5_COPY.lead.submit}</span>
        </button>
      </div>
    </section>
  );
}

function LotteryResultScreen({
  prize,
  onBackHome,
  onRules,
}: {
  prize: LotteryPrize;
  onBackHome: () => void;
  onRules: () => void;
}) {
  const couponFontSize = prize.couponCode.length > 18 ? "20px" : "34px";
  return (
    <section className="screen figma-screen figma-static-screen figma-lottery-result-screen">
      <div className="figma-static-canvas">
        <img className="figma-static-art" src={PRIZE_BACKGROUND_URL} alt="" aria-hidden="true" />
        <button className="figma-back-button figma-prize-visible-back" type="button" onClick={onBackHome} aria-label="返回首页">
          <img src={`/assets/figma/figma-back.png?v=${UPDATED_ASSET_VERSION}`} alt="" />
        </button>
        <div className="figma-prize-result-title">
          <p>恭喜您获得</p>
          <h1>{prize.prizeName}</h1>
        </div>
        <div className="figma-coupon-card">
          <span>奖品兑换码</span>
          <strong style={{ fontSize: couponFontSize }}>{prize.couponCode}</strong>
        </div>
        <p className="figma-coupon-tip">
          请截图保存您的代金券<br />
          2026年7月23日-2026年8月31日期间<br />
          可至全国门店签约后核销兑换<br />
          礼品以门店设置为准，详情请查看
          <button type="button" onClick={onRules}>活动规则</button>
        </p>
        <button className="figma-hit-area figma-prize-home-hit" type="button" onClick={onBackHome}>
          <span>返回首页</span>
        </button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default App;
