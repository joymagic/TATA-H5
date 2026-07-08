import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clipboard,
  Database,
  Download,
  FileDown,
  Filter,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  PieChart,
  RefreshCcw,
  Search,
  ShieldCheck,
  Ticket,
  Upload,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CHANNELS,
  CITIES,
  COUPON_BATCH,
  COUPON_EXPORT_PATH,
  DEMO_ACCOUNTS,
  INITIAL_DASHBOARD_FILTERS,
  INITIAL_USER_FILTERS,
  PERSONALITIES,
  PRIZE_LEVEL_CONFIGS,
  PRIZES,
  type AdminRole,
  type AdminSession,
  type AdminView,
  type DashboardData,
  type DashboardFilters,
  type DistributionValue,
  type LeadRecord,
  type OperationLog,
  type PrizeLevelConfig,
  type RuntimeConfig,
  type UserFilters,
  createIssuedCouponCsv,
  createLeadCsv,
  createOperationLog,
  downloadCsv,
  formatNumber,
  formatPrizeProbability,
  getCouponInventoryRows,
  getDashboardData,
  getIssuedCoupons,
  getRuntimeConfig,
  getScopedLeads,
  loginWithMockAccount,
  maskPhone,
  prizeNameForCouponAmount,
  recalculatePrizeProbabilities,
  roleLabel,
  withRoleDefaults,
} from "./adminData";

const RUNTIME = getRuntimeConfig();
const PAGE_SIZE = 8;
const PRIZE_CONFIG_STORAGE_KEY = "tata-admin-prize-configs";

const EMPTY_DASHBOARD: DashboardData = {
  metrics: [
    { label: "活动访问人数", value: 0, hint: "等待 API 返回" },
    { label: "开始测试人数", value: 0, hint: "等待 API 返回" },
    { label: "完成测试人数", value: 0, hint: "等待 API 返回" },
    { label: "进入结果页人数", value: 0, hint: "等待 API 返回" },
    { label: "提交客资人数", value: 0, hint: "等待 API 返回" },
    { label: "抽奖人数", value: 0, hint: "等待 API 返回" },
  ],
  personality: PERSONALITIES.map((label) => ({ label, value: 0 })),
  funnel: [],
  channel: [...CHANNELS].map((label) => ({ label, value: 0 })),
  city: [...CITIES].map((label) => ({ label, value: 0 })),
};

function readStoredPrizeConfigs(): PrizeLevelConfig[] {
  try {
    const raw = window.localStorage.getItem(PRIZE_CONFIG_STORAGE_KEY);
    if (!raw) return PRIZE_LEVEL_CONFIGS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return PRIZE_LEVEL_CONFIGS;
    const merged = PRIZE_LEVEL_CONFIGS.map((defaults) => {
      const stored = parsed.find((item) => item?.code === defaults.code);
      return {
        ...defaults,
        total: Number.isFinite(Number(stored?.total)) ? Math.max(0, Number(stored.total)) : defaults.total,
      };
    });
    return recalculatePrizeProbabilities(merged);
  } catch {
    return PRIZE_LEVEL_CONFIGS;
  }
}

