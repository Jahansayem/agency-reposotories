# Agency Data Repository - Organized Structure

## Overview
This repository contains all critical agency performance data, strategic research, implementation frameworks, and analysis-ready files for data-driven decision making.

## Directory Structure

### 🔷 07_brittney_bealer/
**Lead analysis data for Brittney Bealer's agency (cousin agency)**

**Source files** providing vendor CPL data used in `src/lead_analysis_api.py`:

| Source File | Converted To | Status |
|-------------|--------------|--------|
| `ALM.pdf` | `alm_leads_detailed.csv` | ✅ 304 leads |
| `Brittany Bealer Elite Prime COct.pdf` | `quotewizard_*.csv` | ✅ Oct 2025 |
| `Brittany Bealer Elite Prime Sept.pdf` | `quotewizard_*.csv` | ✅ Sept 2025 |
| `New Business Details.xlsx` | `new_business_details.csv` | ✅ 153 policies |
| `everquote-transactions.csv` | (already CSV) | ✅ 1,989 transactions |

**Metadata Files:**
| File | Description |
|------|-------------|
| `agency_profile.md` | Agency overview, team structure, revenue model |
| `invoice_details.md` | Complete vendor invoice breakdown |
| `vendor_spend_summary.csv` | Structured spend data by vendor/period |

**Brittney Wavezly Summary:**
- **Location:** Woodland Hills, CA (17203 Ventura Blvd)
- **Team:** 2 Telemarketers (Layne, Maicah) + 4 LSPs (Karina, Amanda, Brandon, Samantha)
- **Commission:** 9% base + up to 11% bonus
- **Lead Data:** 64,332 call records (Sept 22 - Nov 17, 2025)

**Vendor Spend (Aug-Nov 2025):**
| Vendor | Spend | Leads | CPL |
|--------|-------|-------|-----|
| QuoteWizard | $15,878 | 2,657 | $5.98 |
| ALM | $6,896 | 307 | $22.46 |
| EverQuote | ~$5,642 | ~806 | $7.00 |
| **Total** | **~$28,416** | **~3,770** | **$7.54** |

**Integration:** Vendor CPL values are used in [lead_analysis_api.py](../src/lead_analysis_api.py) lines 369-414

---

### 📊 01_current_performance/
**Current agency performance metrics and business planning**

| File | Description | Use Case |
|------|-------------|----------|
| `2025-09_Bonus_Dashboard.pdf` | September 2025 bonus performance dashboard | Track monthly bonus achievement and portfolio growth |
| `Bonus_Structure_Reference.pdf` | Bonus calculation methodology and grids | Understand how bonuses are calculated |
| `Agency_Business_Plan.docx` | Agency strategic business plan | Reference for strategic goals and initiatives |

**Key Metrics (as of Sep 2025):**
- Written Premium: $4,072,346
- Portfolio Growth Rate: 0.2987%
- Monthly Bonus: $12,058

---

### 🔬 02_strategic_research/
**Industry benchmarks, market analysis, and strategic insights**

| File | Description | Key Insights |
|------|-------------|--------------|
| `CAC_LTV_Retention_Benchmarks_2024.pdf` | Customer acquisition cost and lifetime value analysis | Bundled customers: 95% retention vs 67% single-product |
| `Operational_Efficiency_Benchmarks.pdf` | Operational metrics for $1-5M premium agencies | Target: 26.1% EBITDA, $200K+ revenue/employee |
| `Product_Mix_Revenue_Optimization_2025.pdf` | Product strategy and cross-sell opportunities | 61% of clients have only 1 policy - massive opportunity |
| `Allstate_Compensation_Structure_Analysis.pdf` | Comprehensive analysis of Allstate commission changes | Commission reduced from 10% → 7% (2020-2025) |
| `Lead_Generation_Strategy_Santa_Barbara.md` | Lead gen vendors, pricing, and Santa Barbara market analysis | 15 vendors analyzed with pricing and quality ratings |

**Critical Strategic Findings:**
- 5% retention improvement can double profits in 5 years
- Life insurance provides 34% higher CLV than auto
- Santa Barbara market: 50% premium costs above average
- Elite/Pro/Emerging tier system creates dramatic income inequality

---

### 🛠️ 03_implementation_frameworks/
**Actionable playbooks and product requirements**

| File | Description | Expected Outcome |
|------|-------------|------------------|
| `Claims_Based_CrossSell_PRD.md` | Product requirements for claims-based cross-sell targeting | Systematic identification of cross-sell opportunities |
| `CrossSell_Implementation_Playbook.pdf` | 6-phase implementation guide for cross-sell campaigns | 100-350 new policies, $9.6K-$63K additional revenue |

**Implementation Priorities:**
1. **High Priority:** Auto-only → Home bundling (15-25% conversion)
2. **Very High Priority:** Auto+Home → Umbrella (25-40% conversion)
3. **High Priority:** Zero-claims customers → Premium products (30-40% conversion)

---

### 📁 04_raw_reports/
**Unprocessed agency reports and data exports**

| File | Description | Data Period |
|------|-------------|-------------|
| `2025-10_Claims_Detail_Report.xlsx` | Detailed claims data | October 2025 |
| `All_Purpose_Audit.xlsx` | Comprehensive agency audit | Current |
| `Renewal_Audit_Report.xlsx` | Renewal analysis | Current |
| `2025-11-14_Business_Metrics.xlsx` | Business metrics snapshot | November 14, 2025 |
| `2025-10_Policy_Growth_Retention_Report.xlsx` | Policy growth and retention details | October 2025 |

