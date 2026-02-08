# Lead Data Analysis Guide

## Overview

The `data/06_lead_data/` folder contains raw lead and call activity data extracted from the agency's CRM system. This data is essential for training the lead scoring model (Project A) and analyzing marketing channel performance.

## Data Summary

| Attribute | Value |
|-----------|-------|
| **Total Records** | 54,338 |
| **Date Range** | September 22 - November 17, 2025 |
| **Files** | 6 CSV files |
| **Primary Use** | Lead scoring model training, vendor analysis |

## File Inventory

| File | Records | Notes |
|------|---------|-------|
| ch-1-250922-251117.csv | 10,000 | Main export |
| ch-1-250922-251117 2.csv | 10,000 | Continuation |
| ch-1-250922-251117 3.csv | 10,000 | Continuation |
| ch-1-250922-251117 4.csv | 10,000 | Continuation |
| ch-1-250922-251117 5.csv | 4,333 | Partial file |
| ch-1-250922-251117 6.csv | 10,000 | Continuation |

## Data Schema

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| Date | Timestamp | Call date and time | 2025-11-10 12:40:03 |
| Full name | String | Lead's full name | Walter Rozin |
| User | String | Agent who handled call | Maicah Pelaez |
| From | Phone | Caller phone number | 18314808023 |
| To | Phone | Agency phone number | 18312587327 |
| Call Duration | String | Human-readable duration | 35 secs |
| Call Duration In Seconds | Integer | Duration in seconds | 35 |
| Current Status | String | Lead outcome/status | 3.2 QUOTED - Not Interested |
| Call Type | String | Lead type/campaign | Live-Q |
| Call Status | String | Call completion status | completed |
| Vendor Name | String | Lead source vendor | QuoteWizard-Auto |
| Team | String | Team assignment | (often blank) |

## Status Codes

### Outcome Categories

The `Current Status` field uses a hierarchical coding system:

#### 1.x - Initial Contact Statuses
| Code | Status | Description |
|------|--------|-------------|
| 1.0 | CALLED - No Contact | Attempted call, no answer |
| 1.1 | CALLED - Left Voicemail | Voicemail left |
| 1.2 | CALLED - Bad Phone # | Invalid number |
| 1.3 | CONTACTED - Follow Up | Made contact, needs follow-up |

#### 2.x - Engagement Statuses
| Code | Status | Description |
|------|--------|-------------|
| 2.0 | CONTACTED - In Progress | Active conversation |
| 2.1 | CONTACTED - Scheduled | Appointment set |
| 2.2 | CONTACTED - Needs Info | Waiting on customer info |

#### 3.x - Quote Statuses
| Code | Status | Description |
|------|--------|-------------|
| 3.0 | QUOTED - Pending | Quote provided, deciding |
| 3.1 | QUOTED - Follow Up | Quote sent, needs follow-up |
| 3.2 | QUOTED - Not Interested | Declined after quote |
| 3.3 | QUOTED - HOT!!!! | High likelihood to close |

#### 4.x - Conversion Statuses
| Code | Status | Description |
|------|--------|-------------|
| 4.0 | SOLD | Converted to customer |
| 4.1 | SOLD - Bundled | Sold multiple policies |

#### 5.x - Closed/Lost Statuses
| Code | Status | Description |
|------|--------|-------------|
| 5.0 | CLOSED - Not Interested | Declined, no quote |
| 5.1 | CLOSED - Price | Lost on price |
| 5.2 | CLOSED - Competitor | Went with competitor |
| 5.3 | CLOSED - Invalid | Bad lead/duplicate |

## Call Types

### Live Transfers
| Type | Description |
|------|-------------|
| Live-Q | Live call transfer, qualified |

### Telemarketing Tiers
| Type | Description | Days Since Lead |
|------|-------------|-----------------|
| T.1 | Day 1 outreach | 1 |
| T.2 | Days 2-7 follow-up | 2-7 |
| T.3 | Days 8-20 follow-up | 8-20 |
| T.4 | Days 21-45 follow-up | 21-45 |

### Special Categories
| Type | Description |
|------|-------------|
| Shark Tank | Competitive lead auction |
| Cam-Q | Camera/Zoom qualified |

