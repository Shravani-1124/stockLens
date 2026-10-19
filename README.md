# StockLens — Stock Market & Portfolio Analytics

StockLens is a full-stack web application for exploring stock market data, comparing stock performance, analysing portfolio returns and risk, and evaluating financial fundamentals against the Nifty 50 benchmark.

**Live Demo:** https://stocklens-eight-omega.vercel.app

**Backend API:** https://stocklens-suj1.onrender.com

**API Documentation:** https://stocklens-suj1.onrender.com/docs

---

## Features

### 1. Stock Explorer
- View historical stock prices through interactive charts.
- Analyse period returns, starting and latest closing prices, annualised volatility, and maximum drawdown.
- Visualise daily stock returns.

### 2. Stock Comparison
- Compare two stocks side by side.
- Visualise normalised performance from a common starting point.
- Analyse relative stock performance over time.

### 3. Portfolio Analytics
- Add multiple stock holdings with quantities and purchase prices.
- Calculate total invested amount and current portfolio value.
- Track profit or loss and percentage returns.
- View individual holding performance.
- Visualise portfolio allocation using a pie chart.

### 4. Advanced Analytics

**Portfolio Risk Analysis**
- Annualised portfolio return and volatility.
- Maximum drawdown and Sharpe ratio.
- Portfolio concentration analysis.
- Largest holding and allocation breakdown.

**Stock Fundamentals**
- Company name, sector and industry.
- Market capitalisation, P/E ratio and price-to-book ratio.
- Return on equity, revenue growth and profit margin, where available.

**Nifty 50 Benchmark Comparison**
- Compare stock performance against the Nifty 50 index.
- Visualise normalised performance.
- Calculate relative outperformance.

---

## Tech Stack

| Component | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Charts | Recharts |
| Backend | Python, FastAPI |
| Financial Data | yfinance, Yahoo Finance |
| Data Processing | Pandas, NumPy |
| API Validation | Pydantic |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |
| Version Control | Git, GitHub |

---

## Architecture

```text
React + TypeScript Frontend
           |
           | HTTP Requests
           v
      FastAPI Backend
           |
           +-- Stock History
           +-- Performance Metrics
           +-- Portfolio Analytics
           +-- Risk Analysis
           +-- Financial Fundamentals
           +-- Nifty 50 Benchmark
           |
           v
  Yahoo Finance via yfinance
```

The frontend collects user inputs and displays financial metrics and interactive charts. The FastAPI backend retrieves financial data, performs calculations and returns structured responses through REST API endpoints.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stocks/{ticker}/history` | Retrieve historical stock prices |
| GET | `/api/stocks/{ticker}/performance` | Calculate performance and risk metrics |
| GET | `/api/stocks/{ticker}/daily-returns` | Retrieve daily returns |
| GET | `/api/stocks/{ticker}/fundamentals` | Retrieve available company fundamentals |
| GET | `/api/stocks/{ticker}/benchmark?period=1y` | Compare against the Nifty 50 |
| GET | `/api/stocks/compare?ticker1=TCS.NS&ticker2=RELIANCE.NS` | Compare two stocks |
| POST | `/api/portfolio/analyse` | Analyse portfolio returns and value |
| POST | `/api/portfolio/risk` | Calculate portfolio risk metrics |

Explore and test the endpoints through the [interactive API documentation](https://stocklens-suj1.onrender.com/docs).

---

## Running Locally

### Prerequisites
- Python 3.10 or later
- Node.js and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Shravani-1124/stockLens.git
cd stockLens
```

### 2. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

### 3. Start the frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, usually `http://localhost:5173`.

**Note:** The frontend currently uses the deployed backend URL. For local development, update the frontend API URLs to `http://127.0.0.1:8000` and ensure the backend CORS configuration allows the local frontend origin.

---

## Data Sources and Limitations

- Financial data is retrieved through `yfinance` from Yahoo Finance.
- Data availability depends on the selected ticker and the provider.
- The latest available closing price may not represent a real-time market price.
- Portfolio risk metrics are historical estimates and do not guarantee future performance.
- Risk calculations apply current portfolio weights to historical returns rather than simulating historical rebalancing.
- The Sharpe ratio uses an assumed annual risk-free rate of 6%.
- The free-tier backend may take longer to respond after a period of inactivity.

**Disclaimer:** StockLens is an educational project and does not provide personalised financial advice or guarantee investment outcomes.

---

## Future Improvements

- Automated testing for API endpoints and financial calculations.
- Additional benchmarks and configurable analysis periods.
- More detailed historical financial analysis.
- Enhanced portfolio risk modelling.

---

## Author

**Shravani**  
B.Tech Physics, IIT Bombay

[GitHub Profile](https://github.com/Shravani-1124)

[Project Repository](https://github.com/Shravani-1124/stockLens)
