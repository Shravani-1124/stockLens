
from fastapi import FastAPI
import yfinance as yf
from fastapi.middleware.cors import CORSMiddleware
from app.metrics import calculate_period_return

app = FastAPI(
    title="StockLens API",
    description="A stock analysis and financial analytics platform.",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "message": "Welcome to StockLens!",
        "status": "running",
    }
@app.get("/api/stocks/{ticker}/history")
def get_stock_history(ticker: str):
    stock = yf.Ticker(ticker)
    history = stock.history(period="1mo")

    if history.empty:
        raise HTTPException(
            status_code=404,
            detail="No historical data found for this ticker.",
        )

    history = history.reset_index()

    return {
        "ticker": ticker.upper(),
        "data": history.to_dict(orient="records"),
    }

@app.get("/api/stocks/{ticker}/performance")
def get_stock_performance(ticker: str):
    stock = yf.Ticker(ticker)
    history = stock.history(period="1mo")

    if history.empty or len(history) < 2:
        return {
            "ticker": ticker,
            "error": "Not enough historical data to calculate returns."
        }

    prices = history["Close"].dropna().tolist()

    if len(prices) < 2:
        return {
            "ticker": ticker,
            "error": "Not enough valid closing prices."
        }

    period_return = calculate_period_return(prices)

    return {
        "ticker": ticker,
        "start_price": prices[0],
        "end_price": prices[-1],
        "period_return_pct": round(period_return, 2)
    }
