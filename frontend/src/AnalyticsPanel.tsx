
import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const API = "https://stocklens-suj1.onrender.com/api";

type RiskResult = {
  period: string;
  portfolio_value: number;
  annualised_volatility_percent: number;
  annualised_return_percent: number;
  maximum_drawdown_percent: number;
  sharpe_ratio: number | null;
  concentration_score: number;
  largest_holding: {
    ticker: string;
    weight_percent: number;
  };
  allocations: {
    ticker: string;
    current_value: number;
    weight_percent: number;
  }[];
  risk_free_rate_percent: number;
  methodology: string;
};

type Fundamentals = {
  ticker: string;
  company_name: string | null;
  sector: string | null;
  industry: string | null;
  currency: string | null;
  market_cap: number | null;
  trailing_pe: number | null;
  forward_pe: number | null;
  price_to_book: number | null;
  return_on_equity_percent: number | null;
  revenue_growth_percent: number | null;
  profit_margin_percent: number | null;
  data_source: string;
  note: string;
};

type BenchmarkResult = {
  ticker: string;
  benchmark: string;
  period: string;
  stock_return_percent: number;
  benchmark_return_percent: number;
  outperformance_percent: number;
  chart_data: {
    date: string;
    stock: number;
    benchmark: number;
  }[];
};

type Holding = {
  ticker: string;
  quantity: number;
};

type Tab = "risk" | "fundamentals" | "benchmark";

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return "Unavailable";

  return value.toLocaleString("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "Unavailable";

  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="analytics-metric">
      <p className="hint">{label}</p>
      <h3>{value}</h3>
    </div>
  );
}

