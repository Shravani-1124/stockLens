from fastapi import FastAPI, HTTPException
import yfinance as yf
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from app.portfolio import calculate_holding_metrics

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
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
class HoldingInput(BaseModel):
    ticker: str = Field(min_length=1)
    quantity: int = Field(gt=0)
    purchase_price: float = Field(gt=0)
    current_price: float = Field(gt=0)


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

@app.get("/api/stocks/{ticker}/daily-returns")
def get_daily_returns(ticker: str):
    stock = yf.Ticker(ticker)
    history = stock.history(period="1mo")

    if history.empty:
        raise HTTPException(
            status_code=404,
            detail="No historical data found for this ticker.",
        )

    # Keep only valid closing prices.
    history = history.dropna(subset=["Close"])
    prices = history["Close"].tolist()

    if len(prices) < 2:
        raise HTTPException(
            status_code=422,
            detail="At least two valid closing prices are required.",
        )

    daily_returns = calculate_daily_returns(prices)

    return {
        "ticker": ticker.upper(),
        "data": [
            {
                "date": history.index[i].strftime("%Y-%m-%d"),
                "daily_return_pct": round(daily_returns[i - 1], 4),
            }
            for i in range(1, len(prices))
        ],
    }


@app.get("/api/stocks/compare")
def compare_stocks(ticker1: str, ticker2: str):
    def analyse(ticker: str):
        symbol = ticker.strip().upper()

        stock = yf.Ticker(symbol)
        history = stock.history(period="1mo")

        if history.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No historical data found for {symbol}.",
            )

        history = history.dropna(subset=["Close"])

        prices = history["Close"].tolist()

        if len(prices) < 3:
            raise HTTPException(
                status_code=422,
                detail=f"Not enough closing prices for {symbol}.",
            )

        daily_returns = calculate_daily_returns(prices)
        period_return = calculate_period_return(prices)
        volatility = calculate_annualised_volatility(
            daily_returns
        )
        max_drawdown = calculate_max_drawdown(prices)

        # Convert prices into an index starting at 100.
        starting_price = prices[0]

        normalised_data = [
            {
                "date": date.strftime("%Y-%m-%d"),
                "normalised_price": round(
                    (price / starting_price) * 100, 2
                ),
            }
            for date, price in zip(history.index, prices)
        ]

        return {
            "ticker": symbol,
            "start_price": round(prices[0], 2),
            "end_price": round(prices[-1], 2),
            "period_return_pct": round(period_return, 2),
            "annualised_volatility_pct": round(
                volatility, 2
            ),
            "max_drawdown_pct": round(max_drawdown, 2),
            "normalised_data": normalised_data,
        }

    if ticker1.strip().upper() == ticker2.strip().upper():
        raise HTTPException(
            status_code=422,
            detail="Please provide two different stock tickers.",
        )

    first_stock = analyse(ticker1)
    second_stock = analyse(ticker2)

    return {
        "stock1": first_stock,
        "stock2": second_stock,
    }

@app.post("/api/portfolio/analyse")
def analyse_portfolio(holdings: list[HoldingInput]):
    if not holdings:
        raise HTTPException(
            status_code=422,
            detail="Please provide at least one holding.",
        )

    results = []
    total_invested = 0
    total_current_value = 0

    for holding in holdings:
        metrics = calculate_holding_metrics(
            quantity=holding.quantity,
            purchase_price=holding.purchase_price,
            current_price=holding.current_price,
        )

        results.append({
            "ticker": holding.ticker.strip().upper(),
            **metrics,
        })

        total_invested += metrics["invested_amount"]
        total_current_value += metrics["current_value"]

    total_profit_loss = total_current_value - total_invested

    total_return_pct = (
        (total_profit_loss / total_invested) * 100
        if total_invested > 0
        else 0
    )

    return {
        "holdings": results,
        "summary": {
            "total_invested": round(total_invested, 2),
            "total_current_value": round(total_current_value, 2),
            "total_profit_loss": round(total_profit_loss, 2),
            "total_return_pct": round(total_return_pct, 2),
        },
    }