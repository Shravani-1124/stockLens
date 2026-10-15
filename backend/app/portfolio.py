
def calculate_holding_metrics(
    quantity: int,
    purchase_price: float,
    current_price: float,
) -> dict:
    """
    Calculate investment metrics for one stock holding.
    """

    if quantity <= 0:
        raise ValueError("Quantity must be positive.")

    if purchase_price <= 0:
        raise ValueError("Purchase price must be positive.")

    if current_price <= 0:
        raise ValueError("Current price must be positive.")

    invested_amount = quantity * purchase_price
    current_value = quantity * current_price

    profit_loss = current_value - invested_amount

    return_percentage = (
        profit_loss / invested_amount
    ) * 100

    return {
        "quantity": quantity,
        "purchase_price": round(purchase_price, 2),
        "current_price": round(current_price, 2),
        "invested_amount": round(invested_amount, 2),
        "current_value": round(current_value, 2),
        "profit_loss": round(profit_loss, 2),
        "return_pct": round(return_percentage, 2),
    }
