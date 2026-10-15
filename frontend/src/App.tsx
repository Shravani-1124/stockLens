
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  ReferenceLine,
  Legend,
  PieChart,
  Pie,
  Cell,
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
 

type PerformanceResponse = {
  ticker: string;
  start_price?: number;
  end_price?: number;
  period_return_pct?: number;
  annualised_volatility_pct?: number;
  max_drawdown_pct?: number;
  error?: string;
};


type DailyReturnRecord = {
  date: string;
  daily_return_pct: number;
};

type DailyReturnsResponse = {
  ticker: string;
  data: DailyReturnRecord[];
};


type NormalisedPriceRecord = {
  date: string;
  normalised_price: number;
};

type ComparedStock = {
  ticker: string;
  start_price: number;
  end_price: number;
  period_return_pct: number;
  annualised_volatility_pct: number;
  max_drawdown_pct: number;
  normalised_data: NormalisedPriceRecord[];
};

type ComparisonResponse = {
  stock1: ComparedStock;
  stock2: ComparedStock;
};

type PortfolioHoldingInput = {
  ticker: string;
  quantity: number;
  purchase_price: number;
};

type PortfolioHolding = PortfolioHoldingInput & {
  invested_amount: number;
  current_value: number;
  profit_loss: number;
  return_pct: number;
};

type PortfolioResponse = {
  holdings: PortfolioHolding[];
  summary: {
    total_invested: number;
    total_current_value: number;
    total_profit_loss: number;
    total_return_pct: number;
  };
};



function App() {
  const [ticker, setTicker] = useState("TCS.NS");
  const [history, setHistory] = useState<PriceRecord[]>([]);
  const [loadedTicker, setLoadedTicker] = useState("");
  const [performance, setPerformance] =
    useState<PerformanceResponse | null>(null);
  
  const [dailyReturns, setDailyReturns] = 
    useState<DailyReturnRecord[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

const [holdings, setHoldings] = useState<PortfolioHoldingInput[]>([]);
const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);

const allocationColors = [
  "#a5b4fc",
  "#4ade80",
  "#fbbf24",
  "#f87171",
  "#38bdf8",
  "#c084fc",
  "#fb923c",
];

const allocationData = portfolio
  ? portfolio.holdings.map((holding) => ({
      ticker: holding.ticker,
      value: holding.current_value,
      percentage:
        portfolio.summary.total_current_value > 0
          ? (holding.current_value /
              portfolio.summary.total_current_value) *
            100
          : 0,
    }))
  : [];


const [newTicker, setNewTicker] = useState("TCS.NS");
const [newQuantity, setNewQuantity] = useState("10");
const [newPurchasePrice, setNewPurchasePrice] = useState("");


const [portfolioLoading, setPortfolioLoading] = useState(false);
const [portfolioError, setPortfolioError] = useState("");



const [ticker2, setTicker2] = useState("RELIANCE.NS");
const [comparison, setComparison] =
  useState<ComparisonResponse | null>(null);


function addHolding() {
  const symbol = newTicker.trim().toUpperCase();
  const quantity = Number(newQuantity);
  const purchasePrice = Number(newPurchasePrice);

  if (!symbol || !newPurchasePrice) {
    setPortfolioError("Please fill in all holding fields.");
    return;
  }

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(purchasePrice) ||
    purchasePrice <= 0
  ) {
    setPortfolioError(
      "Enter a positive whole-number quantity and positive purchase price."
    );
    return;
  }

  const updatedHoldings = [
    ...holdings,
    {
      ticker: symbol,
      quantity,
      purchase_price: purchasePrice,
    },
  ];

  setHoldings(updatedHoldings);
  setPortfolio(null);
  setPortfolioError("");
  setNewTicker("");
  setNewQuantity("10");
  setNewPurchasePrice("");
}


async function analysePortfolio() {
  if (holdings.length === 0) {
    setPortfolioError("Please add at least one holding.");
    return;
  }

  setPortfolioLoading(true);
  setPortfolioError("");

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/api/portfolio/analyse",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(holdings),
      }
    );

    if (!response.ok) {
      throw new Error("Could not analyse your portfolio.");
    }

    const result: PortfolioResponse = await response.json();
    setPortfolio(result);
  } catch (err) {
    setPortfolioError(
      err instanceof Error
        ? err.message
        : "Something went wrong while analysing your portfolio."
    );
  } finally {
    setPortfolioLoading(false);
  }
}

