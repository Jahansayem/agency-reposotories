# Data Manifest

This document catalogs all data files in the repository with descriptions and naming conventions for future updates.

## Naming Convention

When receiving updated data, use this pattern:
```
{YYYY-MM}_{Report_Name}.{ext}
```

Examples:
- `2025-10_Policy_Growth_Retention_Report.xlsx` → `2025-11_Policy_Growth_Retention_Report.xlsx`
- `2025-09_Bonus_Dashboard.pdf` → `2025-10_Bonus_Dashboard.pdf`

---

## Lead Data (`data/06_lead_data/`)

Call activity and lead tracking data from the agency CRM. Used by `src/lead_analysis_api.py`.

| Current File | Description | Update Pattern |
|--------------|-------------|----------------|
| `ch-1-250922-251117.csv` | Lead calls Sept 22 - Nov 17, 2025 (10,000 records) | `ch-1-{YYMMDD}-{YYMMDD}.csv` |
| `ch-1-250922-251117 2.csv` | Continuation (10,000 records) | Same pattern, increment number |
| `ch-1-250922-251117 3.csv` | Continuation (10,000 records) | |
| `ch-1-250922-251117 4.csv` | Continuation (10,000 records) | |
| `ch-1-250922-251117 5.csv` | Continuation (4,333 records) | |
| `ch-1-250922-251117 6.csv` | Continuation (10,000 records) | |

**Total Records:** 64,332
**Next Update:** `ch-1-251118-{YYMMDD}.csv` (for Nov 18 onwards)

### Data Fields
- Date, Full name, User, From, To, Call Duration, Call Duration In Seconds
- Current Status, Call Type, Call Status, Vendor Name, Team

### Vendor Breakdown (from data)
| Vendor | Leads | CPL (from invoices) |
|--------|-------|---------------------|
| QuoteWizard-Auto | 42,528 | $6 |
| Imported-for-list-uploads | 7,716 | $0 |
| EverQuote-LCS | 7,686 | $7 |
| Lead-Clinic-Internet | 4,699 | $10 |
| ALM-Internet | 989 | $19 |
| Blue-Wave-Live-Call-Transfer | 202 | $55 (discontinued) |
| Lead-Clinic-Live-Transfers | 34 | $60 (discontinued) |
| Manually-Added-Leads | 18 | $0 |
| Referrals | 12 | $0 |

---

## Brittney Bealer Agency Data (`data/07_brittney_bealer/`)

Invoice data and lead vendor analysis for cousin agency (Woodland Hills, CA).
**Used to derive vendor CPL values** in `src/lead_analysis_api.py` lines 369-414.

### Source Files (PDFs/Excel)
| File | Description | Status |
|------|-------------|--------|
| `ALM.pdf` | ALM billing statement Aug-Nov 2025 | Converted |
| `Brittany Bealer- Elite Prime - COct.pdf` | QuoteWizard Oct 2025 invoice | Converted |
| `Brittany Bealer- Elite Prime - Client Admin.pdf Sept.pdf` | QuoteWizard Sept 2025 invoice | Converted |
| `New Business Details_1764017841226.xlsx` | New business policies written | Converted |

### Converted Data Files
| File | Description | Records |
|------|-------------|---------|
| `alm_leads_detailed.csv` | Itemized ALM lead purchases | 304 leads, $6,731 |
| `quotewizard_channels.csv` | QW lead channels by month | Sept + Oct 2025 |
| `quotewizard_payments.csv` | QW payment history | 14 payments |
| `quotewizard_financial_summary.csv` | QW monthly financial summary | Sept + Oct |
| `new_business_details.csv` | Policies written by agent | 153 policies |
| `everquote-transactions_2025-11-24_12-59-09.csv` | EverQuote billing transactions | 1,989 transactions |
| `vendor_spend_summary.csv` | All vendor spend summary | 12 line items |

