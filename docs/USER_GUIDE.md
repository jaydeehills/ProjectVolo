# ProjectVolo — User Guide

> **Heads up:** This guide assumes you know nothing about prediction markets or trading. If you've never heard the word "liquidity" and don't care, great — this is written for you. We'll build up from zero.

---

## Table of Contents

1. [What is a Prediction Market?](#1-what-is-a-prediction-market)
2. [What is ProjectVolo?](#2-what-is-projectvolo)
3. [The Stats Bar](#3-the-stats-bar)
4. [Research Alerts — The Signal Board](#4-research-alerts--the-signal-board)
5. [What is Edge?](#5-what-is-edge)
6. [What is Expected Value (EV)?](#6-what-is-expected-value-ev)
7. [What is Confidence?](#7-what-is-confidence)
8. [The Edge Distribution Chart](#8-the-edge-distribution-chart)
9. [The Markets Tab](#9-the-markets-tab)
10. [The Activity Log](#10-the-activity-log)
11. [The Full Pipeline](#11-the-full-pipeline)
12. [How to Place a Bet Using This Tool](#12-how-to-place-a-bet-using-this-tool)
13. [What the AI Actually Does](#13-what-the-ai-actually-does)
14. [Limitations and Risks](#14-limitations-and-risks)
15. [Glossary](#15-glossary)

---

## 1. What is a Prediction Market?

### The basic idea

A prediction market is a place where people bet real money on whether something will happen.

Not sports betting exactly — more like a stock market for future events. The question might be: *"Will the Fed cut interest rates before December?"* or *"Will SpaceX successfully land on Mars by 2027?"*

If you think YES, you buy a YES share. If you think NO, you buy a NO share. When the event resolves (the answer becomes known), whoever was right gets paid out and whoever was wrong loses their stake.

### What is Polymarket?

[Polymarket](https://polymarket.com) is the largest prediction market platform, running on the Polygon blockchain. It hosts hundreds of active markets on politics, economics, sports, crypto, science, and more. All prices are in USDC (a stablecoin pegged to the US dollar), so $1 always means $1 — no crypto volatility involved in the prices themselves.

ProjectVolo reads data directly from Polymarket's public API.

### What does the price mean?

This is the key insight: **the price of a YES share is the market's collective estimate of the probability that the event happens.**

- A YES price of **$0.45** means traders collectively believe there's roughly a **45% chance** this resolves YES.
- A YES price of **$0.90** means traders collectively believe there's roughly a **90% chance** this happens.
- A YES price of **$0.08** means traders think it's only an **8% chance**.

The YES price and NO price always add up to approximately $1.00 (minus tiny fees). So if YES is $0.45, NO is about $0.55.

### How do you make money?

Let's walk through a real example with made-up numbers.

---

**Scenario:** The market asks: *"Will the Chicago Bulls win the NBA Championship this season?"*

- Current YES price: **$0.12** (market says 12% chance)
- You think the Bulls are actually a 30% chance to win — the market is underestimating them
- You buy **100 YES shares** at $0.12 each → you spend **$12.00**

Now two things can happen:

**If the Bulls win (YES resolves):**
Each of your 100 shares pays out $1.00 → you receive **$100.00**
Your profit: $100 − $12 = **$88 profit** on a $12 bet. That's a 733% return.

**If the Bulls don't win (NO resolves):**
Your 100 YES shares are worth $0. You lose your **$12.00**.

---

The key is that you don't need to be right *most of the time* — you need to be right *more often than the price implies*. If the market says 12% and you correctly identify it should be 30%, you have a profitable edge even though you'll still lose that bet 70% of the time.

### Buying NO

You can also bet that something *won't* happen by buying NO shares.

Same example: If you thought the Bulls had no chance at all — say only 3% — you'd buy NO shares at $0.88. If they don't win (which happens 97% of the time), each NO share pays out $1.00.

---

## 2. What is ProjectVolo?

ProjectVolo is a research tool that automatically scans Polymarket for potential mispricings.

Here's the problem it solves: Polymarket has hundreds of active markets. Manually reading through each one, forming a probability estimate, and comparing it to the current price would take hours. And you'd need to do it every day as prices shift.

ProjectVolo automates this by:

1. **Fetching all active, high-volume markets** from Polymarket every 60 seconds
2. **Running each question through an AI model** (Claude Haiku) that estimates the true probability
3. **Comparing the AI estimate to the current market price** to calculate the edge
4. **Surfacing only the markets where the gap is large enough** to be potentially interesting

Think of it as a research assistant that reads every market for you and flags the ones worth a closer look. It does not place bets. It does not manage money. It just finds candidates for your own manual review.

---

## 3. The Stats Bar

The four cards at the top of the dashboard give you a quick health check of what the tool is seeing right now.

### Markets Tracked
The total number of active Polymarket markets currently passing the filters (minimum $500k trading volume, closing more than 7 days from now). This is your universe of markets being analyzed.

### Research Alerts
How many of those markets have a signal right now — meaning the AI found a meaningful gap between its probability estimate and the market price. This is the number of markets currently showing in the Research Alerts panel below.

### Avg Edge
The average edge across all current Research Alerts, expressed as a percentage. Edge is explained in depth in [Section 5](#5-what-is-edge). For now: higher is better. A 15% average edge means the AI is, on average, disagreeing with the market by 15 percentage points on the signaled markets.

### Last Refresh
When the data was last updated. The dashboard polls for new data every 30 seconds, but the underlying AI estimates are cached for 24 hours (since the AI's knowledge doesn't change minute-to-minute). The full scan re-runs every 5 minutes.

---

## 4. Research Alerts — The Signal Board

This is the heart of ProjectVolo. Each row is a market where the AI has found a potentially meaningful discrepancy with the current price.

### The columns explained

**Question**
The prediction market question being analyzed. Click the star icon to add it to your Watchlist.

**Category**
What type of event this is — Politics, Sports, Crypto, Economics, Entertainment, etc. Derived from the event's topic.

**Signal**
There are three possible values:

- **BUY YES** 🟢 — The AI thinks YES is more likely than the market price implies. The AI estimate is at least 8 percentage points higher than the current YES price.
- **BUY NO** 🔴 — The AI thinks NO is more likely than the market price implies. The AI estimate is at least 8 percentage points lower than the current YES price.
- **HOLD** — The gap isn't large enough to be interesting, or confidence is too low. Most markets are HOLD. The signal board only shows non-HOLD markets.

**Market Price**
The current YES price on Polymarket, expressed as a percentage. This is live data from traders.

**AI Estimate**
What the AI model thinks the true probability is, expressed as a percentage.

**Edge**
The difference between AI Estimate and Market Price. Positive = AI thinks YES is underpriced. Negative = AI thinks YES is overpriced (which means NO is underpriced).

**EV**
Expected Value — a single number that combines edge and confidence into one quality score. Higher EV = more interesting opportunity. Explained in [Section 6](#6-what-is-expected-value-ev).

**Confidence**
How certain the AI is in its estimate. Low / Medium / High. Explained in [Section 7](#7-what-is-confidence).

### Expanding a row — the Research Report

Click any row to expand it into a full research report. You'll see:

- **Probability Comparison** — three cards showing Market Price, AI Estimate, and Edge side by side with mini visual bars
- **Confidence Meter** — a visual indicator of how certain the AI is
- **Full Reasoning** — the AI's step-by-step explanation of how it arrived at its estimate: what base rate it used, what evidence it considered, what adjustments it made
- **Key Factors** — a numbered list of the 3–6 most important things that influenced the estimate
- **Timestamp** — when this estimate was generated
- **Re-analyze button** — forces a fresh AI estimate for this market, bypassing the 24-hour cache

### Concrete example

The market asks: *"Will inflation fall below 3% by end of year?"*

- Market Price: **40%** (traders think 40% chance of YES)
- AI Estimate: **65%** (AI thinks 65% chance of YES)
- Edge: **+25%**
- Signal: **BUY YES**

The AI's reasoning might say: *"Historical base rate for this type of disinflation in the current environment is around 60-70%. Recent CPI data shows a consistent downward trend. The Fed has signaled it expects inflation to continue falling. Adjusting for model overconfidence, estimate is 65%."*

This doesn't mean the market is wrong. It means the AI disagrees, and the gap is large enough to be worth your attention.

---

## 5. What is Edge?

Edge is the core concept in prediction market investing. It's the difference between what you think the true probability is and what the market is currently pricing.

**Edge = AI Estimate − Market Price**

If the market says an event has a 40% chance of happening, but after research you believe it's actually a 65% chance, your edge is **+25 percentage points**.

### Why does edge matter?

In a perfectly efficient market, prices would always be correct and there would be no edge. But markets aren't perfect. They're set by humans who have limited time, incomplete information, cognitive biases, and sometimes just follow the crowd.

When you find genuine edge — when you have information or analytical insight that the market hasn't fully priced in — you have a mathematical advantage. Over many bets, that advantage turns into profit.

Think of it like poker. A professional poker player doesn't win every hand. But if they consistently get their money in when they have the better odds, they win over time. Edge is the same concept.

### What counts as meaningful edge?

ProjectVolo requires a minimum **8% edge** before generating a Research Alert. That means the AI has to disagree with the market by at least 8 percentage points.

Why 8%? Below that threshold, the signal is likely just noise — small disagreements that could easily be explained by the AI's own imprecision, transaction costs, or market efficiency. An 8% gap is large enough to potentially be meaningful.

### A note on edge direction

**Positive edge (BUY YES):** AI estimate > market price. The market might be underpricing the YES outcome.
- Example: Market at 40%, AI at 65% → +25% edge → Consider buying YES

**Negative edge (BUY NO):** AI estimate < market price. The market might be overpricing the YES outcome, meaning NO is underpriced.
- Example: Market at 70%, AI at 45% → −25% edge → Consider buying NO

---

## 6. What is Expected Value (EV)?

Expected Value is a mathematical concept that tells you how much you'd expect to win (or lose) on average if you made this same bet many times.

In ProjectVolo, EV is calculated as:

**EV = |Edge| × Confidence Weight**

The confidence weight is 0.85 for high confidence, 0.60 for medium, and 0.15 for low. This means a large edge with low confidence scores lower than a moderate edge with high confidence — which is the right behaviour.

### Plain English example

Imagine flipping a coin that you believe is slightly biased:

- You think it lands heads 60% of the time (your estimate)
- The market is pricing it at 50% (what you'd pay for a YES share: $0.50)
- Your edge is 10%

If you bet $1 on heads many times:
- 60% of the time you win $1 → expected gain = $0.60
- 40% of the time you lose $1 → expected loss = $0.40
- **Expected value per bet = +$0.20**

That's a positive EV bet. Over 100 bets you'd expect to make around $20, even though you'll lose 40 individual bets.

### How ProjectVolo uses EV

The Research Alerts are sorted by EV from highest to lowest. The best opportunities (largest edge × highest confidence) float to the top. Think of EV as a quality score — not a guarantee of profit, but a ranking of how compelling each signal is.

---

## 7. What is Confidence?

Confidence tells you how certain the AI is in its probability estimate.

### High Confidence
The AI has solid information about this topic. There's a clear base rate, good publicly available data, and the question has unambiguous resolution criteria. The AI's estimate is likely to be reasonably calibrated.

*Examples:* Fed interest rate decisions (well-covered economic data), major election outcomes (extensive polling), well-known sports team performance.

### Medium Confidence
The AI has some relevant information but there's notable uncertainty. Maybe the topic is a bit obscure, the resolution criteria are somewhat ambiguous, or the evidence is mixed.

*Examples:* Mid-tier political races, emerging market events, some science/technology questions.

### Low Confidence
The AI has limited information about this specific topic. This could be because:
- The question involves a person, team, or entity the AI doesn't know much about
- The event is highly unpredictable by nature
- The resolution criteria are unclear

**Low confidence signals never generate BUY YES or BUY NO alerts.** They're automatically filtered to HOLD. You'll only ever see low confidence in the Research Report of an expanded row if you re-analyze a market manually.

### Why confidence matters

A 30% edge sounds incredible. But if confidence is low — if the AI is essentially guessing — that edge might be completely meaningless. Confidence is the quality filter on the edge signal.

High confidence + large edge = worth serious attention.
Low confidence + large edge = probably noise.

---

## 8. The Edge Distribution Chart

This chart plots all currently analyzed markets as dots based on their edge value.

**The horizontal axis** shows the edge — negative on the left (AI thinks YES is overpriced), positive on the right (AI thinks YES is underpriced), zero in the middle.

**The vertical axis** shows expected value — higher dots are higher quality signals.

**The dotted vertical lines** mark the ±8% threshold. Dots outside these lines are the ones generating Research Alerts. Dots between the lines are HOLD.

**How to read it:** A cluster of dots in the top-right corner means there are several high-quality BUY YES signals right now. A cluster in the top-left means high-quality BUY NO signals. Most dots will be near the center — most markets, most of the time, are efficiently priced.

**What it's good for:** Spotting patterns. If everything is clustered near zero, markets are being efficient and there aren't many opportunities. If you see outliers far to the right or left with high EV, those are your most interesting Research Alerts.

---

## 9. The Markets Tab

The Markets tab (in the left sidebar) shows you every market currently passing the volume and date filters.

### Two tabs within Markets

**All** — Every active market being tracked, grouped by event. If Polymarket has an event like "2028 Presidential Election" with 20 individual candidate markets, they're grouped together so you can expand and browse each outcome.

**Watchlist** — Markets you've manually starred. These show live prices, any current signal, and an Analyze button that lets you request an AI estimate on demand — even for markets that might be below the volume threshold.

### Grouped events

When an event has multiple related markets (like "Who will win the Oscar for Best Picture?" with one row per nominee), they appear as a single grouped row. Click to expand it and see all the individual outcomes with their current prices.

This is useful for spotting inconsistencies — if the probabilities across all nominees don't add up to roughly 100%, the market might be mispriced somewhere.

### The star button

Click the star icon on any market to add it to your Watchlist. Watchlisted markets persist across browser sessions (stored in your browser's local storage) and always show up in the Watchlist tab regardless of whether they pass the volume filter.

---

## 10. The Activity Log

The Activity Log (right sidebar) is a real-time feed of everything the backend is doing. Each entry has a color-coded level badge:

**🔵 info** — Routine operations. The backend fetched markets, returned a cached result, started a scan. Nothing to worry about — just status updates.

**🟣 analysis** — The AI is working. You'll see messages like "Estimating: Will the Fed cut rates..." followed by "Estimate: 62.0% (medium confidence)". This is the estimator running in real time.

**🟢 signal** — A Research Alert was found. The log shows the signal type (BUY YES/BUY NO), the market question, and the edge percentage. If you see these, check the signal board.

**🔴 error** — Something went wrong. Could be an API timeout, a parsing failure, or a rate limit from Anthropic. The system handles most errors gracefully and continues — but if you see a flood of red, something may need attention.

Each entry shows: level · timestamp · module (which part of the system generated it) on the first line, and the message on the second line.

---

## 11. The Full Pipeline

Here's exactly what happens, step by step, from the moment you open the dashboard to a Research Alert appearing on screen.

### Step 1: Market Fetch (every 60 seconds)
The backend calls Polymarket's Gamma API and downloads all active events. It filters out:
- Markets with less than $500,000 in total trading volume (low-liquidity markets are noisier)
- Markets closing within 7 days (too close to resolve to trade meaningfully)
- Markets that are already closed or archived

### Step 2: Price Extraction
For each market, the backend extracts the current YES and NO prices from Polymarket's `outcomePrices` field (which arrives as a JSON-encoded string — one of the many API quirks handled under the hood).

### Step 3: Category Inference
Since Polymarket doesn't provide a clean category field, the backend infers the category (Politics, Sports, Crypto, etc.) from the event's ticker/slug using keyword matching.

### Step 4: AI Estimation (cached 24 hours)
For each market, the backend calls Claude Haiku with:
- The question text
- The category
- The current market price (as an anchor for reasoning)
- A detailed system prompt with 8 calibration rules

The AI returns a JSON object with: `estimated_probability`, `confidence`, `reasoning`, and `key_factors`.

This result is cached in memory and in SQLite for 24 hours. If the same market is scanned again within 24 hours, the cached estimate is returned instantly — no API call needed.

### Step 5: Edge Calculation
For each market, the edge calculator:
1. Computes `edge = AI estimate − market price`
2. Applies the price extremes filter (markets below 3¢ or above 97¢ are automatically HOLD — the AI is unreliable at extremes)
3. Applies the confidence weight
4. Determines signal: BUY YES if edge > 8%, BUY NO if edge < −8%, HOLD otherwise
5. Calculates Expected Value = |edge| × confidence weight

### Step 6: Scan Cache (5 minutes)
The full scan result (all EdgeResults) is cached for 5 minutes. If the frontend polls again within 5 minutes, the cached results are returned immediately. If a second request arrives while a scan is already running, it gets the previous cached result instantly rather than queuing another full scan.

### Step 7: Frontend Display
The dashboard polls `/api/edge/scan` every 30 seconds. When it receives results, it:
- Updates the Stats Bar
- Populates the Research Alerts table (non-HOLD results only, sorted by EV)
- Updates the Edge Distribution Chart (all results including HOLDs)
- Syncs any watchlisted markets with fresh prices

---

## 12. How to Place a Bet Using This Tool

ProjectVolo is a research tool, not a trading platform. It never touches your money or places bets for you. Here's the workflow for going from a Research Alert to an actual position on Polymarket.

### Step 1: Find a Research Alert
Open the dashboard and look at the Research Alerts panel. Focus on signals with:
- High confidence
- Large edge (>15% is more interesting than 8%)
- High EV (sorted to the top automatically)

### Step 2: Read the Research Report
Click the row to expand it. Read the full reasoning carefully. Ask yourself:
- Does the AI's logic make sense to me?
- Is there something the AI might not know about? (recent news, insider information, local context)
- Does the AI cite specific factors, or does it feel vague?

### Step 3: Do Your Own Research
The AI's knowledge has a cutoff date and no access to live news. Before acting on any signal:
- Google the topic and read recent news
- Check if there are any developments the AI couldn't have known about
- Look at the Polymarket event page to see recent price history — has it moved a lot recently?

### Step 4: Visit Polymarket
Click the question link in the Research Alerts row (or search on polymarket.com) to open the actual market. Check:
- Current price (may have moved since the scan)
- Trading volume — higher volume means more efficient pricing
- Order book — how much liquidity is available at the current price

### Step 5: Make Your Decision
You — not the AI — decide whether to trade. If the signal still looks compelling after your own research, and you've decided you're comfortable with the risk, you can place a trade on Polymarket.

### Step 6: Size Your Position
Never bet more than you can afford to lose. A reasonable starting point for any single trade is 1–5% of your total bankroll. Even high-confidence signals can be wrong.

### Step 7: Track Your Results
Keep a record of every trade: the question, the signal, your reasoning, the price you paid, and the outcome. Over time, this lets you evaluate whether the signals are actually generating edge for you specifically.

---

## 13. What the AI Actually Does

It's important to be honest about what Claude Haiku (the AI model powering ProjectVolo) actually is and isn't.

### What it knows
Claude Haiku is trained on a large dataset of text from the internet up to its knowledge cutoff. It has broad general knowledge about:
- Historical events, trends, and statistics
- How political systems, economies, and institutions work
- Sports team performance, player histories, and standings
- Scientific and technical topics
- How to reason probabilistically

### What it doesn't know
- **Anything that happened after its training cutoff.** The model has no live news access. It doesn't know about yesterday's press release, last week's game, or this morning's economic data.
- **Real-time prices.** The market price shown in the prompt is provided by ProjectVolo, but the AI doesn't browse Polymarket or any other live source.
- **Private information.** The AI only knows what's publicly available in its training data.
- **Niche topics.** The AI may have limited knowledge about obscure local elections, minor sports leagues, or very specific technical questions.

### How it reasons
The AI is instructed to:
1. Start with a base rate (what's the historical frequency of this type of event?)
2. Update based on specific evidence it knows
3. Regress toward 50% to account for model overconfidence
4. Flag when it has limited knowledge (low confidence)
5. Respect mutually exclusive constraints (if 10 candidates are competing, most should be priced well below 50%)

### What this means for you
The AI is a structured reasoning tool, not an oracle. Its estimates are most useful as a systematic sanity check against market prices — not as ground truth. Treat it like a well-read research analyst who's been off the grid for a few months. Smart and systematic, but potentially behind on recent news.

---

## 14. Limitations and Risks

This section is the most important in the guide. Please read it carefully.

### The AI can be wrong
Probability estimation is genuinely hard. Even with perfect calibration, a 65% estimate means you'll be wrong 35% of the time. And the AI's calibration isn't perfect — it can be systematically wrong in ways that aren't obvious.

### Markets can be efficient
Polymarket attracts sophisticated traders. If there's an obvious mispricing, someone has probably already traded it away. When ProjectVolo shows a big edge, ask yourself: *why hasn't the market already corrected this?* Sometimes the answer is "the market missed it." Often the answer is "the market knows something the AI doesn't."

### The AI has no live data
A signal that looks compelling might be completely invalidated by a news event from yesterday. Always check current news before acting on any signal.

### Knowledge cutoff means stale reasoning
For fast-moving situations — active geopolitical events, ongoing negotiations, live sports seasons — the AI's analysis may be based on outdated context.

### Low-volume markets are riskier
ProjectVolo filters to $500k+ volume markets, but even those can have limited liquidity. If you try to buy a large position, you might move the market against yourself or struggle to exit.

### Past performance doesn't guarantee future results
Even if the AI's signals have been profitable historically, that's no guarantee they'll continue to be. Markets learn and adapt.

### Transaction costs exist
Polymarket charges fees on trades. These eat into your edge. A signal showing 8% edge might be marginal after fees.

### You can lose all of your money
This is not a joke or a legal disclaimer formality. Prediction market positions can go to zero. Never put in money you can't afford to lose entirely.

### This is not financial advice
ProjectVolo is a research tool built for educational exploration. Nothing in this guide, in the dashboard, or in the AI's output constitutes financial advice. All trading decisions are yours alone.

---

## 15. Glossary

**Base Rate**
The historical frequency of a type of event happening. For example, the base rate of incumbents winning re-election, or the base rate of Fed cuts in a high-inflation environment. The AI always starts with a base rate before considering specific evidence.

**BUY NO**
A signal meaning the AI estimates YES is less likely than the market price implies — so NO shares are potentially underpriced. Requires edge < −8%.

**BUY YES**
A signal meaning the AI estimates YES is more likely than the market price implies. Requires edge > +8%.

**Calibration**
How accurately a probability estimator's stated confidence matches reality. A well-calibrated estimator that says "70% chance" should be right about 70% of the time. Overconfident estimators say "90%" when they should say "65%."

**Confidence**
The AI's self-reported certainty in its estimate: Low, Medium, or High. Low confidence estimates never generate BUY signals.

**Edge**
The difference between the AI's probability estimate and the market price. `Edge = AI Estimate − Market Price`. Expressed as percentage points.

**Expected Value (EV)**
A quality score combining edge and confidence. `EV = |Edge| × Confidence Weight`. Higher EV = more compelling signal. Used to sort Research Alerts.

**Gamma API**
Polymarket's public data API (`gamma-api.polymarket.com`) used by ProjectVolo to fetch market data.

**HOLD**
A signal meaning no action is recommended — either the edge is below 8%, confidence is too low, or the price is at an extreme (below 3¢ or above 97¢).

**Knowledge Cutoff**
The date after which the AI has no information. Events, news, or data after this date are unknown to the model.

**Liquidity**
How much money is actively being traded in a market. Higher liquidity = easier to enter and exit positions without moving the price.

**Market Price**
The current YES price on Polymarket, set by supply and demand among traders. Expressed as a decimal (0.45 = 45 cents = 45% implied probability).

**MIN_VOLUME**
The minimum total trading volume ($500,000) a market must have to be included in ProjectVolo's analysis.

**NO Share**
A share that pays out $1.00 if the event does NOT happen and $0 if it does.

**OKLCH**
A color format used in the dashboard's design system. Stands for Oklch (Lightness, Chroma, Hue) — a perceptually uniform color space. Not relevant to trading, but explains the color variables if you look at the source code.

**Outcome Prices**
The raw price data from Polymarket's API, stored as a JSON-encoded string containing the YES and NO prices for a market.

**Polymarket**
The prediction market platform that ProjectVolo reads data from. Running on the Polygon blockchain, denominated in USDC.

**Prediction Market**
A market where people buy and sell shares in the outcome of future events. Share prices reflect collective probability estimates.

**Probability Estimate**
The AI's assessment of how likely a YES outcome is, expressed as a number between 0.01 (1%) and 0.99 (99%).

**Rate Limit**
A restriction from the Anthropic API limiting how many requests can be made per minute. ProjectVolo handles this with automatic retry logic and a 3-second delay between calls.

**Research Alert**
A market where the AI has found a sufficiently large gap (≥8%) between its estimate and the market price. Shown in the Research Alerts panel. Formerly called "signals."

**Scan**
The process of fetching all markets, running AI estimation on each, and calculating edges. Results are cached for 5 minutes.

**Scan Cache**
A 5-minute server-side cache of the full scan result. Prevents redundant re-processing when the frontend polls every 30 seconds.

**Signal**
The recommended action for a market: BUY YES, BUY NO, or HOLD. Determined by the edge size, confidence level, and price extremes filter.

**SQLite**
A lightweight database used by the backend to persist probability estimates across server restarts.

**TTL (Time To Live)**
How long a cached result is considered valid before it must be refreshed. Estimate cache TTL: 24 hours. Scan cache TTL: 5 minutes. Market fetch TTL: 60 seconds.

**USDC**
A stablecoin (cryptocurrency pegged to the US dollar) used as the currency on Polymarket. $1 USDC ≈ $1 USD.

**YES Share**
A share that pays out $1.00 if the event happens and $0 if it doesn't.

---

*ProjectVolo is an independent research tool. It is not affiliated with Polymarket or Anthropic. Nothing in this guide constitutes financial advice. Trade responsibly.*