async function compareStocks() {
  const symbol1 = ticker.trim().toUpperCase();
  const symbol2 = ticker2.trim().toUpperCase();

  if (!symbol1 || !symbol2) {
    setError("Please enter both stock tickers.");
    return;
  }

  if (symbol1 === symbol2) {
    setError("Please enter two different stock tickers.");
    return;
  }


  setLoading(true);
  setError("");
  setComparison(null);

  try {
    const params = new URLSearchParams({
      ticker1: symbol1,
      ticker2: symbol2,
    });

    const response = await fetch(
      `http://127.0.0.1:8000/api/stocks/compare?${params}`
    );

    if (!response.ok) {
      throw new Error("Could not compare these stocks.");
    }

    const result: ComparisonResponse = await response.json();
    setComparison(result);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Something went wrong."
    );
  } finally {
    setLoading(false);
  }
}

const comparisonChartData = comparison
  ? Array.from(
      new Set([
        ...comparison.stock1.normalised_data.map(
          (item) => item.date
        ),
        ...comparison.stock2.normalised_data.map(
          (item) => item.date
        ),
      ])
    )
      .sort()
      .map((date) => ({
        date,
        stock1: comparison.stock1.normalised_data.find(
          (item) => item.date === date
        )?.normalised_price,
        stock2: comparison.stock2.normalised_data.find(
          (item) => item.date === date
        )?.normalised_price,
      }))
  : [];



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
    setPerformance(null);
    setDailyReturns([]);
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


try {
  // Your existing history fetch and processing code...

  setHistory(records);
  setLoadedTicker(result.ticker);

  // Performance fetch goes here!
  const performanceResponse = await fetch(
    `http://127.0.0.1:8000/api/stocks/${encodeURIComponent(symbol)}/performance`
  );

  if (!performanceResponse.ok) {
    throw new Error("Could not retrieve performance data.");
  }

  const performanceResult: PerformanceResponse =
    await performanceResponse.json();

  if (
  performanceResult.error ||
  !Number.isFinite(performanceResult.period_return_pct) ||
  !Number.isFinite(performanceResult.end_price) ||
  !Number.isFinite(performanceResult.start_price) ||
  !Number.isFinite(performanceResult.annualised_volatility_pct) ||
  !Number.isFinite(performanceResult.max_drawdown_pct)
) {
  throw new Error(
    performanceResult.error ?? "Invalid performance data returned."
  );
}

  setPerformance(performanceResult);

const returnsResponse = await fetch(
  `http://127.0.0.1:8000/api/stocks/${encodeURIComponent(symbol)}/daily-returns`
);

if (!returnsResponse.ok) {
  throw new Error("Could not retrieve daily returns.");
}

const returnsResult: DailyReturnsResponse =
  await returnsResponse.json();

setDailyReturns(returnsResult.data);


} catch (err) {
  // Keep your existing error-handling code here.
} finally {
  // Keep your existing loading-state code here.
}

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
        