export function App() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [view, setView] = useState<AdminView>("dashboard");
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>(INITIAL_DASHBOARD_FILTERS);
  const [userFilters, setUserFilters] = useState<UserFilters>(INITIAL_USER_FILTERS);
  const [prizeConfigs, setPrizeConfigs] = useState<PrizeLevelConfig[]>(() => readStoredPrizeConfigs());
  const [page, setPage] = useState(1);
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);
  const [disabledCodes, setDisabledCodes] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");

  function pushLog(action: string, detail: string, operator = session?.displayName ?? "未登录") {
    const nextLog = createOperationLog(action, detail, operator);
    setOperationLogs((logs) => [nextLog, ...logs].slice(0, 6));
    setToast(detail);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function handleLogout() {
    if (!RUNTIME.useMockData && RUNTIME.apiBaseUrl) {
      try {
        await fetch(`${RUNTIME.apiBaseUrl}/api/v1/admin/auth/logout`, {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // The UI still clears local state; the API will own cookie cleanup in testing.
      }
    }
    setSession(null);
    setView("dashboard");
    setPage(1);
    setOperationLogs([]);
  }

  if (!session) {
    return <LoginScreen runtime={RUNTIME} onLogin={setSession} />;
  }

  const activeSession = session;
  const scopedDashboardFilters = withRoleDefaults(activeSession, dashboardFilters);
  const dashboardData = RUNTIME.useMockData ? getDashboardData(activeSession, scopedDashboardFilters) : EMPTY_DASHBOARD;
  const scopedUserFilters = activeSession.role === "CITY_ADMIN" ? { ...userFilters, city: activeSession.city } : userFilters;
  const users = RUNTIME.useMockData ? getScopedLeads(activeSession, scopedUserFilters) : [];
  const issuedCoupons = RUNTIME.useMockData ? getIssuedCoupons(activeSession, scopedUserFilters) : [];
  const pageCount = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const visibleUsers = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetDashboardFilters() {
    setDashboardFilters(activeSession.role === "CITY_ADMIN" ? { ...INITIAL_DASHBOARD_FILTERS, city: activeSession.city } : INITIAL_DASHBOARD_FILTERS);
    pushLog("筛选重置", "数据看板筛选已重置");
  }

  function resetUserFilters() {
    setUserFilters(activeSession.role === "CITY_ADMIN" ? { ...INITIAL_USER_FILTERS, city: activeSession.city } : INITIAL_USER_FILTERS);
    setPage(1);
    pushLog("筛选重置", "用户数据筛选已重置");
  }

  function updatePrizeTotal(code: string, total: number) {
    if (activeSession.role !== "HEADQUARTERS_ADMIN") return;
    setPrizeConfigs((configs) =>
      recalculatePrizeProbabilities(
        configs.map((config) => (config.code === code ? { ...config, total: Math.max(0, total) } : config))
      )
    );
  }

  function savePrizeConfigs() {
    if (activeSession.role !== "HEADQUARTERS_ADMIN") {
      pushLog("权限拦截", "城市 ADMIN 无权调整奖项配置");
      return;
    }
    window.localStorage.setItem(PRIZE_CONFIG_STORAGE_KEY, JSON.stringify(prizeConfigs));
    pushLog("保存奖项配置", "奖项数量配置已保存");
  }

  function resetPrizeConfigs() {
    if (activeSession.role !== "HEADQUARTERS_ADMIN") {
      pushLog("权限拦截", "城市 ADMIN 无权调整奖项配置");
      return;
    }
    setPrizeConfigs(PRIZE_LEVEL_CONFIGS);
    window.localStorage.removeItem(PRIZE_CONFIG_STORAGE_KEY);
    pushLog("重置奖项配置", "奖项数量已恢复默认");
  }

  function exportDashboard() {
    const rows = [
      ["指标", "数值", "说明"],
      ...dashboardData.metrics.map((item) => [item.label, String(item.value), item.hint]),
    ];
    downloadCsv("tata-admin-dashboard.csv", rows.map((row) => row.join(",")).join("\n"));
    pushLog("导出活动看板", `已导出 ${activeSession.role === "CITY_ADMIN" ? activeSession.city : "全部城市"} 活动看板`);
  }

  function exportUsers() {
    downloadCsv("tata-admin-users.csv", createLeadCsv(users, activeSession.role === "HEADQUARTERS_ADMIN"));
    pushLog("导出用户表", `已导出 ${formatNumber(users.length)} 条用户数据`);
  }

  function exportIssuedCoupons() {
    downloadCsv("tata-issued-coupons.csv", createIssuedCouponCsv(issuedCoupons));
    pushLog("导出已发放券码", `已导出 ${formatNumber(issuedCoupons.length)} 条已发放券码`);
  }

  function simulateCouponAction(action: string) {
    if (activeSession.role !== "HEADQUARTERS_ADMIN") {
      pushLog("权限拦截", "城市 ADMIN 无权操作券码池");
      return;
    }
    pushLog(action, `${action}已记录为开发演示操作，测试环境需调用 Admin API`);
  }

  function disableCoupon(code: string) {
    if (activeSession.role !== "HEADQUARTERS_ADMIN") {
      pushLog("权限拦截", "城市 ADMIN 无权停用券码");
      return;
    }
    setDisabledCodes((codes) => new Set(codes).add(code));
    pushLog("停用券码", `券码 ${code} 已在开发演示状态中停用`);
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <img src="./assets/brand/tata-logo.png" alt="TATA 木门" />
          <span>管理后台</span>
        </div>
        <nav className="side-nav" aria-label="后台导航">
          <button className={view === "dashboard" ? "is-active" : ""} type="button" onClick={() => setView("dashboard")}>
            <LayoutDashboard size={18} />
            活动数据看板
          </button>
          <button className={view === "users" ? "is-active" : ""} type="button" onClick={() => setView("users")}>
            <Users size={18} />
            用户数据
          </button>
        </nav>
        <RuntimeCard runtime={RUNTIME} />
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">TATA 静音人格测试</p>
            <h1>{view === "dashboard" ? "数据看板" : "用户数据及奖项管理"}</h1>
          </div>
          <div className="account-area">
            <span className="env-badge">{RUNTIME.badge}</span>
            <div className="account-card">
              <ShieldCheck size={18} />
              <div>
                <strong>{activeSession.displayName}</strong>
                <span>{roleLabel(activeSession.role)} · {activeSession.city}</span>
              </div>
            </div>
            <button className="ghost-button" type="button" onClick={handleLogout}>
              <LogOut size={17} />
              退出登录
            </button>
          </div>
        </header>

        {!RUNTIME.useMockData ? <ApiNotice runtime={RUNTIME} /> : null}

        {view === "dashboard" ? (
          <DashboardPanel
            data={dashboardData}
            filters={scopedDashboardFilters}
            role={activeSession.role}
            onExport={exportDashboard}
            onFiltersChange={(filters) => setDashboardFilters(withRoleDefaults(activeSession, filters))}
            onQuery={() => pushLog("查询活动看板", "数据看板筛选已更新")}
            onReset={resetDashboardFilters}
          />
        ) : (
          <UsersPanel
            disabledCodes={disabledCodes}
            filters={scopedUserFilters}
            issuedCoupons={issuedCoupons}
            page={page}
            pageCount={pageCount}
            prizeConfigs={prizeConfigs}
            role={activeSession.role}
            session={activeSession}
            runtime={RUNTIME}
            users={users}
            visibleUsers={visibleUsers}
            onCopy={(code) => copyText(code, pushLog)}
            onDisableCoupon={disableCoupon}
            onExportCoupons={exportIssuedCoupons}
            onExportUsers={exportUsers}
            onFiltersChange={(filters) => {
              setUserFilters(activeSession.role === "CITY_ADMIN" ? { ...filters, city: activeSession.city } : filters);
              setPage(1);
            }}
            onPageChange={setPage}
            onQuery={() => pushLog("查询用户数据", "用户数据筛选已更新")}
            onReset={resetUserFilters}
            onResetPrizeConfigs={resetPrizeConfigs}
            onSavePrizeConfigs={savePrizeConfigs}
            onSimulateCouponAction={simulateCouponAction}
            onUpdatePrizeTotal={updatePrizeTotal}
          />
        )}

        <OperationLogList logs={operationLogs} />
        {toast ? <span className="toast">{toast}</span> : null}
      </section>
    </main>
  );
}

function LoginScreen({ runtime, onLogin }: { runtime: RuntimeConfig; onLogin: (session: AdminSession) => void }) {
  const [username, setUsername] = useState(runtime.useMockData ? DEMO_ACCOUNTS[0].username : "");
  const [password, setPassword] = useState(runtime.useMockData ? DEMO_ACCOUNTS[0].password : "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (runtime.useMockData) {
      window.setTimeout(() => {
        const session = loginWithMockAccount(username, password);
        if (!session) {
          setError("账号或密码错误");
          setIsSubmitting(false);
          return;
        }
        onLogin(session);
        setIsSubmitting(false);
      }, 260);
      return;
    }

    if (!runtime.apiBaseUrl) {
      setError("登录失败，请稍后重试");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${runtime.apiBaseUrl}/api/v1/admin/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) throw new Error("login failed");
      const payload = await response.json();
      onLogin(toApiSession(payload));
    } catch {
      setError("登录失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <img src="./assets/brand/tata-logo.png" alt="TATA 木门" />
          <span className="env-badge">{runtime.badge}</span>
        </div>
        <div className="login-copy">
          <p className="eyebrow">静音人格测试</p>
          <h1>管理员登录</h1>
          <p>{runtime.datasetNotice}</p>
        </div>

        <form className="login-form" onSubmit={submit}>
          <label>
            <span>管理员账号</span>
            <div className="input-shell">
              <UserRound size={18} />
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入账号" autoComplete="username" />
            </div>
          </label>
          <label>
            <span>密码</span>
            <div className="input-shell">
              <KeyRound size={18} />
              <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" type="password" autoComplete="current-password" />
            </div>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            <LockKeyhole size={18} />
            {isSubmitting ? "登录中" : "登录"}
          </button>
        </form>

        {runtime.useMockData ? (
          <div className="demo-accounts" aria-label="开发演示账号">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                type="button"
                key={account.id}
                onClick={() => {
                  setUsername(account.username);
                  setPassword(account.password);
                  setError("");
                }}
              >
                <span>{account.displayName}</span>
                <strong>{account.username}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="api-login-note">
            <AlertTriangle size={17} />
            测试环境需配置独立 Admin API，开发演示账号不会在此启用。
          </div>
        )}
      </section>
    </main>
  );
}

function RuntimeCard({ runtime }: { runtime: RuntimeConfig }) {
  return (
    <div className="runtime-card">
      <span>{runtime.datasetLabel}</span>
      <strong>{runtime.dataSource === "mock" ? "Mock" : "API"}</strong>
      <p>{runtime.datasetNotice}</p>
      {runtime.apiBaseUrl ? <small>{runtime.apiBaseUrl}</small> : <small>API 未配置</small>}
    </div>
  );
}

function ApiNotice({ runtime }: { runtime: RuntimeConfig }) {
  return (
    <section className="api-notice">
      <AlertTriangle size={18} />
      <div>
        <strong>测试环境数据未使用本地 mock</strong>
        <p>{runtime.apiBaseUrl ? `当前 API：${runtime.apiBaseUrl}` : "请在 .env.testing 中配置 VITE_ADMIN_API_BASE_URL。"}</p>
      </div>
    </section>
  );
}

function DashboardPanel({
  data,
  filters,
  role,
  onExport,
  onFiltersChange,
  onQuery,
  onReset,
}: {
  data: DashboardData;
  filters: DashboardFilters;
  role: AdminRole;
  onExport: () => void;
  onFiltersChange: (filters: DashboardFilters) => void;
  onQuery: () => void;
  onReset: () => void;
}) {
  return (
    <div className="stack">
      <section className="toolbar-panel">
        <FilterSelect label="时间范围" value={filters.dateRange} onChange={(dateRange) => onFiltersChange({ ...filters, dateRange: dateRange as DashboardFilters["dateRange"] })}>
          <option value="today">今日</option>
          <option value="last7">近 7 天</option>
          <option value="last30">近 30 天</option>
          <option value="all">全部</option>
        </FilterSelect>
        <FilterSelect label="城市" value={filters.city} disabled={role === "CITY_ADMIN"} onChange={(city) => onFiltersChange({ ...filters, city })}>
          <option value="all">全部城市</option>
          {CITIES.map((city) => (
            <option value={city} key={city}>{city}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="渠道" value={filters.channel} onChange={(channel) => onFiltersChange({ ...filters, channel })}>
          <option value="all">全部渠道</option>
          {CHANNELS.map((channel) => (
            <option value={channel} key={channel}>{channel}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="人格" value={filters.personality} onChange={(personality) => onFiltersChange({ ...filters, personality: personality as DashboardFilters["personality"] })}>
          <option value="all">全部人格</option>
          {PERSONALITIES.map((personality) => (
            <option value={personality} key={personality}>{personality}</option>
          ))}
        </FilterSelect>
        <div className="toolbar-actions">
          <button className="light-button" type="button" onClick={onReset}>
            <RefreshCcw size={16} />
            重置
          </button>
          <button className="primary-button compact" type="button" onClick={onQuery}>
            <Search size={16} />
            查询
          </button>
          <button className="dark-button" type="button" onClick={onExport}>
            <FileDown size={16} />
            导出 Excel
          </button>
        </div>
      </section>

      <section className="metric-grid" aria-label="核心指标">
        {data.metrics.map((metric, index) => (
          <MetricCard key={metric.label} metric={metric} iconIndex={index} />
        ))}
      </section>

      <section className="dashboard-grid">
        <ChartPanel title="人格分布" icon={<PieChart size={18} />}>
          <BarList data={data.personality} />
        </ChartPanel>
        <ChartPanel title="转化漏斗" icon={<Filter size={18} />}>
          <FunnelChart data={data.funnel} />
        </ChartPanel>
        <ChartPanel title="渠道来源" icon={<Database size={18} />}>
          <BarList data={data.channel} />
        </ChartPanel>
        <ChartPanel title="城市分布" icon={<Building2 size={18} />}>
          <BarList data={data.city} />
        </ChartPanel>
      </section>
    </div>
  );
}

function UsersPanel({
  disabledCodes,
  filters,
  issuedCoupons,
  page,
  pageCount,
  prizeConfigs,
  role,
  session,
  runtime,
  users,
  visibleUsers,
  onCopy,
  onDisableCoupon,
  onExportCoupons,
  onExportUsers,
  onFiltersChange,
  onPageChange,
  onQuery,
  onReset,
  onResetPrizeConfigs,
  onSavePrizeConfigs,
  onSimulateCouponAction,
  onUpdatePrizeTotal,
}: {
  disabledCodes: Set<string>;
  filters: UserFilters;
  issuedCoupons: ReturnType<typeof getIssuedCoupons>;
  page: number;
  pageCount: number;
  prizeConfigs: PrizeLevelConfig[];
  role: AdminRole;
  session: AdminSession;
  runtime: RuntimeConfig;
  users: LeadRecord[];
  visibleUsers: LeadRecord[];
  onCopy: (code: string) => void;
  onDisableCoupon: (code: string) => void;
  onExportCoupons: () => void;
  onExportUsers: () => void;
  onFiltersChange: (filters: UserFilters) => void;
  onPageChange: (page: number) => void;
  onQuery: () => void;
  onReset: () => void;
  onResetPrizeConfigs: () => void;
  onSavePrizeConfigs: () => void;
  onSimulateCouponAction: (action: string) => void;
  onUpdatePrizeTotal: (code: string, total: number) => void;
}) {
  const userStats = useMemo(() => {
    return [
      { label: "总用户数", value: users.length },
      ...PERSONALITIES.map((personality) => ({
        label: personality,
        value: users.filter((user) => user.personality === personality).length,
      })),
    ];
  }, [users]);
  const inventoryRows = useMemo(() => getCouponInventoryRows(session, disabledCodes), [disabledCodes, session]);

  return (
    <div className="stack">
      <section className="stat-strip">
        {userStats.map((stat) => (
          <article key={stat.label}>
            <span>{stat.label}</span>
            <strong>{formatNumber(stat.value)}</strong>
          </article>
        ))}
      </section>

      <section className="coupon-summary">
        <div>
          <p className="eyebrow">奖项领取进度</p>
          <h2>券码池 {COUPON_BATCH.batchId}</h2>
        </div>
        <div className="coupon-tier-grid">
          {prizeConfigs.map((tier) => {
            const used = issuedCoupons.filter((coupon) => coupon.prize === tier.name).length;
            return (
              <article key={tier.code}>
                <span>{tier.name}</span>
                <strong>{formatNumber(used)} / {formatNumber(tier.total)}</strong>
                <small>已发放 / 总量 · 概率 {formatPrizeProbability(tier.probability)}</small>
              </article>
            );
          })}
        </div>
      </section>

      <section className="toolbar-panel" aria-label="奖项数量配置">
        {prizeConfigs.map((tier) => (
          <label className="filter-field prize-config-field" key={tier.code}>
            <span className="prize-config-label">
              <span>{tier.name}数量</span>
              <small>概率 {formatPrizeProbability(tier.probability)}</small>
            </span>
            <div className="input-shell">
              <Ticket size={17} />
              <input
                aria-label={`${tier.name}数量`}
                disabled={role !== "HEADQUARTERS_ADMIN"}
                inputMode="numeric"
                min={0}
                step={1}
                type="number"
                value={tier.total}
                onChange={(event) => onUpdatePrizeTotal(tier.code, Math.max(0, Math.trunc(Number(event.target.value) || 0)))}
              />
            </div>
          </label>
        ))}
        <div className="toolbar-actions">
          <button className="light-button" type="button" disabled={role !== "HEADQUARTERS_ADMIN"} onClick={onResetPrizeConfigs}>
            <RefreshCcw size={16} />
            重置
          </button>
          <button className="primary-button compact" type="button" disabled={role !== "HEADQUARTERS_ADMIN"} onClick={onSavePrizeConfigs}>
            <CheckCircle2 size={16} />
            保存
          </button>
        </div>
      </section>

      <section className="toolbar-panel user-toolbar">
        <label className="filter-field wide-field">
          <span>搜索姓名或手机号</span>
          <div className="input-shell">
            <Search size={17} />
            <input value={filters.keyword} onChange={(event) => onFiltersChange({ ...filters, keyword: event.target.value })} placeholder="搜索姓名或手机号" />
          </div>
        </label>
        <FilterSelect label="城市" value={filters.city} disabled={role === "CITY_ADMIN"} onChange={(city) => onFiltersChange({ ...filters, city })}>
          <option value="all">全部城市</option>
          {CITIES.map((city) => (
            <option value={city} key={city}>{city}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="人格" value={filters.personality} onChange={(personality) => onFiltersChange({ ...filters, personality: personality as UserFilters["personality"] })}>
          <option value="all">全部人格</option>
          {PERSONALITIES.map((personality) => (
            <option value={personality} key={personality}>{personality}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="奖项" value={filters.prize} onChange={(prize) => onFiltersChange({ ...filters, prize })}>
          <option value="all">全部奖项</option>
          {PRIZES.map((prize) => (
            <option value={prize} key={prize}>{prize}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="时间范围" value={filters.dateRange} onChange={(dateRange) => onFiltersChange({ ...filters, dateRange: dateRange as UserFilters["dateRange"] })}>
          <option value="today">今日</option>
          <option value="last7">近 7 天</option>
          <option value="last30">近 30 天</option>
          <option value="all">全部</option>
        </FilterSelect>
        <div className="toolbar-actions">
          <button className="light-button" type="button" onClick={onReset}>
            <RefreshCcw size={16} />
            重置
          </button>
          <button className="primary-button compact" type="button" onClick={onQuery}>
            <Search size={16} />
            查询
          </button>
          <button className="dark-button" type="button" onClick={onExportUsers} disabled={!runtime.useMockData}>
            <FileDown size={16} />
            导出用户表
          </button>
        </div>
      </section>

      <section className="table-section">
        <SectionTitle title="用户列表" subtitle={`已匹配 ${formatNumber(users.length)} 条，当前第 ${page} / ${pageCount} 页`} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>提交时间</th>
                <th>姓名</th>
                <th>手机号</th>
                <th>城市</th>
                <th>人格</th>
                <th>测试得分</th>
                <th>奖项</th>
                <th>奖券码</th>
                <th>渠道</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.length ? (
                visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.submittedAt}</td>
                    <td>{user.name}</td>
                    <td>{maskPhone(user.phone)}</td>
                    <td>{user.city}</td>
                    <td><span className="persona-pill">{user.personality}</span></td>
                    <td>{user.score}</td>
                    <td>{user.prize}</td>
                    <td className="code-cell">{user.couponCode}</td>
                    <td>{user.channel}</td>
                  </tr>
                ))
              ) : (
                <EmptyTable colSpan={9} text={runtime.useMockData ? "暂无匹配用户" : "等待测试环境 API 返回用户数据"} />
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button className="light-button" type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>上一页</button>
          <span>{page} / {pageCount}</span>
          <button className="light-button" type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>下一页</button>
        </div>
      </section>

      <section className="table-section">
        <div className="section-heading">
          <SectionTitle title="奖券数据" subtitle={role === "HEADQUARTERS_ADMIN" ? "总部 ADMIN 可管理券码池" : "城市 ADMIN 仅查看所属城市已发放券码"} />
          <div className="section-actions">
            <button className="light-button" type="button" disabled={role !== "HEADQUARTERS_ADMIN"} onClick={() => onSimulateCouponAction("批量生成券码")}>
              <Ticket size={16} />
              批量生成券码
            </button>
            <button className="light-button" type="button" disabled={role !== "HEADQUARTERS_ADMIN"} onClick={() => onSimulateCouponAction("导入券码")}>
              <Upload size={16} />
              导入券码
            </button>
            <button className="dark-button" type="button" onClick={onExportCoupons}>
              <Download size={16} />
              导出已发放券码
            </button>
          </div>
        </div>

        {role === "HEADQUARTERS_ADMIN" ? (
          <>
            <div className="download-row">
              <span>完整开发券码池 CSV：</span>
              <a className="text-link" href={COUPON_EXPORT_PATH} download>下载本地开发券码池</a>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>编号</th>
                    <th>券码</th>
                    <th>奖项</th>
                    <th>状态</th>
                    <th>批次</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryRows.map((coupon) => {
                    const disabled = disabledCodes.has(coupon.code);
                    return (
                      <tr key={coupon.code}>
                        <td>{coupon.id}</td>
                        <td className="code-cell">{coupon.code}</td>
                        <td>{prizeNameForCouponAmount(coupon.amount)}</td>
                        <td><span className={disabled ? "status-pill status-disabled" : "status-pill status-available"}>{disabled ? "已停用" : "可用"}</span></td>
                        <td>{coupon.batchId}</td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-text-button" type="button" onClick={() => onCopy(coupon.code)}>
                              <Clipboard size={15} />
                              复制
                            </button>
                            <button className="icon-text-button danger" type="button" disabled={disabled} onClick={() => onDisableCoupon(coupon.code)}>
                              停用
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>券码</th>
                  <th>奖项</th>
                  <th>状态</th>
                  <th>绑定手机号</th>
                  <th>所属城市</th>
                  <th>发放时间</th>
                </tr>
              </thead>
              <tbody>
                {issuedCoupons.length ? (
                  issuedCoupons.map((coupon) => (
                    <tr key={coupon.code}>
                      <td className="code-cell">{coupon.code}</td>
                      <td>{coupon.prize}</td>
                      <td><span className="status-pill status-issued">{coupon.status}</span></td>
                      <td>{coupon.phone}</td>
                      <td>{coupon.city}</td>
                      <td>{coupon.issuedAt}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTable colSpan={6} text="暂无已发放券码" />
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ metric, iconIndex }: { metric: DashboardData["metrics"][number]; iconIndex: number }) {
  const icons = [Users, CheckCircle2, Database, BarChart3, UserRound, Ticket];
  const Icon = icons[iconIndex] ?? Database;
  return (
    <article className="metric-card">
      <Icon size={21} />
      <span>{metric.label}</span>
      <strong>{formatNumber(metric.value)}</strong>
      <small>{metric.hint}</small>
    </article>
  );
}

function ChartPanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="chart-panel">
      <div className="chart-title">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function BarList({ data }: { data: DistributionValue[] }) {
  const maxValue = Math.max(1, ...data.map((item) => item.value));
  return (
    <div className="bar-list">
      {data.map((item) => (
        <div className="bar-row" key={item.label}>
          <span>{item.label}</span>
          <div className="bar-track"><i style={{ width: `${Math.max(4, (item.value / maxValue) * 100)}%` }} /></div>
          <strong>{formatNumber(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function FunnelChart({ data }: { data: DistributionValue[] }) {
  const maxValue = Math.max(1, ...data.map((item) => item.value));
  if (!data.length) return <EmptyState text="等待测试环境 API 返回漏斗数据" />;
  return (
    <div className="funnel-list">
      {data.map((item) => (
        <div className="funnel-row" key={item.label}>
          <span>{item.label}</span>
          <i style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }} />
          <strong>{formatNumber(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function FilterSelect({
  children,
  disabled,
  label,
  value,
  onChange,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <WalletCards size={22} />
      <span>{text}</span>
    </div>
  );
}

function EmptyTable({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <EmptyState text={text} />
      </td>
    </tr>
  );
}

function OperationLogList({ logs }: { logs: OperationLog[] }) {
  if (!logs.length) return null;
  return (
    <section className="operation-log">
      <SectionTitle title="操作日志" subtitle="导出和券码操作会在正式后端写入 OperationLog" />
      <div>
        {logs.map((log) => (
          <article key={log.id}>
            <strong>{log.action}</strong>
            <span>{log.detail}</span>
            <small>{log.operator} · {log.createdAt}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

async function copyText(value: string, pushLog: (action: string, detail: string) => void) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "true");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
  pushLog("复制券码", `已复制券码 ${value}`);
}

function toApiSession(payload: unknown): AdminSession {
  const raw = typeof payload === "object" && payload && "data" in payload ? (payload as { data: unknown }).data : payload;
  const data = (typeof raw === "object" && raw ? raw : {}) as Partial<AdminSession> & {
    cityName?: string;
    name?: string;
  };
  const role = data.role === "CITY_ADMIN" ? "CITY_ADMIN" : "HEADQUARTERS_ADMIN";
  return {
    id: String(data.id ?? "api-admin"),
    username: String(data.username ?? "api_admin"),
    displayName: String(data.displayName ?? data.name ?? "管理员"),
    role,
    city: String(data.city ?? data.cityName ?? (role === "CITY_ADMIN" ? "所属城市" : "全国")),
    lastLoginAt: String(data.lastLoginAt ?? ""),
  };
}
