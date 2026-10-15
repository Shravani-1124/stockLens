
from typing import Literal

import numpy as np
import pandas as pd
import yfinance as yf

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api", tags=["Financial Analytics"])

TRADING_DAYS = 252
RISK_FREE_RATE = 0.06  # Assumed annual rate: 6%


class RiskHolding(BaseModel):
    ticker: str = Field(min_length=1)
    quantity: float = Field(gt=0)


class RiskRequest(BaseModel):
    holdings: list[RiskHolding] = Field(min_length=1, max_length=30)
    period: Literal["6mo", "1y", "2y", "5y"] = "1y"


def get_history(ticker: str, period: str = "1y") -> pd.DataFrame:
    """Fetch daily adjusted closing prices for a ticker."""
    try:
        history = yf.Ticker(ticker.strip().upper()).history(
            period=period,
            auto_adjust=True,
        )
        if history.empty or "Close" not in history:
            raise ValueError("No price history available.")

        return history[["Close"]].dropna()
    except Exception as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Could not fetch data for {ticker}: {exc}",
        ) from exc


def calculate_drawdown(prices: pd.Series) -> float:
    running_peak = prices.cummax()
    drawdowns = prices / running_peak - 1
    return float(drawdowns.min() * 100)


@router.post("/portfolio/risk")
def portfolio_risk(request: RiskRequest):
    """Estimate portfolio volatility, drawdown, concentration and Sharpe ratio."""
    price_series = {}
    current_values = {}

    for holding in request.holdings:
        ticker = holding.ticker.strip().upper()
        history = get_history(ticker, request.period)
        prices = history["Close"]

        if len(prices) < 30:
            raise HTTPException(
                status_code=422,
                detail=f"Not enough price history for {ticker}.",
            )

        price_series[ticker] = prices
        current_values[ticker] = float(prices.iloc[-1]) * holding.quantity

    prices_df = pd.concat(price_series, axis=1).dropna()

    if len(prices_df) < 30:
        raise HTTPException(
            status_code=422,
            detail="Not enough overlapping trading dates across holdings.",
        )

    daily_returns = prices_df.pct_change().dropna()
    total_value = sum(current_values.values())

    if total_value <= 0:
        raise HTTPException(
            status_code=422,
            detail="Portfolio value must be positive.",
        )

    weights = {
        ticker: value / total_value
        for ticker, value in current_values.items()
    }

    # Estimate portfolio returns using current market-value weights.
    portfolio_returns = sum(
        daily_returns[ticker] * weights[ticker]
        for ticker in daily_returns.columns
    )

    annual_volatility = float(
        portfolio_returns.std(ddof=1) * np.sqrt(TRADING_DAYS) * 100
    )

    annual_return = float(
        ((1 + portfolio_returns).prod()
         ** (TRADING_DAYS / len(portfolio_returns)) - 1) * 100
    )

    daily_rf = (1 + RISK_FREE_RATE) ** (1 / TRADING_DAYS) - 1
    excess_returns = portfolio_returns - daily_rf
    daily_std = float(portfolio_returns.std(ddof=1))

    sharpe_ratio = (
        float(excess_returns.mean() / daily_std * np.sqrt(TRADING_DAYS))
        if daily_std > 0
        else None
    )

    portfolio_growth = (1 + portfolio_returns).cumprod()
    portfolio_growth = pd.concat(
        [pd.Series([1.0]), portfolio_growth.reset_index(drop=True)],
        ignore_index=True,
    )
    max_drawdown = calculate_drawdown(portfolio_growth)

    allocations = [
        {
            "ticker": ticker,
            "current_value": round(value, 2),
            "weight_percent": round(weights[ticker] * 100, 2),
        }
        for ticker, value in current_values.items()
    ]

    largest_holding = max(allocations, key=lambda item: item["weight_percent"])

    # Herfindahl-Hirschman Index: 0 to 10,000.
    concentration_score = sum(
        (item["weight_percent"] / 100) ** 2
        for item in allocations
    ) * 10000

    return {
        "period": request.period,
        "risk_free_rate_percent": RISK_FREE_RATE * 100,
        "portfolio_value": round(total_value, 2),
        "annualised_volatility_percent": round(annual_volatility, 2),
        "annualised_return_percent": round(annual_return, 2),
        "maximum_drawdown_percent": round(max_drawdown, 2),
        "sharpe_ratio": (
            round(sharpe_ratio, 3) if sharpe_ratio is not None else None
        ),
        "concentration_score": round(concentration_score, 2),
        "largest_holding": largest_holding,
        "allocations": allocations,
        "methodology": (
            "Historical estimates using current market-value weights. "
            "Weights are held constant over the selected historical period. "
            "Past performance does not predict future returns."
        ),
    }