### Metadata Files
| File | Description |
|------|-------------|
| `agency_profile.md` | Agency overview, team structure, workflow |
| `invoice_details.md` | Complete vendor invoice analysis |

### Key Vendor Cost Summary (Aug-Nov 2025)
| Vendor | Total Spend | Net Leads | Avg CPL |
|--------|-------------|-----------|---------|
| QuoteWizard | $15,878 | 2,657 | $5.98 |
| ALM | $6,896 | 307 | $22.46 |
| EverQuote | ~$5,642 | ~806 | $7.00 |
| **Total** | **~$28,416** | **~3,770** | **$7.54** |

---

## Current Performance (`data/01_current_performance/`)

Agency performance snapshots and compensation dashboards.

| Current File | Description | Next Update Name |
|--------------|-------------|------------------|
| `2025-09_Bonus_Dashboard.pdf` | Monthly bonus summary showing PBR, PG, bonus amounts | `2025-10_Bonus_Dashboard.pdf` |
| `Bonus_Structure_Reference.pdf` | Comp tier reference (static until 2026) | `2026_Bonus_Structure_Reference.pdf` |

---

## Strategic Research (`data/02_strategic_research/`)

Industry analysis and benchmarks.

| Current File | Description | Next Update Name |
|--------------|-------------|------------------|
| `2025 comp FAQ (1).pdf` | Allstate 2025 compensation FAQ | `2026_Comp_FAQ.pdf` |
| `Allstate_Compensation_Structure_Analysis.pdf` | Detailed comp structure breakdown | `2026_Allstate_Compensation_Structure_Analysis.pdf` |
| `CAC_LTV_Retention_Benchmarks_2024.pdf` | Industry benchmarks for insurance agencies | `CAC_LTV_Retention_Benchmarks_2025.pdf` |
| `Lead_Generation_Strategy_Santa_Barbara.md` | Local market lead gen strategy | Update in place |
| `Operational_Efficiency_Benchmarks.pdf` | Staffing ratios, revenue/employee targets | Update annually |
| `Product_Mix_Revenue_Optimization_2025.pdf` | Product mix analysis | `Product_Mix_Revenue_Optimization_2026.pdf` |

---

## Implementation Frameworks (`data/03_implementation_frameworks/`)

PRDs and playbooks for AI system implementation.

| Current File | Description | Next Update Name |
|--------------|-------------|------------------|
| `Claims_Based_CrossSell_PRD.md` | Cross-sell system requirements | Update in place |
| `CrossSell_Implementation_Playbook.pdf` | Step-by-step cross-sell guide | Update in place |

---

## Raw Reports (`data/04_raw_reports/`)

Excel exports from agency systems. These are the primary data sources for analysis.

| Current File | Description | Next Update Name |
|--------------|-------------|------------------|
| `2025-10_Claims_Detail_Report.xlsx` | Claims detail for October 2025 | `2025-11_Claims_Detail_Report.xlsx` |
| `2025-10_Policy_Growth_Retention_Report.xlsx` | Policy growth & retention Oct 2025 | `2025-11_Policy_Growth_Retention_Report.xlsx` |
| `2025-11-14_Business_Metrics.xlsx` | Business metrics snapshot Nov 14 | `2025-12-14_Business_Metrics.xlsx` |
| `24MM Adjusted Paid Loss Detail Report_All_Oct-2025.xlsx` | 24-month loss detail | `24MM_Adjusted_Paid_Loss_Detail_Report_Nov-2025.xlsx` |
| `All Purpose Audit (1).xlsx` | Full audit export | `2025-11_All_Purpose_Audit.xlsx` |
| `All_Purpose_Audit.xlsx` | Full audit export (duplicate) | Remove or consolidate |
| `Renewal_Audit_Report.xlsx` | Renewal audit data | `2025-11_Renewal_Audit_Report.xlsx` |
| `image001.png` | Screenshot/image from report | Keep as reference |

### Key Excel Reports to Request Monthly

