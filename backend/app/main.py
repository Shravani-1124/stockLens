from fastapi import FastAPI, HTTPException
import yfinance as yf
from fastapi.middleware.cors import CORSMiddleware

from app.metrics import (
    calculate_period_return,
    calculate_daily_returns,
    calculate_annualised_volatility,
    calculate_max_drawdown,
)


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

    # Convert missing values such as NaN into None,
    # which JSON can represent as null.
    history = history.astype(object).where(
        history.notna(), None
    )

    return {
        "ticker": ticker.upper(),
        "data": history.to_dict(orient="records"),
    }



@app.get("/api/stocks/{ticker}/performance")
def get_stock_performance(ticker: str):
    stock = yf.Ticker(ticker)
    history = stock.history(period="1mo")

    if history.empty:
        raise HTTPException(
            status_code=404,
            detail="No historical data found for this ticker.",
        )

    prices = history["Close"].dropna().tolist()

    if len(prices) < 3:
        raise HTTPException(
            status_code=422,
            detail="At least three valid closing prices are required "
                   "for risk analysis.",
        )

    period_return = calculate_period_return(prices)

    daily_returns = calculate_daily_returns(prices)

    annualised_volatility = calculate_annualised_volatility(
        daily_returns
    )

    max_drawdown = calculate_max_drawdown(prices)

    return {
        "ticker": ticker.upper(),
        "start_price": round(prices[0], 2),
        "end_price": round(prices[-1], 2),
        "period_return_pct": round(period_return, 2),
        "annualised_volatility_pct": round(
            annualised_volatility, 2
        ),
        "max_drawdown_pct": round(max_drawdown, 2),
    }
