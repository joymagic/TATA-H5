import {
  Check,
  ChevronDown,
  Music,
  Music2,
  RotateCcw,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ACTIVITY_CONFIG, H5_COPY, QUESTIONS } from "@tata/shared-config";
import { audioEngine } from "./lib/audio";
import { generatePoster } from "./lib/poster";
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
const RESULT_LOADING_MIN_MS = 2400;
const RESULT_IMAGE_COUNT = 4;
const RESULT_LEVEL_VALUES = {
  level1: "隔声量20(dB)≤Rw+C<25(dB)",
  level2: "隔声量25(dB)≤Rw+C<30(dB)",
  level3: "隔声量30(dB)≤Rw+C<35(dB)",
  level4: "隔声量Rw+C≥35(dB)",
} as const;
const RESULT_THEMES = {
  level1: { bg: "#d6b36d", accent: "#956a3f", button: "#f1dbb1", roman: "Ⅰ" },
  level2: { bg: "#c18be4", accent: "#4b2b7c", button: "#c18be4", roman: "Ⅱ" },
  level3: { bg: "#bed8c7", accent: "#203c36", button: "#d5efd9", roman: "Ⅲ" },
  level4: { bg: "#b9d8ef", accent: "#1a75b4", button: "#b9d8ef", roman: "Ⅳ" },
} as const;

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
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
  const [prize, setPrize] = useState<LotteryPrize | null>(null);
  const [posterDataUrl, setPosterDataUrl] = useState("");
  const [toast, setToast] = useState("");
  const [resultError, setResultError] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const selectTimer = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLoadingProgress((current) => {
        const next = Math.min(current + Math.ceil(Math.random() * 14), 100);
        if (next >= 100) {
          window.clearInterval(timer);
          window.setTimeout(async () => {
            const nextSession = await activityApi.createSession(new URLSearchParams(window.location.search).get("channel") ?? "direct");
            setSession(nextSession);
            setScreen("home");
          }, 260);
        }
        return next;
      });
    }, 140);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const currentQuestion = QUESTIONS[questionIndex];
  const activeResult = result;
  const isFigmaScreen = ["loading", "home", "quiz", "resultLoading", "result", "lead", "lottery", "lotteryResult"].includes(screen);

  const leadHint = useMemo(() => {
    if (!activeResult) return "";
    return `${activeResult.title} · ${activeResult.levelDisplay}`;
  }, [activeResult]);

  async function startQuiz() {
    await audioEngine.resumeFromGesture();
    audioEngine.play("tap");
    setQuestionIndex(0);
    setAnswers([]);
    setResult(null);
    setResultBackground("");
    setLead(initialLead);
    setPrize(null);
    setPosterDataUrl("");
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
      setResultError(false);
      audioEngine.play("scan");
      const loadingStartedAt = Date.now();
      try {
        const nextResult = await activityApi.submitQuiz(nextAnswers);
        await wait(Math.max(0, RESULT_LOADING_MIN_MS - (Date.now() - loadingStartedAt)));
        setResult(nextResult);
        setResultBackground(pickResultBackground(nextResult.productKey));
        audioEngine.play("reveal");
        setScreen("result");
      } catch {
        await wait(Math.max(0, RESULT_LOADING_MIN_MS - (Date.now() - loadingStartedAt)));
        setResultError(true);
        setToast(H5_COPY.resultLoading.error);
      }
    }, 720);
  }

  async function retryResult() {
    setScreen("resultLoading");
    setResultError(false);
    const loadingStartedAt = Date.now();
    try {
      const nextResult = await activityApi.submitQuiz(answers);
      await wait(Math.max(0, RESULT_LOADING_MIN_MS - (Date.now() - loadingStartedAt)));
      setResult(nextResult);
      setResultBackground(pickResultBackground(nextResult.productKey));
      setScreen("result");
    } catch {
      await wait(Math.max(0, RESULT_LOADING_MIN_MS - (Date.now() - loadingStartedAt)));
      setResultError(true);
      setToast(H5_COPY.resultLoading.error);
    }
  }

  async function downloadPoster() {
    if (!activeResult) return;
    audioEngine.play("tap");
    try {
      const dataUrl = await generatePoster(activeResult, resultBackground);
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
    setIsSubmittingLead(true);
    try {
      await activityApi.submitLead(lead);
      setScreen("lottery");
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
    try {
      const nextPrize = await activityApi.drawLottery(`${session?.sessionToken ?? "session"}-${Date.now()}`);
      setPrize(nextPrize);
      window.setTimeout(() => {
        audioEngine.play("win");
        setScreen("lotteryResult");
        setIsDrawing(false);
      }, 900);
    } catch (error) {
      if (error instanceof LotteryRuleError && error.code === "LEAD_REQUIRED") {
        setToast(H5_COPY.system.drawLeadRequired);
      } else if (error instanceof LotteryRuleError && error.code === "ACTIVITY_INACTIVE") {
        setToast(H5_COPY.system.drawInactive);
      } else {
        setToast(H5_COPY.system.drawFailed);
      }
      setIsDrawing(false);
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
            question={currentQuestion}
            questionIndex={questionIndex}
            onBack={handleBackInQuiz}
            onSelect={selectAnswer}
          />
        )}
        {screen === "resultLoading" && (
          <ResultLoadingScreen hasError={resultError} onBack={() => setScreen("quiz")} onRetry={retryResult} />
        )}
        {screen === "result" && activeResult && (
          <FigmaResultScreen
            result={activeResult}
            background={resultBackground}
            onBack={() => setScreen("quiz")}
            onSaveAndLead={async () => {
              await downloadPoster();
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
            onSubmit={submitLead}
          />
        )}
        {screen === "lottery" && (
          <LotteryScreen
            isDrawing={isDrawing}
            onBack={() => setScreen("lead")}
            onDraw={drawLottery}
          />
        )}
        {screen === "lotteryResult" && prize && <LotteryResultScreen prize={prize} onBackHome={backHome} />}
        {rulesOpen && <ActivityRulesModal onClose={() => setRulesOpen(false)} />}
      </div>
      {posterDataUrl && (
        <div className="poster-modal" role="dialog" aria-modal="true" onClick={() => setPosterDataUrl("")}>
          <img src={posterDataUrl} alt="静音人格海报" />
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function LoadingScreen({ progress }: { progress: number }) {
  return (
    <section className="screen figma-screen figma-loading-screen">
      <img className="figma-bg" src="/assets/figma/figma-loading-bg.png" alt="" aria-hidden="true" />
      <img className="figma-loading-logo" src="/assets/figma/figma-tata-logo.png" alt={H5_COPY.loading.brand} />
      <div className="figma-waveform" aria-hidden="true">
        {Array.from({ length: 30 }).map((_, index) => (
          <i key={index} style={{ height: `${5 + ((index * 11) % 34)}px` }} />
        ))}
      </div>
      <div className="figma-progress-track">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="figma-loading-percent">{progress}%</p>
    </section>
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
      <img className="figma-bg" src="/assets/figma/figma-home-bg.png" alt="" aria-hidden="true" />
      <img className="figma-home-logo" src="/assets/figma/figma-tata-logo.png" alt={H5_COPY.loading.brand} />
      <div className="figma-home-actions">
        <button type="button" onClick={onAudioToggle} aria-label="背景音乐开关">
          {audioEnabled ? <Music2 size={13} /> : <VolumeX size={13} />}
          <span>背景音乐</span>
        </button>
        <button type="button" onClick={onRules}>
          <Music size={13} />
          <span>活动规则</span>
        </button>
      </div>
      <div className="figma-home-copy">
        <h1>
          测测你的<span>宅家人格</span>
          <br />
          <strong>静化</strong>到哪一级了
        </h1>
        <p>5道题，找到你的宅家人格<br />并匹配你所需要的静音等级</p>
      </div>
      <button className="figma-primary-button figma-home-cta" type="button" onClick={onStart}>
        <span>{H5_COPY.home.startButton.replace(/\s*→$/, "")}</span>
        <b aria-hidden="true">›</b>
      </button>
    </section>
  );
}

function ActivityRulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="rules-backdrop" role="presentation" onClick={onClose}>
      <section
        className="rules-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-rules-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="rules-modal-header">
          <div>
            <span className="rules-eyebrow">{H5_COPY.rules.brand}</span>
            <h2 id="activity-rules-title">{H5_COPY.rules.title}</h2>
          </div>
          <button className="rules-close" type="button" onClick={onClose} aria-label="关闭活动规则">
            <X size={18} />
          </button>
        </header>
        <div className="rules-list">
          {H5_COPY.rules.sections.map((section, index) => (
            <article className="rules-item" key={section.title}>
              <span className="rules-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{section.title}</strong>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuizScreen({
  answer,
  question,
  questionIndex,
  onBack,
  onSelect,
}: {
  answer?: OptionKey;
  question: (typeof QUESTIONS)[number];
  questionIndex: number;
  onBack: () => void;
  onSelect: (answer: OptionKey) => void;
}) {
  return (
    <section className="screen figma-screen figma-quiz-screen">
      <img className="figma-bg" src="/assets/figma/figma-quiz-bg.png" alt="" aria-hidden="true" />
      <button className="figma-back-button" type="button" onClick={onBack} aria-label="返回">
        <img src="/assets/figma/figma-back.png" alt="" />
      </button>
      <div className="figma-quiz-count">
        <strong>{String(questionIndex + 1).padStart(2, "0")}</strong>
        <span>/</span><small>05</small>
      </div>
      <div className="figma-quiz-progress" aria-hidden="true">
        <span>{String(questionIndex + 1).padStart(2, "0")}</span>
        <i><b style={{ width: `${((questionIndex + 1) / QUESTIONS.length) * 100}%` }} /></i>
        <span>05</span>
      </div>
      <img className="figma-quiz-visual" src="/assets/figma/figma-quiz-visual.png" alt="居家静音场景" />
      <h1 className="figma-question-title">{question.title}</h1>
      <div className="figma-option-list">
        {question.options.map((option) => (
          <button
            key={option.key}
            className={`figma-option-button ${answer === option.key ? "is-selected" : ""}`}
            type="button"
            onClick={() => onSelect(option.key as OptionKey)}
          >
            <strong>{option.key}</strong>
            <span>{option.text}</span>
            <i aria-hidden="true">{answer === option.key ? <Check size={15} strokeWidth={3} /> : null}</i>
          </button>
        ))}
      </div>
    </section>
  );
}

function ResultLoadingScreen({ hasError, onBack, onRetry }: { hasError: boolean; onBack: () => void; onRetry: () => void }) {
  return (
    <section className="screen figma-screen figma-result-loading-screen">
      <img className="figma-bg" src="/assets/figma/figma-result-loading-bg.png" alt="" aria-hidden="true" />
      <button className="figma-back-button" type="button" onClick={onBack} aria-label="返回">
        <img src="/assets/figma/figma-back.png" alt="" />
      </button>
      <div className="figma-result-loading-copy">
        <small>ANALYZING</small>
        <h1>宅家人格<br /><strong>静化</strong>报告生成中</h1>
      </div>
      <div className="figma-waveform figma-result-waveform" aria-hidden="true">
        {Array.from({ length: 30 }).map((_, index) => <i key={index} style={{ height: `${5 + ((index * 11) % 34)}px` }} />)}
      </div>
      <div className="figma-analysis-panel" aria-label="分析答题数据、识别宅家人格、匹配静音等级、生成专属报告">
        <i className="figma-analysis-dots" aria-hidden="true" />
        <ul>
          {ANALYSIS_STEPS.map((step, index) => (
            <li key={step} style={{ "--step-delay": `${160 + index * 300}ms` } as CSSProperties}>
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

async function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function getResultBackgroundUrl(productKey: QuizResult["productKey"], index: number) {
  return `/assets/result-backgrounds/${productKey}/${index}.png`;
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

function formatResultDescription(result: QuizResult) {
  const roman = RESULT_THEMES[result.productKey].roman;
  return result.description
    .replace("IV级", `${roman}级`)
    .replace("III级", `${roman}级`)
    .replace("II级", `${roman}级`)
    .replace("I级", `${roman}级`);
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
  return (
    <section className="screen figma-screen figma-static-screen figma-result-screen">
      <div
        className="figma-static-canvas figma-result-canvas"
        style={{ "--result-bg": theme.bg, "--result-accent": theme.accent, "--result-button": theme.button } as CSSProperties}
      >
        <img className="figma-result-scene" src={background || getResultBackgroundUrl(result.productKey, 1)} alt="" aria-hidden="true" />
        <button className="figma-back-button figma-result-visible-back" type="button" onClick={onBack} aria-label="返回">
          <img src="/assets/figma/figma-back.png" alt="" />
        </button>
        <div className="figma-dynamic-level">
          <span aria-hidden="true" />
          <strong>{result.levelName}</strong>
          <em>{theme.roman}级静音</em>
          <small>{RESULT_LEVEL_VALUES[result.productKey]}</small>
        </div>
        <article className="figma-dynamic-card">
          <span>静音人格</span>
          <h1>{result.title}</h1>
          <p>{formatResultDescription(result)}</p>
        </article>
        <button className="figma-hit-area figma-result-save-hit" type="button" onClick={() => void onSaveAndLead()}>
          点击保存并开始抽奖
        </button>
      </div>
    </section>
  );
}

function LotteryScreen({
  isDrawing,
  onBack,
  onDraw,
}: {
  isDrawing: boolean;
  onBack: () => void;
  onDraw: () => void;
}) {
  return (
    <section className="screen figma-screen figma-static-screen figma-lottery-screen">
      <div className="figma-static-canvas">
        <img className="figma-static-art" src="/assets/figma/lottery.png" alt="点击抽奖，获取您的美好人居大奖" />
        <button className="figma-hit-area figma-lottery-back-hit" type="button" onClick={onBack} aria-label="返回" />
        <button className="figma-hit-area figma-lottery-draw-hit" disabled={isDrawing} type="button" onClick={onDraw}>
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
  onSubmit,
}: {
  hint: string;
  lead: LeadFormState;
  validation: string;
  isSubmitting: boolean;
  onBack: () => void;
  onChange: (lead: LeadFormState) => void;
  onSubmit: () => void;
}) {
  const provinceCities = ACTIVITY_CONFIG.provinceCities;
  const selectedProvince = provinceCities.find((item) => item.province === lead.province);
  const cities = selectedProvince?.cities ?? [];

  return (
    <section className="screen figma-screen figma-lead-screen" data-result-hint={hint}>
      <img className="figma-bg" src="/assets/figma/figma-lead-bg.png" alt="" aria-hidden="true" />
      <button className="figma-back-button" type="button" onClick={onBack} aria-label="返回">
        <img src="/assets/figma/figma-back.png" alt="" />
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
          <span>{H5_COPY.lead.privacy}</span>
        </label>
        {validation && <p className="validation-message">{validation}</p>}
        <button className="figma-submit-button" disabled={!lead.privacyConsent || isSubmitting} type="button" onClick={onSubmit}>
          {H5_COPY.lead.submit}
        </button>
      </div>
    </section>
  );
}

function LotteryResultScreen({ prize, onBackHome }: { prize: LotteryPrize; onBackHome: () => void }) {
  return (
    <section className="screen figma-screen figma-static-screen figma-lottery-result-screen">
      <div className="figma-static-canvas">
        <img className="figma-static-art" src="/assets/figma/prize.png" alt="" aria-hidden="true" />
        <button className="figma-hit-area figma-prize-back-hit" type="button" onClick={onBackHome} aria-label="返回首页" />
        <div className="figma-prize-text-mask" aria-hidden="true" />
        <div className="figma-prize-result-title">
          <p>恭喜您获得</p>
          <h1>{prize.prizeName}</h1>
        </div>
        <div className="figma-coupon-code">
          <span>奖品兑换码：</span>
          <strong>{prize.couponCode}</strong>
        </div>
        <p className="figma-coupon-tip">截图保存您的代金券<br />可至全国门店签约后核销兑换<br />礼品以门店设置为准</p>
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