## Lead Vendors

### Primary Vendors
| Vendor | Description | Lead Type |
|--------|-------------|-----------|
| QuoteWizard-Auto | Online quote aggregator | Internet leads |
| EverQuote-LCS | Live call service | Live transfers |
| Blue-Wave-Live-Call-Transfer | Live transfer service | Live transfers |
| Imported-for-list-uploads | Internal/purchased lists | Batch leads |

### Vendor Comparison Analysis
To analyze vendor performance:
1. Calculate conversion rate by vendor
2. Measure cost per acquisition (if cost data available)
3. Track time-to-close by vendor
4. Analyze quote-to-close ratio

## Analysis Opportunities

### 1. Vendor Performance Analysis

**Objective:** Identify which lead sources provide best ROI

**Metrics:**
- Conversion rate by vendor
- Average call duration by vendor
- Quote rate by vendor
- Time to conversion

**Query approach:**
```python
import pandas as pd

# Load all CSVs
df = pd.concat([pd.read_csv(f) for f in csv_files])

# Conversion by vendor
vendor_performance = df.groupby('Vendor Name').agg({
    'Full name': 'count',  # Total leads
    'Current Status': lambda x: (x.str.contains('SOLD')).sum()  # Conversions
})
vendor_performance['Conversion Rate'] = (
    vendor_performance['Current Status'] / vendor_performance['Full name']
)
```

### 2. Agent Performance Analysis

**Objective:** Identify top performers and best practices

**Metrics:**
- Conversion rate by agent
- Average call duration
- Quote-to-close ratio
- Leads handled per day

**Key questions:**
- Who converts at highest rate?
- What call duration correlates with conversion?
- Which agents best with specific lead types?

### 3. Call Type Effectiveness

**Objective:** Optimize telemarketing workflow

**Analysis:**
- Conversion by call type (Live-Q vs T.1-T.4)
- Optimal follow-up timing
- Diminishing returns threshold
- Cost-effectiveness by tier

**Expected findings:**
- Live-Q likely highest conversion
- T.1 > T.2 > T.3 > T.4 for conversion
- Identify point of diminishing returns

### 4. Status Funnel Analysis

**Objective:** Identify where leads drop off

**Funnel stages:**
1. Called (all attempts)
2. Contacted (reached person)
3. Quoted (provided quote)
4. Sold (converted)

**Analysis:**
- Drop-off rate at each stage
- Time spent in each stage
- Recovery rate from various statuses

### 5. Time-Based Patterns

**Objective:** Optimize call timing

**Analysis:**
- Conversion by day of week
- Conversion by time of day
- Seasonal patterns
- Response time impact

### 6. Lead Scoring Features

**Features for ML model:**

| Feature | Type | Description |
|---------|------|-------------|
| vendor_encoded | Categorical | Lead source |
| call_type_encoded | Categorical | Live vs telemarketing |
| day_of_week | Numeric | 0-6 |
| hour_of_day | Numeric | 0-23 |
| agent_experience | Numeric | Agent's historical conversion rate |
| initial_call_duration | Numeric | First contact duration |
| num_attempts | Numeric | Total call attempts |

## Data Quality Notes

### Known Issues

1. **Missing Team values** - Team field often blank, may not be useful
2. **Phone number format** - No consistent formatting, includes country code
3. **Status inconsistency** - Some records may have non-standard status codes
4. **Duplicate leads** - Same person may appear multiple times with different calls

### Data Cleaning Steps

1. **Parse dates** - Convert Date column to datetime
2. **Standardize phone** - Remove country code, format consistently
3. **Extract status code** - Parse numeric code from Current Status
4. **Identify conversions** - Flag records with SOLD status
5. **Link call sequences** - Group by lead name to see full journey
6. **Remove duplicates** - Identify and handle true duplicates

### Recommended Preprocessing

```python
import pandas as pd

def clean_lead_data(df):
    # Parse dates
    df['Date'] = pd.to_datetime(df['Date'])

    # Extract status code
    df['Status_Code'] = df['Current Status'].str.extract(r'^(\d+\.\d+)')

    # Flag conversions
    df['Converted'] = df['Current Status'].str.contains('SOLD', na=False)

    # Extract hour and day
    df['Hour'] = df['Date'].dt.hour
    df['DayOfWeek'] = df['Date'].dt.dayofweek

    # Clean call duration
    df['Duration'] = df['Call Duration In Seconds'].fillna(0).astype(int)

    return df
```