1. **Policy Growth & Retention Report** - Track PG progress
2. **Renewal Audit Report** - Identify bundle protection opportunities
3. **Business Metrics** - Overall agency performance
4. **Claims Detail Report** - Loss ratio tracking
5. **All Purpose Audit** - Complete policy data

---

## Analysis-Ready Data (`data/05_analysis_ready/`)

Cleaned CSVs ready for modeling and analysis.

| Current File | Description | Source | Next Update Name |
|--------------|-------------|--------|------------------|
| `bonus_structure_reference.csv` | Comp tier thresholds & percentages | Manual from PDFs | `bonus_structure_reference_2026.csv` |
| `cross_sell_opportunities.csv` | Cross-sell product analysis | Derived | Update when products change |
| `key_metrics_summary.csv` | Agency KPI benchmarks | Derived | Update monthly |
| `lead_generation_vendors.csv` | Vendor comparison data | Lead data | Update quarterly |
| `operational_benchmarks.csv` | Staffing & efficiency targets | Research | Update annually |
| `product_economics.csv` | Premium & commission by product | Agency data | Update annually |
| `santa_barbara_market_analysis.csv` | Local market demographics | Research | Update annually |

---

## Background Info (`data/background-info/`)

Reference materials and deep research.

| Current File | Description | Notes |
|--------------|-------------|-------|
| `Claims_CrossSell_PRD.md` | Cross-sell system PRD | Duplicate - remove |
| `Cross_Sell_Data_Analysis_Implementation_Guide.pdf` | Cross-sell analytics guide | Reference |
| `Insurance_Agency_Economics_CAC_LTV_Retention_Analysis_2024.pdf` | Industry economics study | Replace with 2025 when available |
| `Insurance_Agency_Operational_Efficiency_Report.pdf` | Operational benchmarks study | Reference |
| `Insurance_Agency_Product_Mix_Revenue_Optimization_Strategic_Analysis_2025.pdf` | Product mix strategy | Reference |
| `agency compensation.pdf` | General compensation reference | Reference |
| `lead-deepresarch.md` | Lead generation deep research | Update as needed |
| `portfolio_bonus_info.pdf` | Portfolio bonus tier details | Duplicate - keep for reference |

---

## Other Files

| File | Description | Action |
|------|-------------|--------|
| `agency_plan.docx` | Original agency business plan | Keep as reference |
| `README.md` | Data folder documentation | Keep updated |

---

## Monthly Data Collection Checklist

When Britney provides new data each month, collect:

### Required (Weekly/Monthly)
- [ ] Lead call activity export (CSV)
- [ ] Policy Growth & Retention Report (Excel)
- [ ] Bonus Dashboard (PDF)
- [ ] Business Metrics (Excel)
- [ ] Renewal Audit Report (Excel)

### Required (As Needed)
- [ ] Claims Detail Report (Excel)
- [ ] All Purpose Audit (Excel)
- [ ] Cancel-Pending Reports (for Cancellation Watchtower)

### For Model Updates
- [ ] Updated conversion outcomes for lead scoring
- [ ] Actual vs projected comparisons

---

## Data Quality Notes

### Lead Data
- Phone numbers include country code (1)
- Status codes follow X.X pattern (e.g., "3.2 QUOTED - Not Interested")
- Call type indicates lead source/campaign
- Team field often blank

### Excel Reports
- Date formats may vary (US format MM/DD/YYYY)
- Some reports have multiple sheets
- Premium amounts in dollars (no cents)

### File Naming Best Practices
1. Always include date: `YYYY-MM` or `YYYY-MM-DD`
2. Use underscores not spaces
3. Keep original report names recognizable
4. Version with numbers if multiple exports same day: `_v2`

---

## Archive Policy

When replacing files with updates:
1. Move old file to `archive/data-history/{YYYY-MM}/`
2. Name new file with updated date
3. Update this manifest

---

## Contact

For questions about data formats or missing files, contact Britney (Data Coordinator).

---

**Last Updated:** November 2025