export default function AnalyticsPanel() {
  const [tab, setTab] = useState<Tab>("risk");
  const [ticker, setTicker] = useState("TCS.NS");
  const [period, setPeriod] = useState("1y");
  const [holdings, setHoldings] = useState<Holding[]>([
    { ticker: "TCS.NS", quantity: 10 },
    { ticker: "RELIANCE.NS", quantity: 5 },
  ]);

  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [fundamentals, setFundamentals] =
    useState<Fundamentals | null>(null);
  const [benchmark, setBenchmark] =
    useState<BenchmarkResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestData<T>(url: string, options?: RequestInit) {
    const response = await fetch(url, options);

    if (!response.ok) {
      let message = `Request failed (${response.status})`;

      try {
        const body = await response.json();
        message = body.detail || message;
      } catch {
        // Keep the HTTP error message if the response isn't JSON.
      }

      throw new Error(message);
    }

    return (await response.json()) as T;
  }

  async function loadRisk() {
    setLoading(true);
    setError("");
    setRisk(null);

    try {
      const result = await requestData<RiskResult>(
        `${API}/portfolio/risk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ holdings, period }),
        },
      );

      setRisk(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load risk analysis.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadFundamentals() {
    setLoading(true);
    setError("");
    setFundamentals(null);

    try {
      const symbol = ticker.trim().toUpperCase();

      if (!symbol) throw new Error("Enter a stock ticker.");

      const result = await requestData<Fundamentals>(
        `${API}/stocks/${encodeURIComponent(symbol)}/fundamentals`,
      );

      setFundamentals(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load company fundamentals.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadBenchmark() {
    setLoading(true);
    setError("");
    setBenchmark(null);

    try {
      const symbol = ticker.trim().toUpperCase();

      if (!symbol) throw new Error("Enter a stock ticker.");

      const result = await requestData<BenchmarkResult>(
        `${API}/stocks/${encodeURIComponent(symbol)}/benchmark?period=${period}`,
      );

      setBenchmark(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load benchmark comparison.",
      );
    } finally {
      setLoading(false);
    }
  }

  function updateHolding(
    index: number,
    field: keyof Holding,
    value: string,
  ) {
    setHoldings((previous) =>
      previous.map((holding, i) =>
        i === index
          ? {
              ...holding,
              [field]:
                field === "quantity" ? Number(value) : value.toUpperCase(),
            }
          : holding,
      ),
    );
  }

  function addHolding() {
    setHoldings((previous) => [
      ...previous,
      { ticker: "", quantity: 1 },
    ]);
  }

  function removeHolding(index: number) {
    setHoldings((previous) =>
      previous.filter((_, i) => i !== index),
    );
  }

  return (
    <section className="analytics-panel">
      <h2>Advanced Financial Analytics</h2>
      <p className="hint">
        Explore portfolio risk, company fundamentals, and benchmark returns.
      </p>

      <div className="analytics-tabs">
        <button
          className={tab === "risk" ? "active" : ""}
          onClick={() => setTab("risk")}
        >
          Portfolio Risk
        </button>
        <button
          className={tab === "fundamentals" ? "active" : ""}
          onClick={() => setTab("fundamentals")}
        >
          Fundamentals
        </button>
        <button
          className={tab === "benchmark" ? "active" : ""}
          onClick={() => setTab("benchmark")}
        >
          Nifty 50 Comparison
        </button>
      </div>

      {tab !== "risk" && (
        <div className="analytics-controls">
          <label>
            Stock ticker
            <input
              value={ticker}
              onChange={(event) => setTicker(event.target.value)}
              placeholder="TCS.NS"
            />
          </label>

          {tab === "benchmark" && (
            <label>
              Historical period
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              >
                <option value="6mo">6 months</option>
                <option value="1y">1 year</option>
                <option value="2y">2 years</option>
                <option value="5y">5 years</option>
              </select>
            </label>
          )}

          <button
            onClick={
              tab === "fundamentals"
                ? loadFundamentals
                : loadBenchmark
            }
            disabled={loading}
          >
            {loading ? "Loading..." : "Analyse Stock"}
          </button>
        </div>
      )}

      {tab === "risk" && (
        <>
          <label>
            Historical period
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value="6mo">6 months</option>
              <option value="1y">1 year</option>
              <option value="2y">2 years</option>
              <option value="5y">5 years</option>
            </select>
          </label>

          <h3>Portfolio holdings</h3>

          {holdings.map((holding, index) => (
            <div className="analytics-holding" key={index}>
              <input
                aria-label={`Ticker for holding ${index + 1}`}
                value={holding.ticker}
                onChange={(event) =>
                  updateHolding(index, "ticker", event.target.value)
                }
                placeholder="TCS.NS"
              />

              <input
                aria-label={`Quantity for holding ${index + 1}`}
                type="number"
                min="0.01"
                step="any"
                value={holding.quantity}
                onChange={(event) =>
                  updateHolding(index, "quantity", event.target.value)
                }
              />

              <button
                onClick={() => removeHolding(index)}
                disabled={holdings.length === 1}
                aria-label="Remove holding"
              >
                Remove
              </button>
            </div>
          ))}

          <div className="analytics-actions">
            <button onClick={addHolding}>Add holding</button>
            <button onClick={loadRisk} disabled={loading}>
              {loading ? "Calculating..." : "Calculate Risk"}
            </button>
          </div>
        </>
      )}

      {error && <p className="analytics-error">{error}</p>}

      {tab === "risk" && risk && (
        <>
          <div className="analytics-grid">
            <Metric
              label="Portfolio Value"
              value={formatMoney(risk.portfolio_value)}
            />
            <Metric
              label="Annualised Return"
              value={`${formatNumber(risk.annualised_return_percent)}%`}
            />
            <Metric
              label="Annualised Volatility"
              value={`${formatNumber(risk.annualised_volatility_percent)}%`}
            />
            <Metric
              label="Maximum Drawdown"
              value={`${formatNumber(risk.maximum_drawdown_percent)}%`}
            />
            <Metric
              label="Sharpe Ratio"
              value={formatNumber(risk.sharpe_ratio, 3)}
            />
            <Metric
              label="Concentration Score"
              value={formatNumber(risk.concentration_score)}
            />
          </div>

          <h3>Portfolio Allocation</h3>

          <div className="analytics-allocation">
            {risk.allocations.map((item) => (
              <div key={item.ticker} className="allocation-row">
                <div className="allocation-label">
                  <span>{item.ticker}</span>
                  <span>{formatNumber(item.weight_percent)}%</span>
                </div>
                <div className="allocation-track">
                  <div
                    className="allocation-fill"
                    style={{
                      width: `${Math.min(item.weight_percent, 100)}%`,
                    }}
                  />
                </div>
                <p className="hint">{formatMoney(item.current_value)}</p>
              </div>
            ))}
          </div>

          <p>
            Largest holding: <strong>{risk.largest_holding.ticker}</strong>
            {" "}({formatNumber(risk.largest_holding.weight_percent)}%)
          </p>
          <p className="hint">
            Assumed annual risk-free rate: {risk.risk_free_rate_percent}%.
            {` ${risk.methodology}`}
          </p>
        </>
      )}

      {tab === "fundamentals" && fundamentals && (
        <>
          <h3>{fundamentals.company_name || fundamentals.ticker}</h3>
          <p className="hint">
            {fundamentals.sector || "Sector unavailable"}
            {fundamentals.industry ? ` · ${fundamentals.industry}` : ""}
          </p>

          <div className="analytics-grid">
            <Metric
              label="Market Capitalisation"
              value={
                fundamentals.market_cap == null
                  ? "Unavailable"
                  : `${fundamentals.currency || "INR"} ${formatNumber(fundamentals.market_cap, 0)}`
              }
            />
            <Metric
              label="Trailing P/E"
              value={formatNumber(fundamentals.trailing_pe)}
            />
            <Metric
              label="Forward P/E"
              value={formatNumber(fundamentals.forward_pe)}
            />
            <Metric
              label="Price to Book"
              value={formatNumber(fundamentals.price_to_book)}
            />
            <Metric
              label="Return on Equity"
              value={
                fundamentals.return_on_equity_percent == null
                  ? "Unavailable"
                  : `${formatNumber(fundamentals.return_on_equity_percent)}%`
              }
            />
            <Metric
              label="Revenue Growth"
              value={
                fundamentals.revenue_growth_percent == null
                  ? "Unavailable"
                  : `${formatNumber(fundamentals.revenue_growth_percent)}%`
              }
            />
            <Metric
              label="Profit Margin"
              value={
                fundamentals.profit_margin_percent == null
                  ? "Unavailable"
                  : `${formatNumber(fundamentals.profit_margin_percent)}%`
              }
            />
          </div>

          <p className="hint">
            {fundamentals.note} Data source: {fundamentals.data_source}.
          </p>
        </>
      )}

      {tab === "benchmark" && benchmark && (
        <>
          <div className="analytics-grid">
            <Metric
              label={`${benchmark.ticker} Return`}
              value={`${formatNumber(benchmark.stock_return_percent)}%`}
            />
            <Metric
              label="Nifty 50 Return"
              value={`${formatNumber(benchmark.benchmark_return_percent)}%`}
            />
            <Metric
              label="Outperformance"
              value={`${benchmark.outperformance_percent > 0 ? "+" : ""}${formatNumber(benchmark.outperformance_percent)} percentage points`}
            />
          </div>

          <div className="analytics-chart">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={benchmark.chart_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  minTickGap={35}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="stock"
                  name={benchmark.ticker}
                  stroke="#818cf8"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  name="Nifty 50"
                  stroke="#34d399"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="hint">
            Both series start at 100. Returns are historical and do not
            include a full assessment of dividends, taxes, or transaction costs.
          </p>
        </>
      )}
    </section>
  );
}
