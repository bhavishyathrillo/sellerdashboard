# Thrillophilia Manager Report Card
## Technical Calculation & Scoring Methodology

This document outlines the exact mathematical methodology the Thrillophilia Dashboard uses to generate the Manager Report Card and Compare View.

---

### 1. Standard Report Card (Snapshot Methodology)
For the standard Report Card (which operates over a full cycle/month), the system evaluates 3 primary chapters: **Output Metrics (70%)**, **Input Metrics (15%)**, and **Quotations (15%)**.

For every single metric, the system pulls the **latest cumulative database snapshot** (meaning it captures the total running performance from the start of the month up to the exact date you are viewing).

**Output Metrics (70% of Final Score)**
Output is graded by comparing a manager's **Actuals** directly against their **Proportional Target (SHB)**. Because SHB scales day-by-day, the system accurately grades if they are "on pace" for the month.
*   **Bottomline / Profit (30%):** `Actual Profit ÷ Target Profit (SHB)` (Goal: 100%)
*   **Conversion % (25%):** `Actual Conversion Rate ÷ Target Conversion Rate (SHB)` (Goal: 100%)
*   **Topline / Booking Value (15%):** `Actual Topline ÷ Target Topline (SHB)` (Goal: 100%)
*   **Margin % (15%):** `Actual Margin ÷ Target Margin` (Goal: Meet Guardrail)
*   **Flag Health (15%):** Evaluates the percentage of sellers under them who are operating with a Red/Yellow flag warning.

**Input Metrics (15% of Final Score)**
Inputs are graded against fixed company benchmarks to ensure standard operating procedures are being followed.
*   **Mishandled Leads (30%):** `Total Mishandled ÷ Total Lead Instances` (Goal: Below 15%)
*   **SLA / Call within 15 Min (30%):** `Called in 15 Min ÷ Total Leads Assigned` (Goal: 90%+)
*   **Priority Leads Created (25%):** `Priority Leads ÷ Total Leads` (Goal: 20%+)
*   **First Call Talk Time (15%):** The calculated median talk time of first connected calls (Goal: 8+ minutes)

**Quotations (15% of Final Score)**
*   **Unique Leads Quoted (25%):** `Unique Quoted ÷ Unique Leads` (Goal: 50%+)
*   **Feasibility Pass Rate (25%):** `Passed Feasibility ÷ Total Sent to Feasibility` (Goal: 90%+)
*   **Quote to Conversion (20%):** `Converted Deals ÷ Passed Feasibility` (Goal: 80%+)
*   **Quote to Feasibility (15%):** `Sent to Feasibility ÷ Unique Leads Quoted` (Goal: 30%+)
*   **Rework Rate (15%):** `Total Reworks ÷ Total Sent to Feasibility` (Goal: ≤ 2 reworks)

**Generating the Final Grade**
1. For each individual metric, the system assigns a score from **0 to 100** based on how close they are to hitting the Benchmark/SHB. (Capped at 100, so overperforming in one area doesn't artificially mask underperforming in another).
2. Those scores are multiplied by their specific weights (e.g., Output is multiplied by 0.70).
3. Everything is summed up to generate a **Final Aggregate Score (out of 100)**.
4. The final Grade is assigned based on the Aggregate Score: **A+** (90+), **A** (80-89), **B** (70-79), **C** (60-69), **D** (50-59), **E** (< 50).

---

### 2. Compare View (Delta Subtraction / Date Range Logic)
When comparing performance across a specific date range (e.g., July 10 to July 12), the system does **not** just pull the final numbers. Instead, it creates a strict, isolated window of performance by using **Delta Subtraction**. 

It pulls two database snapshots:
1.  **The "To" Snapshot:** The cumulative data exactly as it stood at the end of the selected *To* date (e.g., July 12).
2.  **The Baseline Snapshot:** The cumulative data exactly as it stood the day *before* the selected range began (e.g., July 9). 

**Subtracting Actual Output & Inputs**
To figure out exactly how much work a seller generated *inside* the date window, the system subtracts the Baseline Actuals from the "To" Actuals. 

If a manager had 100 total Mishandled Leads on the 9th, and 110 on the 12th, the system registers exactly **10 Mishandled Leads** for that 3-day window. This exact mathematical subtraction is applied to all generated outputs: `Revenue`, `Leads`, `Feasibility Data`, and `Conversions`.

**Subtracting the Run-Rate Targets (SHB)**
You cannot grade a 3-day sales sprint against a 30-day monthly target. Because SHB (Should Have Been) targets grow proportionally every single day, the system also subtracts the **Baseline SHB** from the **"To" SHB**.
*   This instantly generates a highly accurate, custom target for *just those specific days*. 
*   **Example:** If their Revenue SHB on July 9 was $30k, and on July 12 it was $40k, their exact Target for the 3-day window is **$10k**. 

**Reconstructing Averages (Talk Time)**
Metrics that are averages (like First Call Talk Time) cannot be subtracted directly (e.g., An 8-minute average minus a 6-minute average does not equal a 2-minute average). 
*   The system multiplies their `Talk Time` by their `Total Calls` to find the **Total Minutes Spoken** for the whole month. 
*   It then subtracts the Baseline Total Minutes from the "To" Total Minutes.
*   Finally, it divides that result by the exact number of calls made *inside the date window*. This yields a mathematically perfect median talk time for those specific days.

**Final Delta Grade Calculation**
The system **never** subtracts percentages (like `% Feasibility Passed` or `% Target Achieved`). 

Instead, the system takes the newly calculated **Delta Actuals** and divides them by the newly calculated **Delta Targets (SHB)**. These new ratios are fed directly into the standard Report Card algorithm. This guarantees that the final Grade (A, B, C, D) is a 100% fair and accurate reflection of their performance exclusively within the selected dates.