@router.get("/stocks/{ticker}/fundamentals")
def stock_fundamentals(ticker: str):
    """Return selected company fundamentals from Yahoo Finance."""
    try:
        info = yf.Ticker(ticker.strip().upper()).info or {}

        if not info or not info.get("symbol"):
            raise ValueError("Company information is unavailable.")

        def number(key):
            value = info.get(key)
            if value is None:
                return None
            try:
                value = float(value)
                return value if np.isfinite(value) else None
            except (TypeError, ValueError):
                return None

        return {
            "ticker": ticker.strip().upper(),
            "company_name": info.get("longName") or info.get("shortName"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "currency": info.get("currency"),
            "market_cap": number("marketCap"),
            "trailing_pe": number("trailingPE"),
            "forward_pe": number("forwardPE"),
            "price_to_book": number("priceToBook"),
            "return_on_equity_percent": (
                number("returnOnEquity") * 100
                if number("returnOnEquity") is not None else None
            ),
            "revenue_growth_percent": (
                number("revenueGrowth") * 100
                if number("revenueGrowth") is not None else None
            ),
            "profit_margin_percent": (
                number("profitMargins") * 100
                if number("profitMargins") is not None else None
            ),
            "data_source": "Yahoo Finance",
            "note": (
                "Some fields may be unavailable. Ratios and reported figures "
                "depend on the source's latest available company data."
            ),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not retrieve fundamentals for {ticker}: {exc}",
        ) from exc


@router.get("/stocks/{ticker}/benchmark")
def benchmark_comparison(
    ticker: str,
    period: Literal["6mo", "1y", "2y", "5y"] = "1y",
):
    """Compare a stock's indexed price performance with the Nifty 50."""
    stock_history = get_history(ticker, period)
    benchmark_history = get_history("^NSEI", period)

    combined = pd.concat(
        [
            stock_history["Close"].rename("stock"),
            benchmark_history["Close"].rename("benchmark"),
        ],
        axis=1,
    ).dropna()

    if len(combined) < 2:
        raise HTTPException(
            status_code=422,
            detail="Not enough overlapping data to compare performance.",
        )

    stock_start = float(combined["stock"].iloc[0])
    benchmark_start = float(combined["benchmark"].iloc[0])

    if stock_start <= 0 or benchmark_start <= 0:
        raise HTTPException(
            status_code=422,
            detail="Invalid starting prices for comparison.",
        )

    combined["stock_indexed"] = combined["stock"] / stock_start * 100
    combined["benchmark_indexed"] = (
        combined["benchmark"] / benchmark_start * 100
    )

    stock_return = (
        combined["stock"].iloc[-1] / stock_start - 1
    ) * 100
    benchmark_return = (
        combined["benchmark"].iloc[-1] / benchmark_start - 1
    ) * 100

    chart_data = [
        {
            "date": date.strftime("%Y-%m-%d"),
            "stock": round(float(row["stock_indexed"]), 2),
            "benchmark": round(float(row["benchmark_indexed"]), 2),
        }
        for date, row in combined.iterrows()
    ]

    return {
        "ticker": ticker.strip().upper(),
        "benchmark": "NIFTY 50",
        "period": period,
        "stock_return_percent": round(float(stock_return), 2),
        "benchmark_return_percent": round(float(benchmark_return), 2),
        "outperformance_percent": round(
            float(stock_return - benchmark_return), 2
        ),
        "chart_data": chart_data,
    }