<section className="comparison-panel">
  <h2>Portfolio Analytics</h2>
  <p className="hint">
    Add your holdings to calculate investment performance.
  </p>

  <div className="comparison-inputs">
    <div>
      <label htmlFor="portfolio-ticker">Stock ticker</label>
      <input
        id="portfolio-ticker"
        value={newTicker}
        onChange={(event) => setNewTicker(event.target.value)}
        placeholder="e.g. TCS.NS"
      />
    </div>

    <div>
      <label htmlFor="portfolio-quantity">Quantity</label>
      <input
        id="portfolio-quantity"
        type="number"
        min="1"
        step="1"
        value={newQuantity}
        onChange={(event) => setNewQuantity(event.target.value)}
      />
    </div>

    <div>
      <label htmlFor="purchase-price">Purchase price (₹)</label>
      <input
        id="purchase-price"
        type="number"
        min="0.01"
        step="any"
        value={newPurchasePrice}
        onChange={(event) => setNewPurchasePrice(event.target.value)}
        placeholder="3000"
      />
    </div>

    </div>
      

  <div className="search-row">
    <button onClick={addHolding}>Add holding</button>
    <button
      onClick={() => void analysePortfolio()}
      disabled={portfolioLoading || holdings.length === 0}
    >
      {portfolioLoading ? "Analysing..." : "Analyse portfolio"}
    </button>
  </div>

  {portfolioError && (
    <p className="error-message" role="alert">{portfolioError}</p>
  )}

  {holdings.length > 0 && (
    <div>
      <h3>Your holdings</h3>
      <div className="comparison-results">
        {holdings.map((holding, index) => (
          <div
            className="comparison-result-card"
            key={`${holding.ticker}-${index}`}
          >
            <h3>{holding.ticker}</h3>
            <p>Quantity: {holding.quantity}</p>
            <p>Purchase price: ₹{holding.purchase_price.toLocaleString("en-IN")}</p>
           
            <button
              onClick={() => {
                setHoldings(
                  holdings.filter((_, holdingIndex) => holdingIndex !== index)
                );
                setPortfolio(null);
                setPortfolioError("");
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )}

  {portfolio && (
    <>
      <h3>Portfolio Summary</h3>
      <div className="metrics-grid">
        <div className="metric-card">
          <span>Total invested</span>
          <strong>
            ₹{portfolio.summary.total_invested.toLocaleString("en-IN")}
          </strong>
        </div>

        <div className="metric-card">
          <span>Current value</span>
          <strong>
            ₹{portfolio.summary.total_current_value.toLocaleString("en-IN")}
          </strong>
        </div>

        <div className="metric-card">
          <span>Profit / Loss</span>
          <strong className={portfolio.summary.total_profit_loss >= 0 ? "positive" : "negative"}>
            ₹{portfolio.summary.total_profit_loss.toLocaleString("en-IN")}
          </strong>
        </div>

        <div className="metric-card">
          <span>Total return</span>
          <strong className={portfolio.summary.total_return_pct >= 0 ? "positive" : "negative"}>
            {portfolio.summary.total_return_pct.toFixed(2)}%
          </strong>
        </div>
      </div>
     

<h3>Portfolio Allocation</h3>
<p className="hint">
  Distribution of your portfolio by current market value.
</p>

<div className="chart-container">
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={allocationData}
        dataKey="value"
        nameKey="ticker"
        cx="50%"
        cy="50%"
        outerRadius={100}
        label={({ name, percent }: {
  name?: string;
  percent?: number;
}) => `${name ?? ""}: ${((percent ?? 0) * 100).toFixed(1)}%`}
      >
        {allocationData.map((entry, index) => (
          <Cell
            key={entry.ticker}
            fill={allocationColors[index % allocationColors.length]}
          />
        ))}
      </Pie>
      <Tooltip
        formatter={(value) => [
          `₹${Number(value).toLocaleString("en-IN")}`,
          "Current value",
        ]}
      />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
</div>

      <h3>Holding Performance</h3>
      <div className="comparison-results">
        {portfolio.holdings.map((holding, index) => (
          <div className="comparison-result-card" key={`${holding.ticker}-${index}`}>
            <h3>{holding.ticker}</h3>
            <p>Invested: ₹{holding.invested_amount.toLocaleString("en-IN")}</p>
            <p>Current value: ₹{holding.current_value.toLocaleString("en-IN")}</p>
            <p>
              Profit / Loss:{" "}
              <strong className={holding.profit_loss >= 0 ? "positive" : "negative"}>
                ₹{holding.profit_loss.toLocaleString("en-IN")}
              </strong>
            </p>
            <p>
              Return:{" "}
              <strong className={holding.return_pct >= 0 ? "positive" : "negative"}>
                {holding.return_pct.toFixed(2)}%
              </strong>
            </p>
          </div>
        ))}
      </div>
    </>
  )}
</section>

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

<section className="comparison-panel">
  <h2>Compare Stocks</h2>
  <p className="hint">
    Compare the performance and risk of two stocks.
  </p>

  <div className="comparison-inputs">
    <div>
      <label htmlFor="ticker-one">First stock</label>
      <input
        id="ticker-one"
        value={ticker}
        onChange={(event) => setTicker(event.target.value)}
        placeholder="e.g. TCS.NS"
      />
    </div>

    <div>
      <label htmlFor="ticker-two">Second stock</label>
      <input
        id="ticker-two"
        value={ticker2}
        onChange={(event) => setTicker2(event.target.value)}
        placeholder="e.g. RELIANCE.NS"
      />
    </div>
  </div>

  <button
    onClick={compareStocks}
    disabled={loading}
  >
    {loading ? "Comparing..." : "Compare stocks"}
  </button>

{comparison && (
  <>
  <div className="comparison-results">
    {[comparison.stock1, comparison.stock2].map((stock) => (
      <div className="comparison-result-card" key={stock.ticker}>
        <h3>{stock.ticker}</h3>

        <div className="comparison-metric">
          <span>Period Return</span>
          <strong className={stock.period_return_pct >= 0 ? "positive" : "negative"}>
            {stock.period_return_pct.toFixed(2)}%
          </strong>
        </div>

        <div className="comparison-metric">
          <span>Annualised Volatility</span>
          <strong>{stock.annualised_volatility_pct.toFixed(2)}%</strong>
        </div>

        <div className="comparison-metric">
          <span>Maximum Drawdown</span>
          <strong className="negative">
            {stock.max_drawdown_pct.toFixed(2)}%
          </strong>
        </div>
      </div>
    ))}
  </div>
   
<div className="normalised-chart">
  <h3>Normalised Performance</h3>

  <p className="hint">
    Both stocks start at 100. Values above 100 indicate gains;
    values below 100 indicate losses.
  </p>

  <div className="normalised-chart-container">
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={comparisonChartData}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#293246"
        />
        <XAxis
          dataKey="date"
          stroke="#94a3b8"
          tick={{ fontSize: 11 }}
          minTickGap={30}
        />
        <YAxis
          stroke="#94a3b8"
          tick={{ fontSize: 11 }}
          domain={["auto", "auto"]}
        />
        <Tooltip
          formatter={(value, name) => [
            value == null ? "No data" : Number(value).toFixed(2),
            name,
          ]}
          contentStyle={{
            backgroundColor: "#111722",
            border: "1px solid #293246",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <ReferenceLine
          y={100}
          stroke="#94a3b8"
          strokeDasharray="5 5"
        />
        <Line
          type="monotone"
          dataKey="stock1"
          name={comparison.stock1.ticker}
          stroke="#a5b4fc"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="stock2"
          name={comparison.stock2.ticker}
          stroke="#4ade80"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
</div>
  </>
)}


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
            
{performance && (
  <div className="metrics-grid">
    <div className="metric-card">
      <span>Period return</span>
      <strong
        className={
          performance.period_return_pct! >= 0
            ? "positive"
            : "negative"
        }
      >
        {performance.period_return_pct! > 0 ? "+" : ""}
        {performance.period_return_pct!.toFixed(2)}%
      </strong>
      <small>Over the last month</small>
    </div>

    <div className="metric-card">
      <span>Starting close</span>
      <strong>
        ₹{performance.start_price!.toLocaleString("en-IN", {
          maximumFractionDigits: 2,
        })}
      </strong>
      <small>First available observation</small>
    </div>

    <div className="metric-card">
      <span>Latest close</span>
      <strong>
        ₹{performance.end_price!.toLocaleString("en-IN", {
          maximumFractionDigits: 2,
        })}
      </strong>
      <small>Last available observation</small>
    </div>
    <div className="metric-card">
  <p className="metric-label">Annualised Volatility</p>
  <h3>
    {performance.annualised_volatility_pct!.toFixed(2)}%
  </h3>
  <p className="hint">
    Annualised variability of daily returns
  </p>
</div>

<div className="metric-card">
  <p className="metric-label">Maximum Drawdown</p>
  <h3 className="negative">
    {performance.max_drawdown_pct!.toFixed(2)}%
  </h3>
  <p className="hint">
    Largest peak-to-trough decline
  </p>
</div>
  </div>
)}

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
        
{dailyReturns.length > 0 && (
  <section className="chart-section">
    <h2>Daily Returns</h2>
    <p className="hint">
      Percentage change from the previous trading day's close
    </p>

    <div className="chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={dailyReturns}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#293246"
          />

          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
          />

          <YAxis
            stroke="#94a3b8"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `${value}%`}
          />

          <Tooltip
            formatter={(value) => [
              `${Number(value).toFixed(2)}%`,
              "Daily return",
            ]}
            contentStyle={{
              backgroundColor: "#111722",
              border: "1px solid #293246",
              borderRadius: "8px",
            }}
          />

          <ReferenceLine y={0} stroke="#94a3b8" />

          <Bar
            dataKey="daily_return_pct"
            fill="#a5b4fc"
            radius={[3, 3, 0, 0]}
          />
        </BarChart>
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
