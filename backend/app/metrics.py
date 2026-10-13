import statistics
import math
def calculate_period_return(prices: list[float]) -> float:
    """
    Calculate the percentage return between the first
    and last prices in a series.
    """
    if len(prices) < 2:
        raise ValueError("At least two prices are required.")

    start_price = prices[0]
    end_price = prices[-1]

    if start_price <= 0:
        raise ValueError("The starting price must be positive.")

    period_return = (
        (end_price - start_price) / start_price
    ) * 100

    return period_return

def calculate_daily_returns(prices: list[float]) -> list[float]:
    """
    Calculate percentage returns between consecutive closing prices.
    """
    if len(prices) < 2:
        raise ValueError("At least two prices are required.")

    if any(price <= 0 for price in prices):
        raise ValueError("All prices must be positive.")

    daily_returns = []

    for i in range(1, len(prices)):
        previous_price = prices[i - 1]
        current_price = prices[i]

        daily_return = (
            (current_price - previous_price) / previous_price
        ) * 100

        daily_returns.append(daily_return)

    return daily_returns

def calculate_annualised_volatility(
    daily_returns: list[float],
) -> float:
    """
    Calculate annualised volatility from daily percentage returns.
    """
    if len(daily_returns) < 2:
        raise ValueError("At least two daily returns are required.")

    daily_volatility = statistics.stdev(daily_returns)

    annualised_volatility = daily_volatility * math.sqrt(252)

    return annualised_volatility

def calculate_max_drawdown(prices: list[float]) -> float:
    """
    Calculate maximum drawdown as a negative percentage.
    """
    if not prices:
        raise ValueError("At least one price is required.")

    if any(price <= 0 for price in prices):
        raise ValueError("All prices must be positive.")

    peak = prices[0]
    max_drawdown = 0.0

    for price in prices:
        peak = max(peak, price)

        drawdown = ((price - peak) / peak) * 100

        max_drawdown = min(max_drawdown, drawdown)

    return max_drawdown
