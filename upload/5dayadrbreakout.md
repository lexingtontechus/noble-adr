# Concept Summary

You want to build a 5-Day ADR Quarter Breakout Strategy.
The indicator will calculate the market’s recent average daily movement, divide that movement into four equal zones, then test whether price breaking into or beyond those zones creates a measurable trading edge.

# Main Hypothesis

The goal is to find out whether US30 has predictable behavior after breaking specific ADR quarters.

The strategy is viable only if certain quarter breakouts show:

* repeatable win rate,
* positive expectancy,
* acceptable drawdown,
* and stable Kelly sizing.

# Core Logic

- Use the prior 5 daily candles to calculate the 5-day Average Daily Range:
- ADR_5 = average(High - Low) \text{ over prior 5 days}
- Then divide that ADR into four quarters:
- Quarter = ADR_5 / 4

From the current day’s open, plot levels:

1. Upside levels

* Q1 Up = Open + 1 Quarter
* Q2 Up = Open + 2 Quarters
* Q3 Up = Open + 3 Quarters
* Q4 Up = Open + 4 Quarters

2. Downside levels

* Q1 Down = Open - 1 Quarter
* Q2 Down = Open - 2 Quarters
* Q3 Down = Open - 3 Quarters
* Q4 Down = Open - 4 Quarters

3. Trade Test Rules

When price breaks upward through a quarter level:

* Enter long
* Stop loss = 1 quarter below entry
* Take profit = 2 quarters above entry

When price breaks downward through a quarter level:

* Enter short
* Stop loss = 1 quarter above entry
* Take profit = 2 quarters below entry

This creates a fixed volatility-adjusted structure:

* Risk = 1 ADR quarter
* Reward = 2 ADR quarters
* Reward-to-risk = 2:1

For each trading day:

1. Calculate the prior 5-day ADR.
2. Calculate quarter size.
3. Plot or record the 8 ADR quarter levels.
4. Detect whether price breaks Q1, Q2, Q3, or Q4 upward or downward.
5. Simulate trade outcome:
    * Did take profit hit first?
    * Did stop loss hit first?
    * Did neither hit before close?
6. Record results by:
    * Direction: long or short
    * Quarter level: Q1, Q2, Q3, Q4
    * Win rate
    * Loss rate
    * Average return
    * Max drawdown
    * Expectancy
    * Kelly percentage

## Kelly Criterion Layer
For each quarter setup, calculate:
Kelly = \frac{bp - q}{b}
Where:

* b = reward/risk ratio, usually 2
* p = win probability
* q = loss probability

The output should tell you whether each quarter breakout has a positive statistical edge and how aggressively it should be sized.

## Clean Indicator Goal

The first version should output a table like:
```
Trades | Win Rate | Expectancy | Kelly % | Q1 Up Break | 
300    | 54% | Positive | 31% | Q2 Up Break |
220    | 57% | Positive | 35% | Q3 Down Break |
180    | 49% | Negative | 0%  | Q4 Up Break |
90     | 42% | Negative | 0%  | Q4 Up Break |
```
