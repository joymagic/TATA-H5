import {
  ArrowDownToLine,
  ArrowLeft,
  Check,
  ChevronDown,
  MessageCircle,
  Music,
  Music2,
  RotateCcw,
  Share2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ACTIVITY_CONFIG, ASSETS, H5_COPY, QUESTIONS } from "@tata/shared-config";
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
const FIGMA_LEVEL1_RESULT_ASSETS = {
  teaRoom: "https://www.figma.com/api/mcp/asset/06b71b6d-5d46-4a7d-bf91-4011436303c5",
  mask: "https://www.figma.com/api/mcp/asset/ea1d6d60-bc83-4a2d-bd40-947a696eac08",
  title: "https://www.figma.com/api/mcp/asset/e1a613b3-cb2b-4094-a011-cc973a4c3d77",
};

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
  const [lead, setLead] = useState<LeadFormState>(initialLead);
  const [validation, setValidation] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [prize, setPrize] = useState<LotteryPrize | null>(null);
  const [posterDataUrl, setPosterDataUrl] = useState("");
  const [toast, setToast] = useState("");
  const [resultError, setResultError] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
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
  const isFigmaLevel1Result = screen === "result" && activeResult?.id === "level1";
  const isFigmaScreen = ["loading", "home", "quiz", "resultLoading", "lead"].includes(screen) || isFigmaLevel1Result;

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
      setScreen("result");
    } catch {
      await wait(Math.max(0, RESULT_LOADING_MIN_MS - (Date.now() - loadingStartedAt)));
      setResultError(true);
      setToast(H5_COPY.resultLoading.error);
    }
  }

  async function handlePosterSave() {
    if (!activeResult) return;
    audioEngine.play("tap");
    try {
      const dataUrl = await generatePoster(activeResult);
      setPosterDataUrl(dataUrl);
      setToast(H5_COPY.system.posterReady);
    } catch {
      setToast(H5_COPY.system.posterFailed);
    }
  }

  async function downloadPoster() {
    if (!activeResult) return;
    audioEngine.play("tap");
    try {
      const dataUrl = await generatePoster(activeResult);
      await downloadDataUrl(dataUrl, `TATA-${activeResult.title}-静音人格海报.png`);
    } catch {
      setToast(H5_COPY.system.posterFailed);
    }
  }

  function handleShareClick() {
    audioEngine.play("tap");
    setToast(H5_COPY.system.shareInWechat);
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
    setWheelRotation((rotation) => rotation + 1440 + 45);
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
          activeResult.id === "level1" ? (
            <FigmaLevel1ResultScreen
              result={activeResult}
              onBack={() => setScreen("quiz")}
              onSaveAndLead={async () => {
                await downloadPoster();
                setScreen("lead");
              }}
            />
          ) : (
            <ResultScreen
              result={activeResult}
              onLead={() => {
                audioEngine.play("tap");
                setScreen("lead");
              }}
              onPoster={handlePosterSave}
              onShare={handleShareClick}
            />
          )
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
            rotation={wheelRotation}
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

function ResultScreen({
  result,
  onLead,
  onPoster,
  onShare,
}: {
  result: QuizResult;
  onLead: () => void;
  onPoster: () => void;
  onShare: () => void;
}) {
  return (
    <section className="screen result-screen">
      <BrandHeader />
      <div className="result-hero">
        <div className="level-tag">{result.levelDisplay}</div>
        <h1>{result.title}</h1>
        <p>{result.description}</p>
        <div className="result-scene-card" aria-hidden="true">
          <img src={ASSETS.products[result.productKey]} alt="" aria-hidden="true" />
          <span className="result-wave" aria-hidden="true" />
        </div>
      </div>
      <div className="sound-value">
        <span>{result.scene}</span>
        <strong>{result.levelName}</strong>
      </div>
      <PrimaryButton onClick={onLead}>{H5_COPY.result.cta}</PrimaryButton>
      <div className="share-row">
        <ShareButton icon={<ArrowDownToLine size={22} />} label={H5_COPY.result.shareButtons[0]} onClick={onPoster} />
        <ShareButton icon={<Share2 size={22} />} label={H5_COPY.result.shareButtons[1]} onClick={onShare} />
        <ShareButton icon={<MessageCircle size={22} />} label={H5_COPY.result.shareButtons[2]} onClick={onShare} />
      </div>
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

function FigmaLevel1ResultScreen({
  result,
  onBack,
  onSaveAndLead,
}: {
  result: QuizResult;
  onBack: () => void;
  onSaveAndLead: () => void | Promise<void>;
}) {
  return (
    <section className="screen figma-screen figma-level1-result-screen" data-node-id="2004:2714">
      <div className="figma-level1-result-photo" data-node-id="2004:2716" aria-hidden="true">
        <img src={FIGMA_LEVEL1_RESULT_ASSETS.teaRoom} alt="" />
      </div>
      <img className="figma-level1-result-mask" src={FIGMA_LEVEL1_RESULT_ASSETS.mask} alt="" aria-hidden="true" />
      <button className="figma-back-button figma-result-back-button" type="button" onClick={onBack} aria-label="返回">
        <img src="/assets/figma/figma-back.png" alt="" />
      </button>
      <div className="figma-level1-result-title" aria-label={`${result.levelName}，${result.levelDisplay}`}>
        <img src={FIGMA_LEVEL1_RESULT_ASSETS.title} alt="" aria-hidden="true" />
      </div>
      <button className="figma-result-save-button" type="button" onClick={() => void onSaveAndLead()}>
        <span>点击保存并开始抽奖</span>
      </button>
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

function LotteryScreen({
  isDrawing,
  rotation,
  onBack,
  onDraw,
}: {
  isDrawing: boolean;
  rotation: number;
  onBack: () => void;
  onDraw: () => void;
}) {
  return (
    <section className="screen lottery-screen">
      <button className="back-button" type="button" onClick={onBack} aria-label="返回">
        <ArrowLeft size={20} />
      </button>
      <p className="lottery-limit">{H5_COPY.lottery.limitTip}</p>
      <div className="wheel-wrap">
        <div className="wheel" style={{ transform: `rotate(${rotation}deg)` }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <i key={index} style={{ transform: `rotate(${index * 45}deg)` }} />
          ))}
        </div>
        <button className="wheel-button" disabled={isDrawing} type="button" onClick={onDraw}>
          {H5_COPY.lottery.button}
        </button>
      </div>
    </section>
  );
}

function LotteryResultScreen({ prize, onBackHome }: { prize: LotteryPrize; onBackHome: () => void }) {
  return (
    <section className="screen lottery-result-screen">
      <div className="result-prize-title">
        <h1>{H5_COPY.lotteryResult.resultLabel}</h1>
      </div>
      <div className="ticket-card">
        <div className="ticket-amount">{prize.prizeName}</div>
        <div className="coupon-box">
          <span>奖券券码</span>
          <strong>{prize.couponCode}</strong>
        </div>
      </div>
      <p className="coupon-tip">{H5_COPY.lotteryResult.couponTip}</p>
      <PrimaryButton onClick={onBackHome}>{H5_COPY.lotteryResult.backHome}</PrimaryButton>
    </section>
  );
}

function BrandHeader() {
  return (
    <header className="brand-header">
      <img src={ASSETS.logo} alt={H5_COPY.loading.brand} />
    </header>
  );
}

function PrimaryButton({
  children,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button className="primary-button" disabled={disabled} type="button" onClick={onClick}>
      <span>{children}</span>
    </button>
  );
}

function ShareButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="share-button" type="button" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
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
