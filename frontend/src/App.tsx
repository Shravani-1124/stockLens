
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

type PriceRecord = {
  Date: string;
  Close: number;
};

type HistoryResponse = {
  ticker: string;
  data: PriceRecord[];
};

function App() {
  const [ticker, setTicker] = useState("TCS.NS");
  const [history, setHistory] = useState<PriceRecord[]>([]);
  const [loadedTicker, setLoadedTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyseStock() {
    const symbol = ticker.trim().toUpperCase();

    if (!symbol) {
      setError("Please enter a stock ticker.");
      return;
    }

    setLoading(true);
    setError("");
    setHistory([]);
    setLoadedTicker("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/stocks/${encodeURIComponent(symbol)}/history`
      );

      if (!response.ok) {
        throw new Error(
          `Could not retrieve stock data (HTTP ${response.status}).`
        );
      }

      const result: HistoryResponse = await response.json();

      const records = result.data
        .filter(
          (item) =>
            Number.isFinite(Number(item.Close)) &&
            Boolean(item.Date)
        )
        .map((item) => ({
          Date: item.Date,
          Close: Number(item.Close),
        }));

      if (records.length === 0) {
        throw new Error("No usable price data was returned.");
      }

      setHistory(records);
      setLoadedTicker(result.ticker);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading stock data."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="navbar">
        <h2>StockLens<span>.</span></h2>
        <span className="tagline">Stock Research Platform</span>
      </header>

      <main className="main-content">
        <p className="eyebrow">MARKET RESEARCH / STOCK EXPLORER</p>

        <h1>Understand your stocks.</h1>
        <p className="subtitle">
          Explore historical performance and financial risk in one place.
        </p>

        <section className="search-panel">
          <label htmlFor="ticker">Stock ticker</label>

          <div className="search-row">
            <input
              id="ticker"
              value={ticker}
              onChange={(event) => setTicker(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void analyseStock();
              }}
              placeholder="e.g. TCS.NS"
            />

            <button
              onClick={() => void analyseStock()}
              disabled={loading}
            >
              {loading ? "Loading..." : "Analyse stock"}
            </button>
          </div>

          <p className="hint">
            Try TCS.NS or RELIANCE.NS.
          </p>
        </section>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {history.length > 0 && (
          <section className="results-panel">
            <div className="results-heading">
              <div>
                <p className="eyebrow">PRICE HISTORY</p>
                <h2>{loadedTicker}</h2>
              </div>

              <div className="latest-price">
                <span>Latest available close</span>
                <strong>
                  ₹{history[history.length - 1].Close.toLocaleString(
                    "en-IN",
                    { maximumFractionDigits: 2 }
                  )}
                </strong>
              </div>
            </div>

            <p className="hint">
              Historical closing prices · {history.length} records
            </p>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={history}
                  margin={{ top: 12, right: 16, bottom: 8, left: 8 }}
                >
                  <CartesianGrid
                    stroke="#293246"
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="Date"
                    tickFormatter={(value: string) =>
                      new Date(value).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })
                    }
                    tick={{ fill: "#8c97aa", fontSize: 11 }}
                    minTickGap={30}
                  />

                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fill: "#8c97aa", fontSize: 11 }}
                    tickFormatter={(value: number) =>
                      `₹${value.toLocaleString("en-IN")}`
                    }
                    width={76}
                  />

                  <Tooltip
                    labelFormatter={(value) =>
                      new Date(String(value)).toLocaleDateString("en-IN")
                    }
                    formatter={(value) => [
                      `₹${Number(value).toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}`,
                      "Close",
                    ]}
                    contentStyle={{
                      background: "#111722",
                      border: "1px solid #303a4d",
                      borderRadius: 8,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="Close"
                    stroke="#a7bcff"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {!loading && history.length === 0 && !error && (
          <section className="empty-state">
            <div className="chart-icon">↗</div>
            <h2>Your research starts here</h2>
            <p>
              Search for a stock to explore its price history and performance.
            </p>
          </section>
        )}
      </main>

      <footer>
        StockLens · Financial data for research and analysis
      </footer>
    </div>
  );
}

export default App;