## Integration with Lead Scoring Model

### Feature Engineering

**From this dataset, extract:**

1. **Lead-level features:**
   - First contact duration
   - Initial status
   - Lead source
   - Time of day

2. **Agent-level features:**
   - Historical conversion rate
   - Average call duration
   - Specialization

3. **Vendor-level features:**
   - Overall conversion rate
   - Average time to close
   - Lead quality score

### Target Variable

**Binary classification:**
- 1 = Converted (any SOLD status)
- 0 = Not converted (all other final statuses)

**Multi-class option:**
- 0 = Lost (CLOSED statuses)
- 1 = Open (still in progress)
- 2 = Converted (SOLD)

### Training/Test Split

**Recommended approach:**
- Use time-based split (earlier for training, later for test)
- Hold out most recent 2 weeks for validation
- Stratify by vendor to ensure representation

## Next Steps

### Immediate Actions

1. **Consolidate files** - Merge all 6 CSVs into single dataset
2. **Data profiling** - Generate summary statistics
3. **Clean data** - Apply preprocessing pipeline
4. **Initial analysis** - Run vendor and agent comparisons

### Analysis Priorities

1. **Vendor ROI** - Which sources to invest in?
2. **Agent optimization** - Routing and training opportunities
3. **Timing optimization** - When to call?
4. **Feature engineering** - Prepare for model training

### Deliverables

1. **Vendor report** - Performance comparison with recommendations
2. **Agent dashboard** - Individual and team metrics
3. **Clean dataset** - Analysis-ready consolidated file
4. **Feature set** - Engineered features for lead scoring model

## Sample Analysis Code

### Load and Merge All Files

```python
import pandas as pd
import glob

# Load all CSV files
path = 'data/06_lead_data/'
files = glob.glob(path + '*.csv')
df = pd.concat([pd.read_csv(f) for f in files], ignore_index=True)

print(f"Total records: {len(df)}")
print(f"Date range: {df['Date'].min()} to {df['Date'].max()}")
print(f"Unique vendors: {df['Vendor Name'].nunique()}")
print(f"Unique agents: {df['User'].nunique()}")
```

### Conversion Rate by Vendor

```python
# Calculate conversion rate
vendor_stats = df.groupby('Vendor Name').agg(
    total=('Full name', 'count'),
    converted=('Current Status', lambda x: x.str.contains('SOLD').sum())
)
vendor_stats['conversion_rate'] = vendor_stats['converted'] / vendor_stats['total']
vendor_stats = vendor_stats.sort_values('conversion_rate', ascending=False)
print(vendor_stats)
```

### Agent Performance

```python
# Agent leaderboard
agent_stats = df.groupby('User').agg(
    calls=('Full name', 'count'),
    converted=('Current Status', lambda x: x.str.contains('SOLD').sum()),
    avg_duration=('Call Duration In Seconds', 'mean')
)
agent_stats['conversion_rate'] = agent_stats['converted'] / agent_stats['calls']
agent_stats = agent_stats.sort_values('conversion_rate', ascending=False)
print(agent_stats.head(10))
```

### Status Distribution

```python
# Status funnel
status_counts = df['Current Status'].value_counts()
print(status_counts.head(20))

# Funnel visualization
import matplotlib.pyplot as plt

categories = ['CALLED', 'CONTACTED', 'QUOTED', 'SOLD']
counts = [
    df['Current Status'].str.contains('CALLED').sum(),
    df['Current Status'].str.contains('CONTACTED').sum(),
    df['Current Status'].str.contains('QUOTED').sum(),
    df['Current Status'].str.contains('SOLD').sum()
]

plt.figure(figsize=(10, 6))
plt.bar(categories, counts)
plt.title('Lead Funnel')
plt.ylabel('Count')
plt.show()
```

---

## Contact

For questions about this data or analysis, contact Adrian.

**Last Updated:** November 2025
