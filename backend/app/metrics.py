
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