**Note:** These are raw data exports that may require cleaning and processing for analysis.

---

### 📈 05_analysis_ready/
**Clean, structured data files ready for immediate analysis**

| File | Description | Use Case |
|------|-------------|----------|
| `key_metrics_summary.csv` | All critical metrics in one place | Quick reference for KPIs across all categories |
| `lead_generation_vendors.csv` | 15 lead vendors with pricing and volume projections | Budget planning and vendor selection |
| `cross_sell_opportunities.csv` | 12 cross-sell segments with conversion rates and SQL queries | Identify and prioritize cross-sell campaigns |
| `bonus_structure_reference.csv` | Bonus tier thresholds and percentages | Calculate bonus projections |
| `operational_benchmarks.csv` | 19 operational metrics (best practice vs average) | Performance gap analysis |
| `product_economics.csv` | 16 product lines with LTV, commission, and retention data | Product mix optimization |
| `santa_barbara_market_analysis.csv` | Local market demographics and opportunity sizing | Market strategy and targeting |

---

## Quick Start Analysis Guides

### 📌 To Analyze Current Performance
1. Review `01_current_performance/2025-09_Bonus_Dashboard.pdf` for latest results
2. Compare against `05_analysis_ready/operational_benchmarks.csv` to identify gaps
3. Reference `05_analysis_ready/key_metrics_summary.csv` for trend analysis

### 📌 To Plan a Cross-Sell Campaign
1. Use `05_analysis_ready/cross_sell_opportunities.csv` to identify high-value segments
2. Follow `03_implementation_frameworks/CrossSell_Implementation_Playbook.pdf` for execution steps
3. Use SQL queries in cross_sell_opportunities.csv to extract customer lists from agency database
4. Expected ROI: 100-350 new policies, $9,600-$63,000 additional annual revenue

### 📌 To Optimize Lead Generation Budget
1. Review `05_analysis_ready/lead_generation_vendors.csv` for vendor options
2. Reference `02_strategic_research/Lead_Generation_Strategy_Santa_Barbara.md` for detailed vendor analysis
3. Consider CAC benchmarks from `05_analysis_ready/operational_benchmarks.csv`
4. Target CAC: <$500 for direct channel, <$850 for captive channel

### 📌 To Improve Retention
1. Identify single-policy customers (61% of book per `key_metrics_summary.csv`)
2. Priority: Convert to bundles (95% retention vs 67% single-product)
3. Use `05_analysis_ready/product_economics.csv` to model LTV impact
4. **Impact:** 5% retention improvement can double profits in 5 years

### 📌 To Maximize Bonus Performance
1. Check current performance in `01_current_performance/2025-09_Bonus_Dashboard.pdf`
2. Use `05_analysis_ready/bonus_structure_reference.csv` to identify next tier thresholds
3. Focus on:
   - **Policy Bundle Rate** (current tier and gap to next level)
   - **Portfolio Growth** (current tier and gap to next level)

---

## Data Sources & Dates

| Category | Most Recent Data | Frequency |
|----------|------------------|-----------|
| Bonus Performance | September 2025 | Monthly |
| Claims Reports | October 2025 | Monthly |
| Business Metrics | November 14, 2025 | Real-time/Daily |
| Strategic Research | 2024-2025 | Annual/Ad-hoc |
| Market Benchmarks | 2024 | Annual |

---

## Key Performance Indicators (KPIs)

### Current Status (Sep 2025)
- **Written Premium:** $4,072,346
- **Portfolio Growth Rate:** 0.2987%
- **Monthly Bonus:** $12,058

### Target Benchmarks
- **EBITDA Margin:** 26.1% (best practice for $1-5M agencies)
- **Revenue Per Employee:** $200,000-$228,000
- **Bundled Customer Retention:** 95%
- **Overall Book Retention:** 85%+
- **LTV:CAC Ratio:** >5:1

### Opportunities
- **61% of customers have only 1 policy** → massive cross-sell potential
- **Auto+Home → Umbrella conversion:** 25-40% achievable
- **Zero-claims segment:** 30-40% premium product conversion
- **Life insurance:** 34% higher CLV than auto

---

## Recommended Actions

### Immediate (Next 30 Days)
1. ✅ Run cross-sell SQL queries to identify high-value opportunities
2. ✅ Launch Auto+Home → Umbrella campaign (25-40% conversion expected)
3. ✅ Review lead generation vendor mix and optimize for CAC <$500

### Short-term (Next 90 Days)
1. ✅ Implement claims-based cross-sell targeting system
2. ✅ Increase bundle rate to move up bonus tier
3. ✅ Develop retention campaigns for single-policy customers

### Long-term (Next 12 Months)
1. ✅ Achieve 26.1% EBITDA margin (operational efficiency benchmark)
2. ✅ Reduce customer base with 1 policy from 61% → 40%
3. ✅ Increase overall retention to 85%+ through bundling strategy

---

## Analysis Tools & Integration

This repository is designed to integrate with:
- **Excel/Google Sheets:** All CSV files can be opened directly for pivot tables and analysis
- **Python/Pandas:** CSV files are ready for data science workflows
- **Streamlit Dashboard:** Can load these CSVs for interactive visualization
- **Agency Management System:** SQL queries provided for data extraction

---

## Contact & Questions

For questions about:
- **Data Sources:** Review file headers and source column in CSVs
- **Methodology:** See original PDF reports in strategic_research folder
- **Implementation:** Reference playbooks in implementation_frameworks folder

---

**Last Updated:** November 25, 2025
**Repository Status:** ✅ Organized and Analysis-Ready
