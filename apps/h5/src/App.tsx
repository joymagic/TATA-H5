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
import { useEffect, useMemo, useRef, useState } from "react";
import { ACTIVITY_CONFIG, ASSETS, H5_COPY, QUESTIONS } from "@tata/shared-config";
import { audioEngine } from "./lib/audio";
import { generatePoster } from "./lib/poster";
import { LotteryRuleError, mockApi } from "./services/mockApi";
import type { LeadFormState, LotteryPrize, OptionKey, QuizResult, Screen, SessionState } from "./types";

const initialLead: LeadFormState = {
  name: "",
  phone: "",
  city: "",
  privacyConsent: false,
};

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
            const nextSession = await mockApi.createSession(new URLSearchParams(window.location.search).get("channel") ?? "direct");
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
      try {
        const nextResult = await mockApi.submitQuiz(nextAnswers);
        setResult(nextResult);
        audioEngine.play("reveal");
        setScreen("result");
      } catch {
        setResultError(true);
        setToast(H5_COPY.resultLoading.error);
      }
    }, 380);
  }

  async function retryResult() {
    setScreen("resultLoading");
    setResultError(false);
    try {
      const nextResult = await mockApi.submitQuiz(answers);
      setResult(nextResult);
      setScreen("result");
    } catch {
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

  function handleShareClick() {
    audioEngine.play("tap");
    setToast(H5_COPY.system.shareInWechat);
  }

  function validateLead() {
    if (!lead.name.trim()) return H5_COPY.lead.validation.name;
    if (!/^1[3-9]\d{9}$/.test(lead.phone.trim())) return H5_COPY.lead.validation.phone;
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
      await mockApi.submitLead(lead);
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
      const nextPrize = await mockApi.drawLottery(`${session?.sessionToken ?? "session"}-${Date.now()}`);
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
    mockApi.clearFlow();
    const nextSession = await mockApi.createSession(new URLSearchParams(window.location.search).get("channel") ?? "direct");
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
      <div className="phone-stage">
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
        {screen === "resultLoading" && <ResultLoadingScreen hasError={resultError} onRetry={retryResult} />}
        {screen === "result" && activeResult && (
          <ResultScreen
            result={activeResult}
            onLead={() => {
              audioEngine.play("tap");
              setScreen("lead");
            }}
            onPoster={handlePosterSave}
            onShare={handleShareClick}
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
    <section className="screen loading-screen">
      <BrandHeader />
      <div className="loading-orbit" aria-hidden="true">
        <div className="quiet-door loading-door">
          <div className="door-inner">TATA</div>
        </div>
      </div>
      <div className="progress-track">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="loading-percent">加载中 {progress}%</p>
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
    <section className="screen home-screen">
      <BrandHeader />
      <button className="rules-button" type="button" onClick={onRules}>
        活动规则
      </button>
      <button className="icon-button music-button" type="button" onClick={onAudioToggle} aria-label="音乐开关">
        {audioEnabled ? <Music2 size={20} /> : <VolumeX size={20} />}
      </button>
      <div className="home-scene">
        <img className="home-kv" src={ASSETS.silentSpaceHero} alt="" aria-hidden="true" />
        <img className="silent-day-mark" src={ASSETS.silentDayIcon} alt="" aria-hidden="true" />
      </div>
      <div className="hero-title">
        <span>{H5_COPY.home.titleLines[0]}</span>
        <strong>{H5_COPY.home.titleLines[1]}</strong>
      </div>
      <PrimaryButton onClick={onStart}>{H5_COPY.home.startButton}</PrimaryButton>
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
            <span className="rules-eyebrow">TATA 静音人格测试</span>
            <h2 id="activity-rules-title">{H5_COPY.rules.title}</h2>
          </div>
          <button className="rules-close" type="button" onClick={onClose} aria-label="关闭活动规则">
            <X size={18} />
          </button>
        </header>
        <div className="rules-list">
          {H5_COPY.rules.items.map((item, index) => (
            <article className="rules-item" key={item.label}>
              <span className="rules-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.text}</p>
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
    <section className="screen quiz-screen">
      <button className="back-button" type="button" onClick={onBack} aria-label="返回">
        <ArrowLeft size={20} />
      </button>
      <div className="quiz-progress">
        <strong>{String(questionIndex + 1).padStart(2, "0")}</strong>
        <span>/ 05</span>
      </div>
      <div className="energy-bar" aria-hidden="true">
        {QUESTIONS.map((item, index) => (
          <i key={item.no} className={index <= questionIndex ? "is-active" : ""} />
        ))}
      </div>
      <h1 className="question-title">{question.title}</h1>
      <div className="option-list">
        {question.options.map((option) => (
          <button
            key={option.key}
            className={`option-button ${answer === option.key ? "is-selected" : ""}`}
            type="button"
            onClick={() => onSelect(option.key as OptionKey)}
          >
            <strong>{option.key}</strong>
            <span>{option.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ResultLoadingScreen({ hasError, onRetry }: { hasError: boolean; onRetry: () => void }) {
  return (
    <section className="screen result-loading-screen">
      <div className="result-loading-title">
        <span>{H5_COPY.resultLoading.titleLines[0]}</span>
        <strong>{H5_COPY.resultLoading.titleLines[1]}</strong>
      </div>
      <div className="hex-door" aria-hidden="true">
        <div className="quiet-door compact-door">
          <div className="door-inner" />
        </div>
      </div>
      <div className="wave-line" aria-hidden="true" />
      {hasError && (
        <button className="ghost-action" type="button" onClick={onRetry}>
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
  return (
    <section className="screen lead-screen">
      <button className="back-button" type="button" onClick={onBack} aria-label="返回">
        <ArrowLeft size={20} />
      </button>
      <h1 className="split-title">
        <span>{H5_COPY.lead.title}</span>
      </h1>
      <p className="lead-hint">{hint}</p>
      <p className="lead-description">{H5_COPY.lead.description}</p>
      <div className="form-stack">
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
        <Field label={H5_COPY.lead.fields.city.label}>
          <div className="select-wrap">
            <select value={lead.city} onChange={(event) => onChange({ ...lead, city: event.target.value })}>
              <option value="">{H5_COPY.lead.fields.city.placeholder}</option>
              {ACTIVITY_CONFIG.mockCities.map((city) => (
                <option value={city} key={city}>
                  {city}
                </option>
              ))}
            </select>
            <ChevronDown size={18} />
          </div>
        </Field>
      </div>
      <label className="privacy-row">
        <input
          type="checkbox"
          checked={lead.privacyConsent}
          onChange={(event) => onChange({ ...lead, privacyConsent: event.target.checked })}
        />
        <span>{H5_COPY.lead.privacy}</span>
      </label>
      {validation && <p className="validation-message">{validation}</p>}
      <PrimaryButton disabled={!lead.privacyConsent || isSubmitting} onClick={onSubmit}>
        {H5_COPY.lead.submit}
      </PrimaryButton>
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
