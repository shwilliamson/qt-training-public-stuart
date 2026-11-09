# Neighborhood Pizza
**Online Pickup Ordering | Business Requirements**

## Background

We operate a neighborhood pizza shop and currently take most of our orders over the phone. We'd like customers to be able to place pickup orders online so our employees can spend less time answering calls.

Customers should be able to customize their pizzas, review what they're ordering, and submit an order for pickup. Our kitchen staff also need a way to see incoming orders and keep track of which ones are ready.

## 1. Ordering a Pizza

Customers should be able to choose the size of their pizza and add whichever toppings they want.

Our menu is:

| Item | Price |
|---|---:|
| Small pizza (10") | $10.00 |
| Large pizza (14") | $14.00 |
| Pepperoni | $2.00 |
| Mushrooms | $2.00 |
| Onions | $2.00 |
| Green peppers | $2.00 |

Each topping costs an additional $2.00 per pizza, regardless of size. Customers can order a plain cheese pizza or select multiple toppings.

**Acceptance criteria**

- AC-1.1: Customers can select either size and any combination of available toppings.
- AC-1.2: Customers can see the price of their pizza before adding it to an order.
- AC-1.3: The price updates correctly when customers add or remove toppings.

## 2. Reviewing an Order

Customers often order several different pizzas at once. We need them to be able to review everything before placing their order.

**Acceptance criteria**

- AC-2.1: Customers can add multiple pizzas with different sizes and toppings to the same order.
- AC-2.2: Customers can see the details and price of each pizza, along with the total cost.
- AC-2.3: Customers can change quantities or remove pizzas before submitting the order, and the total updates accordingly.

## 3. Placing an Order

Once customers are happy with their selections, they should be able to enter their name and place an order for pickup.

We'll continue collecting payment at the counter when customers arrive.

**Acceptance criteria**

- AC-3.1: Customers cannot submit an empty order or an order without providing their name.
- AC-3.2: Customers receive an order confirmation showing an order number, their name, the items ordered, and the total.
- AC-3.3: Once submitted, an order becomes available for our kitchen staff to prepare.

## 4. Managing Kitchen Orders

Our kitchen staff need to see incoming orders without having to ask the person at the register what was ordered.

They also need to know which orders still need to be prepared and which are ready for pickup.

We occasionally have to close and reopen applications or restart our computers during the day. We can't afford to lose track of customer orders when that happens.

**Acceptance criteria**

- AC-4.1: Kitchen staff can view submitted orders, including the customer's name, order number, pizza details, and total.
- AC-4.2: New orders are marked as **New**, and staff can change their status to **Ready** when preparation is complete.
- AC-4.3: Orders and their current statuses remain available after the application is closed and reopened.

## 5. Additional Expectations

We want the ordering experience to be simple enough for customers to use without assistance. Prices should be clear, and customers should know whether their order was successfully submitted.

For now, we're only offering pickup orders. We don't need delivery, online payments, customer accounts, coupons, or loyalty programs.

We aren't charging additional taxes or fees through the application.
