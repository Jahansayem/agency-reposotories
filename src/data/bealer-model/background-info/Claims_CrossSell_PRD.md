# PRODUCT REQUIREMENTS DOCUMENT
## Claims-Based Cross-Sell Targeting System

**Version:** 1.0  
**Date:** November 14, 2025  
**Status:** Draft  
**Owner:** [Product Owner Name]  
**Contributors:** [Team Names]

---

## EXECUTIVE SUMMARY

### Product Vision
Build an intelligent customer segmentation and targeting system that leverages claims history data to: (1) identify high-value, low-risk customers for strategic cross-selling of insurance products, and (2) profile demographic characteristics of profitable customers to guide new customer acquisition strategies. The system will automate the identification, scoring, prioritization, and outreach management for both cross-sell opportunities and new prospect targeting, with initial focus on umbrella policies, product bundling, commercial lines, and life insurance.

### Business Opportunity
- **Target Market:** Independent insurance agencies with 500-10,000 customers
- **Primary Value:** Increase revenue 20-35% through strategic cross-selling to profitable customers AND smarter acquisition of similar prospects
- **Key Insights:** 
  - 60-70% of agency customers have zero claims and represent untapped growth potential
  - Demographic patterns reveal which prospect types will become Platinum customers
  - Targeting "lookalike" prospects dramatically improves acquisition ROI
- **Expected ROI:** $22K+ commission revenue per 1,000 existing customers in year one PLUS 40-60% improvement in new customer profitability through targeted acquisition

### Success Criteria

**Cross-Sell Objectives:**
- Identify 60-70% of customer base as "Platinum tier" (zero claims)
- Generate 150-200 prioritized umbrella opportunities per 1,000 customers
- Achieve 40% conversion rate on umbrella cross-sell
- Increase customer lifetime value by 20% through multi-product relationships
- Reduce customer acquisition costs by focusing on expansion of existing relationships

**Lead Targeting Objectives:**
- Create demographic profiles of Platinum vs. high-claims customers
- Identify top 3-5 "target prospect personas" based on claims performance
- Provide lead scoring model for new prospects based on demographic fit
- Reduce new customer claims frequency by 30% through better targeting
- Improve new customer retention by 25% by acquiring "Platinum-profile" prospects

---

## PROBLEM STATEMENT

### Current State
Insurance agencies lack systematic approaches to both maximize value from existing customers AND acquire the right new customers. Current methods include:

**Cross-Sell Challenges:**
- Manual review of customer files (time-intensive, inconsistent)
- Generic marketing campaigns (low conversion, inefficient spend)
- Reactive selling (waiting for customers to ask vs. proactive outreach)
- Equal treatment of all customers regardless of risk profile or profitability
- No data-driven prioritization of cross-sell opportunities

**Lead Acquisition Challenges:**
- No understanding of which demographics become profitable customers
- Undifferentiated marketing to all prospects (attracting high-risk customers)
- Acquisition costs applied equally across all prospect types
- New customers often have higher claims frequency than expected
- No way to predict which prospects will be Platinum vs. high-claims customers

### Pain Points

**For Agency Owners:**
- Unable to identify which customers are most profitable
- Wasting resources on high-risk customers who generate claims
- Missing obvious cross-sell opportunities (customers with assets but no umbrella)
- No systematic approach to customer expansion
- Limited visibility into customer lifetime value by claims behavior
- **Acquiring the "wrong" customers who cost more in claims than they generate in premium**
- **No demographic intelligence to guide marketing spend and lead generation**
- **Marketing budget wasted on broad campaigns that attract high-risk prospects**

**For Agents:**
- No clear prioritization of who to contact first (existing or new)
- Lack of data to support consultative conversations
- Generic scripts that don't resonate with customer history
- Difficulty tracking cross-sell campaign effectiveness
- Time wasted on low-probability opportunities
- **No profile of "ideal prospect" to guide prospecting efforts**
- **Spending equal time on all leads regardless of demographic fit**

**For Marketing/Business Development:**
- **No data-driven buyer personas based on actual customer performance**
- **Cannot target lookalike audiences effectively**
- **No way to score incoming leads for likelihood of becoming profitable customers**
- **Digital marketing campaigns attract whoever responds, not ideal customers**
- **Referral programs don't target specific demographic profiles**

**Business Impact:**
- 30-40% of potential cross-sell revenue left on table
- High customer acquisition costs without maximizing existing relationships
- Poor retention due to lack of customer engagement
- Unprofitable customer mix (serving high-claims customers who cost more than they generate)
- **New customers have 50-80% higher claims frequency than tenured Platinum customers**
- **Marketing ROI diminished by acquiring high-risk customers**
- **Loss ratios worsen as book composition shifts toward high-claims demographics**

---

## PRODUCT GOALS & OBJECTIVES

### Primary Goals

**Goal 1: Automated Customer Intelligence**
- Automatically segment entire customer base by claims history and risk profile
- Identify Platinum tier (zero claims) customers with 95%+ accuracy
- Surface demographic patterns in claims behavior
- Update segmentation nightly as new claims data arrives

**Goal 2: Cross-Sell Opportunity Identification & Prioritization**
- Identify specific cross-sell opportunities (umbrella, bundling, commercial, life)
- Score opportunities based on conversion probability and revenue potential
- Generate prioritized outreach lists by product type
- Flag policy gaps for each customer household

**Goal 3: Demographic Profiling & Lead Target Intelligence** ⭐ NEW
- **Analyze claims frequency/severity by demographic attributes** (age, occupation, location, home value, vehicle type, marital status, etc.)
- **Identify demographic profiles of Platinum customers vs. high-claims customers**
- **Create "ideal customer personas" based on actual performance data**
- **Generate demographic scoring model for lead qualification**
- **Provide targeting parameters for marketing campaigns** (Facebook/Google ads, direct mail, referral programs)
- **Enable "lookalike audience" creation for digital advertising**
- **Predict claims risk of prospects based on demographic attributes**

**Goal 4: Campaign Orchestration**
- Enable multi-channel outreach campaigns (phone, email, direct mail) for cross-sell
- Provide agent scripts tailored to customer history and opportunity type
- Track outreach activities and responses by customer and campaign
- Measure conversion rates by segment, opportunity type, and outreach method
- **Score incoming leads based on demographic fit to Platinum profile**
- **Route high-scoring leads to appropriate agents**

**Goal 5: Performance Analytics**
- Dashboard showing Platinum tier size, opportunities, and conversion rates
- Track ROI by campaign and customer segment
- Measure customer lifetime value by claims tier
- Identify which demographics are most/least profitable
- **Compare new customer acquisition performance by demographic targeting**
- **Track claims frequency of newly acquired customers vs. expectations**
- **Measure improvement in loss ratios from better prospect selection**

### Secondary Goals
- Integration with existing agency management systems (AMS)
- Mobile accessibility for agents in the field
- Automated follow-up reminders and task management
- Referral opportunity identification from satisfied Platinum customers
- Risk management alerts for high-claims pattern customers
- **Integration with marketing automation platforms (Facebook Ads, Google Ads)**
- **Lead scoring API for website forms and quote engines**
- **Demographic heatmaps showing geographic concentrations of Platinum customers**

---

## USER PERSONAS

### Persona 1: Agency Owner/Principal
**Profile:**
- Owns independent insurance agency with 1,000-5,000 customers
- 10-25 years in insurance industry
- Focused on profitability, growth, and agency valuation
- Limited time for hands-on customer work

**Needs:**
- High-level visibility into book composition and profitability
- Strategic insights on where to focus resources
- ROI tracking on marketing and outreach investments
- Data to support hiring and resource allocation decisions
- **Understanding of which customer demographics are most profitable**
- **Intelligence to guide marketing budget allocation and targeting strategy**

**Success Metrics:**
- Overall agency revenue growth
- Commission per customer increase
- Customer retention rates
- Agency profitability by customer segment
- **New customer acquisition cost**
- **Loss ratio improvement through better prospect selection**

### Persona 2: Licensed Agent/Producer
**Profile:**
- 3-15 years experience selling insurance
- Manages 300-1,000 customer relationships
- Comfortable with technology but prefers simple tools
- Compensated on new policy production and retention

**Needs:**
- Daily prioritized list of who to contact
- Talking points and scripts tailored to each customer
- Easy tracking of outreach activities and follow-ups
- Quick access to customer history during calls
- Clear conversion tracking to measure personal performance
- **Lead scoring for incoming prospects (which leads to prioritize)**
- **Profile of "ideal prospect" to guide prospecting activities**

**Success Metrics:**
- Number of cross-sells closed per month
- Conversion rate on outreach attempts
- Time saved identifying opportunities
- Commission earned from cross-sells
- **New customer quality (claims frequency in first year)**
- **Conversion rate on demographically-targeted leads vs. general leads**

### Persona 3: Customer Service Rep/Account Manager
**Profile:**
- Handles policy service, renewals, and basic customer questions
- May have insurance license but not primary sales role
- First point of contact for many customer interactions
- Limited sales training or confidence

**Needs:**
- Alerts when servicing high-value Platinum customers
- Simple prompts for soft cross-sell mentions during service calls
- Ability to flag opportunities for licensed agents
- Recognition/incentive for identifying opportunities

**Success Metrics:**
- Opportunities identified and passed to agents
- Successful soft referrals to licensed agents
- Customer satisfaction during service interactions

### Persona 4: Marketing Manager/Business Development ⭐ NEW
**Profile:**
- Responsible for lead generation and marketing campaigns
- Manages advertising budget (digital, direct mail, events)
- 2-10 years marketing experience, may not have insurance license
- Compensated on lead volume, lead quality, and marketing ROI
- Works with external vendors (ad agencies, marketing platforms)

**Needs:**
- **Data-driven buyer personas based on actual customer performance**
- **Demographic targeting parameters for advertising campaigns** (age ranges, income levels, occupations, geographies)
- **Ability to create "lookalike audiences" for Facebook/Google Ads based on Platinum customers**
- **Lead scoring criteria to qualify incoming prospects**
- **ROI tracking by marketing channel and demographic targeting**
- **Geographic heatmaps showing where Platinum customers are concentrated**
- **Competitive intelligence on which demographics competitors are targeting**
- **Referral program targeting guidance** (which customer demographics make best referrers)

**Success Metrics:**
- **Cost per lead by demographic targeting**
- **Lead-to-customer conversion rate by prospect profile**
- **Claims frequency of new customers by marketing channel**
- **Marketing ROI (revenue per dollar spent) by demographic campaign**
- **Customer lifetime value by acquisition source and demographic**
- **Time to profitability of new customers by prospect profile**

---

## FUNCTIONAL REQUIREMENTS

### 1. DATA INTEGRATION & MANAGEMENT

#### 1.1 Claims Data Import
**Priority: CRITICAL**

**Requirements:**
- [ ] Import claims history from primary AMS (Applied Epic, Vertafore AMS360, Hawksoft, etc.)
- [ ] Parse claims data including: date, type, amount, status, fault determination
- [ ] Import auto violation/ticket data where available
- [ ] Handle incremental updates (nightly batch or real-time via API)
- [ ] Validate data quality and flag missing/incomplete records
- [ ] Support manual data upload via CSV for agencies with limited system access
- [ ] Historical data: Minimum 3 years, target 5 years of claims history

**Acceptance Criteria:**
- Successfully import 100% of accessible claims records
- Process nightly updates within 2-hour maintenance window
- Flag data quality issues for review (missing dates, invalid amounts, etc.)
- Support at least 3 major AMS platforms at launch

#### 1.2 Customer/Policy Data Import
**Priority: CRITICAL**

**Requirements:**
- [ ] Import customer demographics: age, marital status, occupation, address
- [ ] Import household structure: all drivers, vehicles, properties
- [ ] Import active policies: type, limits, premium, effective dates
- [ ] Import policy history: tenure, gaps in coverage, product changes
- [ ] Calculate key metrics: household premium, policy count, tenure years
- [ ] Identify household groupings (multiple policies under same roof)
- [ ] Support ongoing synchronization with AMS

**Acceptance Criteria:**
- Link policies to correct households with 98%+ accuracy
- Calculate tenure and premium metrics correctly
- Update within 24 hours of changes in source system
- Handle common data quality issues gracefully (missing fields, inconsistent formats)

#### 1.3 Data Enrichment
**Priority: MEDIUM**

**Requirements:**
- [ ] Append home value estimates where not available (Zillow API, county records)
- [ ] Identify business owner indicators from occupation field
- [ ] Flag young family indicators (age + marital status + presence of dependents)
- [ ] Calculate commute distance estimates from address data
- [ ] Append demographic data from third-party sources where permissible

**Acceptance Criteria:**
- Enrich at least 80% of customer records with home value estimates
- Identify business owners with 70%+ precision
- Complete enrichment within 24 hours of new customer import

---

### 2. CUSTOMER SEGMENTATION ENGINE

#### 2.1 Claims-Based Tier Assignment
**Priority: CRITICAL**

**Requirements:**
- [ ] Automatically assign each customer to one of five tiers:
  - **Tier 1 - Platinum:** 0 claims, 0 violations, 3+ year tenure
  - **Tier 2 - Gold:** 1 small claim (<$5K) OR 1 not-at-fault, 0-1 minor violation
  - **Tier 3 - Silver:** 2-3 small claims OR 1 medium claim ($5-15K), mixed fault
  - **Tier 4 - Bronze:** 3+ claims OR 1 large claim (>$15K) OR serious violations
  - **Tier 5 - Red Flag:** 5+ claims OR fraud indicators OR multiple serious violations

- [ ] Tier assignments update nightly with new claims data
- [ ] Track tier changes over time (upgrades/downgrades)
- [ ] Apply configurable lookback period (default 5 years, adjustable 3-7 years)
- [ ] Weight at-fault vs. not-at-fault claims appropriately
- [ ] Consider claim severity (injuries, litigation, high payouts)

**Acceptance Criteria:**
- 60-70% of customers assigned to Platinum tier (validates algorithm)
- Tier assignments completed within nightly processing window
- Zero customers unassigned or in invalid tier state
- Tier assignment logic matches written specification exactly

#### 2.2 Opportunity Identification
**Priority: CRITICAL**

**Requirements:**
- [ ] **Umbrella Opportunities:** Identify customers with auto+home but no umbrella
  - Filter: Platinum tier, 3+ year tenure, home value >$500K OR 2+ vehicles
  - Calculate recommended umbrella limit ($1M, $2M, $5M) based on assets
  
- [ ] **Bundle Opportunities:** Identify single-product Platinum customers
  - Auto-only with home address → quote home
  - Home-only with vehicles on record → quote auto
  - Filter: 2+ year tenure, premium >$1,200/year

- [ ] **Commercial Opportunities:** Identify business owners without commercial coverage
  - Occupation contains: owner, CEO, president, self-employed, proprietor
  - OR business name field populated
  - No existing commercial policies
  - Filter: Platinum tier, 1+ year tenure

- [ ] **Life Insurance Opportunities:** Identify young families without life insurance
  - Age 25-45 with dependents OR mortgage OR married
  - No existing life insurance policy
  - Filter: Platinum tier

- [ ] **Increased Limits:** Identify underinsured Platinum customers
  - Low liability limits relative to assets
  - Minimum coverage on valuable vehicles/properties

**Acceptance Criteria:**
- Opportunity types mutually exclusive and prioritized (umbrella > bundle > commercial > life)
- Each opportunity includes: customer ID, type, reason/trigger, priority score
- Opportunities regenerated nightly with fresh data
- Support filtering/searching opportunities by type, score, agent assignment

---

### 3. DEMOGRAPHIC ANALYSIS & LEAD TARGETING ENGINE ⭐ NEW

#### 3.1 Platinum Customer Demographic Profiling
**Priority: HIGH**

**Requirements:**
- [ ] Analyze demographic attributes of Platinum tier customers vs. all other tiers:
  - **Age distribution** (which age ranges have highest % of Platinum customers)
  - **Occupation categories** (which occupations correlate with zero claims)
  - **Geographic concentration** (zip codes, cities, neighborhoods with high Platinum density)
  - **Home value ranges** (sweet spot for profitable homeowners)
  - **Vehicle types** (sedan vs. SUV vs. luxury, which have fewer claims)
  - **Marital status** (single vs. married claims patterns)
  - **Household composition** (families vs. singles, number of drivers)
  - **Commute patterns** (distance from work, urban vs. suburban vs. rural)
  - **Credit tier** (if available - often correlates with responsibility)
  - **Education level** (if available)
  - **Home ownership status** (renters vs. owners)

- [ ] Calculate "Platinum Index" for each demographic segment:
  - Formula: (% Platinum in segment) / (% Platinum in overall book) × 100
  - Index > 120 = Over-represented in Platinum (target demographic)
  - Index < 80 = Under-represented in Platinum (avoid demographic)

- [ ] Generate claims frequency metrics by demographic:
  - Average claims per year by age, occupation, location, etc.
  - Average claim severity (payout amount) by demographic
  - Loss ratio by demographic segment
  - Years to first claim by demographic

- [ ] Identify demographic combinations with highest Platinum concentration:
  - e.g., "Married, age 40-55, homeowner, $500K-$750K home, accountant occupation"
  - Create top 10 "Platinum Profile" combinations

**Acceptance Criteria:**
- Demographic analysis completed for all customers with sufficient data (90%+)
- Platinum Index calculated for at least 20 demographic segments
- Statistical significance validated (minimum sample sizes per segment)
- Top 5 Platinum Profile combinations identified with >75% Platinum rate

#### 3.2 High-Risk Customer Demographic Profiling
**Priority: HIGH**

**Requirements:**
- [ ] Analyze demographic attributes of Tier 4-5 (high claims) customers:
  - Same demographic dimensions as Platinum analysis
  - Identify which demographics are over-represented in high-claims tiers

- [ ] Calculate "Risk Index" for each demographic segment:
  - Formula: (% High-Claims in segment) / (% High-Claims in overall book) × 100
  - Index > 150 = High-risk demographic (avoid in acquisition)
  - Index 100-150 = Elevated risk (quote cautiously)
  - Index < 100 = Lower risk

- [ ] Identify "red flag" demographic combinations:
  - e.g., "Single, age 18-24, apartment renter, sports car, delivery driver"
  - Create top 10 "Avoid Profile" combinations

- [ ] Claims pattern analysis by demographic:
  - Which demographics have at-fault claims vs. not-at-fault
  - Which have DUIs or serious violations
  - Which have injury claims or litigation
  - Which have water damage or fire claims (home)

**Acceptance Criteria:**
- Risk Index calculated for all demographic segments
- "Avoid Profile" list identifies demographics with >50% Bronze/Red Flag rate
- Clear documentation of which demographic patterns predict high claims

#### 3.3 Prospect Lead Scoring Model
**Priority: CRITICAL**

**Requirements:**
- [ ] Build predictive model to score new prospects before they become customers:
  - Input: Prospect demographic attributes (age, occupation, address, vehicle, home value, etc.)
  - Output: Lead Score (0-100) predicting likelihood of becoming Platinum customer
  - Algorithm: Weighted composite of Platinum Index scores for prospect's demographics

- [ ] Lead score bands:
  - **90-100: Platinum Prospect** (Top priority - likely Platinum customer)
  - **75-89: Gold Prospect** (High priority - good customer potential)
  - **60-74: Silver Prospect** (Medium priority - average risk)
  - **40-59: Bronze Prospect** (Low priority - elevated risk)
  - **0-39: Red Flag Prospect** (Avoid - likely high-claims customer)

- [ ] Provide score explanation/breakdown:
  - "This prospect scores 85 because: Age 45 (Platinum Index 135), Married (Index 115), Homeowner (Index 140), Accountant (Index 150)"
  - Highlight positive and negative demographic factors
  - Show expected claims frequency based on profile

- [ ] Real-time scoring API:
  - Accept prospect data via API call
  - Return lead score and explanation within 500ms
  - Integrate with agency website quote forms
  - Integrate with lead vendors/aggregators

- [ ] Batch scoring for lead lists:
  - Upload CSV of prospects → Receive scored list
  - Prioritize leads for agent follow-up based on scores
  - Filter out Bronze/Red Flag leads automatically if desired

**Acceptance Criteria:**
- Lead scoring model achieves 70%+ accuracy in predicting Platinum vs. high-claims customers
- API responds within 500ms for real-time scoring
- Batch scoring processes 1,000 leads in <2 minutes
- Score explanations clear and actionable for agents

#### 3.4 Marketing Campaign Targeting Intelligence
**Priority: HIGH**

**Requirements:**
- [ ] **Geographic Targeting:**
  - Heatmap visualization of Platinum customer density by zip code
  - Identify zip codes with >70% Platinum rate (target for direct mail, local advertising)
  - Flag zip codes with <50% Platinum rate (avoid or quote selectively)
  - Overlay with population density and competitor presence

- [ ] **Digital Advertising Audience Builders:**
  - Export Platinum customer list for Facebook Custom Audience upload
  - Generate demographic targeting parameters for Facebook/Google Ads:
    * Age ranges with highest Platinum Index
    * Occupation categories
    * Interest/behavior tags correlated with Platinum customers
    * Geographic targeting (zip codes, cities)
  - Create "Lookalike Audience" instructions based on Platinum demographics
  - Provide negative targeting lists (demographics to exclude)

- [ ] **Direct Mail Campaign Targeting:**
  - Generate mailing lists filtered by Platinum Profile demographics
  - Exclude demographics with Risk Index > 150
  - Prioritize neighborhoods with high homeownership and Platinum Index
  - Segment lists by property value for tailored messaging

- [ ] **Referral Program Targeting:**
  - Identify which Platinum customer demographics generate most referrals
  - Provide referral incentive targeting (offer to right demographics)
  - Score referrals based on referring customer's tier + referee demographics

- [ ] **Partner/Affinity Program Guidance:**
  - Identify occupations/employers with high Platinum concentration
  - Suggest affinity partnerships (e.g., nurses, teachers, accountants associations)
  - Provide targeting for professional group sponsorships

**Acceptance Criteria:**
- Geographic heatmap displays with <3 second load time
- Custom Audience export formats compatible with Facebook/Google platforms
- Direct mail lists generate with demographic filtering options
- Referral scoring implemented and tested

#### 3.5 Competitive & Market Intelligence
**Priority: MEDIUM**

**Requirements:**
- [ ] Benchmark agency's demographic mix vs. "ideal" composition:
  - Show current % Platinum by demographic vs. market potential
  - Identify underserved Platinum demographics (opportunity for growth)
  - Flag over-representation in high-risk demographics (portfolio risk)

- [ ] Market opportunity sizing:
  - Estimate number of "Platinum Profile" prospects in service area
  - Calculate addressable market by demographic segment
  - Project revenue potential from targeting Platinum demographics

- [ ] Competitor analysis (if data available):
  - Which demographics are underserved by competitors
  - White space opportunities for niche targeting
  - Defensive strategy for retaining Platinum customers

**Acceptance Criteria:**
- Benchmark report generated quarterly
- Market opportunity calculations accurate within 20%
- Actionable insights for business development strategy

#### 3.6 Lead Source Performance Tracking
**Priority: HIGH**

**Requirements:**
- [ ] Track performance of leads by source and demographic:
  - Organic website → Lead score distribution, conversion rate, first-year claims
  - Google Ads → Lead score, conversion, claims by campaign/keyword
  - Facebook Ads → Lead score, conversion, claims by targeting parameters
  - Referrals → Lead score, conversion, claims (by referring customer tier)
  - Direct mail → Response rate and quality by demographic targeting
  - Lead vendors → Score distribution, conversion, claims frequency

- [ ] Calculate ROI by lead source and demographic targeting:
  - Cost per lead
  - Cost per customer
  - First-year premium per customer
  - Expected lifetime value based on demographic score
  - Marketing ROI = (LTV - CAC) / CAC

- [ ] Automated alerts for poor-performing lead sources:
  - "Google Ads campaign X generating 80% Bronze/Red Flag leads"
  - "Lead vendor Y delivering high-risk demographics"
  - "Direct mail to zip code Z had negative ROI"

- [ ] Optimization recommendations:
  - "Shift budget from Facebook campaign A to campaign B (better lead scores)"
  - "Increase investment in referral program (highest Platinum rate)"
  - "Discontinue lead vendor Y (loss ratio 185%)"

**Acceptance Criteria:**
- Lead source tracking implemented for all major channels
- ROI calculations accurate and update weekly
- Alerts trigger when lead source quality degrades >20%
- Recommendations actionable and specific

---

### 4. OPPORTUNITY SCORING & PRIORITIZATION

#### 3.1 Multi-Factor Scoring Model
**Priority: CRITICAL**

**Requirements:**
- [ ] Implement composite scoring model with weighted factors:
  - **Claims Score (0-10):** 10 for zero claims, 6 for one small claim, 0 for multiple
  - **Tenure Score (0-10):** 10 for 5+ years, 8 for 3-4 years, 6 for 2 years, 4 for 1 year
  - **Premium Score (0-10):** 10 for $3K+, 8 for $2-3K, 6 for $1.5-2K, 4 for $1-1.5K
  - **Gap Score (0-10):** 10 for auto+home/no umbrella, 8 for single product, 9 for business/no commercial, 7 for family/no life
  - **Demographic Score (0-15):** 10 for age 35-64, 8 for 25-34 or 65+, plus bonuses for high home value (+3) and multiple vehicles (+2)

- [ ] Calculate total opportunity score (0-55 scale)
- [ ] Flag opportunities scoring 40+ as "High Priority"
- [ ] Allow manual score adjustments by agents with audit trail
- [ ] Support configurable scoring weights per agency preference

**Acceptance Criteria:**
- Score calculation completes for all opportunities within nightly batch
- Score components visible/explainable in UI
- High priority opportunities (40+) represent top 10-15% of book
- Scoring algorithm validated against manual scoring of test cases

#### 3.2 Prioritized List Generation
**Priority: CRITICAL**

**Requirements:**
- [ ] Generate top 200 opportunities ranked by score
- [ ] Segment by opportunity type for targeted campaigns
- [ ] Support filtering by agent territory/book assignment
- [ ] Export lists to CSV for mail merge, CRM import, etc.
- [ ] Track which opportunities have been worked/contacted
- [ ] Aging/staleness indicator (days since opportunity first identified)

**Acceptance Criteria:**
- Lists update nightly with current scores
- Support sorting by score, premium, tenure, last contact date
- Export includes all fields needed for outreach (name, contact info, opportunity details)
- List filtering by territory/agent works correctly

---

### 5. CAMPAIGN MANAGEMENT

#### 5.1 Outreach Campaign Creation
**Priority: HIGH**

**Requirements:**
- [ ] Create campaigns targeting specific opportunity types
- [ ] Define campaign parameters:
  - Target segment (Platinum only, Gold+, specific opportunity type)
  - Outreach channels (phone, email, direct mail, multi-touch)
  - Campaign timeline/schedule
  - Agent assignments
  - Goal metrics (target conversations, quotes, closes)

- [ ] Support phased campaigns (Week 1: top 50 phone calls, Week 2: next 150 direct mail, etc.)
- [ ] Generate campaign member lists based on scoring/filters
- [ ] Prevent duplicate outreach (don't contact same customer across overlapping campaigns)
- [ ] Track campaign costs (mail, email, agent time) for ROI calculation

**Acceptance Criteria:**
- Campaigns configurable by authorized users (owners, managers)
- Campaign members automatically pulled from opportunity lists
- Duplicate contact prevention works across concurrent campaigns
- Campaign creation workflow intuitive and < 5 minutes

#### 5.2 Agent Task Management
**Priority: HIGH**

**Requirements:**
- [ ] Generate daily task lists for agents based on assigned campaigns
- [ ] Prioritize tasks by opportunity score and campaign phase
- [ ] Provide customer context with each task:
  - Tenure and claims history summary
  - Current policies and premium
  - Identified opportunity and reason
  - Recommended talking points
  - Prior contact history

- [ ] Agent can mark tasks: contacted, appointment set, quote delivered, closed-won, closed-lost, not interested, bad contact info
- [ ] Automated reminders for follow-up tasks
- [ ] Mobile-friendly task interface for agents in field

**Acceptance Criteria:**
- Agents see only their assigned tasks
- Task context loads in <2 seconds
- Mobile interface usable on phone during calls
- Task completion tracked with timestamp and outcome

#### 5.3 Templated Scripts & Messaging
**Priority: HIGH**

**Requirements:**
- [ ] Pre-built scripts for each opportunity type:
  - Umbrella pitch for Platinum auto+home customers
  - Bundle conversation for single-product customers
  - Commercial lines discussion for business owners
  - Life insurance conversation for young families

- [ ] Scripts dynamically populated with customer-specific details:
  - "You've been with us for [X] years"
  - "Zero claims in [Y] years"
  - "You have [Z] vehicles and a home worth [value]"

- [ ] Email templates for each opportunity type
- [ ] Direct mail letter templates
- [ ] Support for agency customization of templates
- [ ] Version control and A/B testing of messaging

**Acceptance Criteria:**
- At least 4 phone scripts available at launch
- Dynamic field replacement works correctly
- Scripts accessible in-task for agents
- Templates editable by agency administrators

#### 5.4 Lead Distribution & Routing ⭐ NEW
**Priority: HIGH**

**Requirements:**
- [ ] Automated lead routing based on lead score and demographic fit:
  - Platinum Prospects (score 90-100) → Senior agents or top performers
  - Gold Prospects (score 75-89) → All licensed agents
  - Silver Prospects (score 60-74) → Junior agents for practice
  - Bronze/Red Flag (score <60) → Hold for review or decline to quote

- [ ] Round-robin or performance-based distribution:
  - Distribute leads equally among agents (round-robin)
  - OR distribute based on agent conversion rates (reward top performers)
  - OR distribute based on agent's demographic specialization (commercial, young families, etc.)

- [ ] Lead notification and assignment:
  - Real-time alerts when new lead assigned (email, SMS, app notification)
  - Lead includes: Contact info, demographic details, lead score & explanation, source
  - SLA timer starts on assignment (e.g., contact within 24 hours)

- [ ] Lead aging and reassignment:
  - If agent doesn't contact lead within SLA → Escalate to manager
  - If agent marks "no contact after 3 attempts" → Reassign to another agent
  - Track lead lifecycle: assigned → contacted → quoted → won/lost

- [ ] Lead source management:
  - Ability to pause/activate lead sources based on quality scores
  - Automatically reject leads below configurable score threshold
  - Return low-quality leads to vendor (if applicable)

- [ ] Manual lead assignment override:
  - Managers can manually assign specific leads to specific agents
  - Handle referrals (assign to referring customer's agent)
  - Territory-based assignment (zip code → agent)

**Acceptance Criteria:**
- Leads distributed within 5 minutes of receipt
- Agents receive real-time notifications
- Lead score and explanation visible to assigned agent
- Reassignment triggers correctly based on aging/non-contact
- Manual override works for special cases

---

### 6. TRACKING & ANALYTICS

#### 6.1 Campaign Performance Dashboard
**Priority: HIGH**

**Requirements:**
- [ ] Real-time dashboard showing:
  - Opportunities identified by type
  - Outreach attempts by channel
  - Contact rate (% of attempts reaching customer)
  - Quote rate (% of contacts resulting in quote)
  - Conversion rate (% of quotes closing)
  - Revenue generated (new premium and commission)
  - ROI by campaign (revenue vs. cost)

- [ ] Drill-down by campaign, opportunity type, agent, time period
- [ ] Comparison views (current vs. prior period, this agent vs. team average)
- [ ] Export dashboard data to Excel/PDF for reporting

**Acceptance Criteria:**
- Dashboard loads in <3 seconds
- Metrics accurate within 1% of source data
- Updates reflect same-day activity
- Visualizations clear and actionable (charts, graphs, KPI cards)

#### 6.2 Customer Segmentation Analytics
**Priority: MEDIUM**

**Requirements:**
- [ ] Book composition view:
  - Pie chart showing % in each tier (Platinum, Gold, Silver, Bronze, Red Flag)
  - Trend over time (are more customers becoming Platinum or sliding to Bronze?)
  - Premium distribution by tier
  - Claims cost by tier

- [ ] Demographic claims analysis:
  - Claims frequency by age range
  - Claims severity by occupation, location, vehicle type
  - Loss ratio by customer segment
  - Profitability heatmap (which demographics are most/least profitable)

- [ ] Opportunity pipeline:
  - Total opportunity count and value by type
  - Aging of opportunities (how long in pipeline)
  - Conversion rate by opportunity age
  - Projected revenue from current pipeline

**Acceptance Criteria:**
- Segmentation view updates nightly
- Drill-down to customer list for any segment
- Export any view to Excel
- Demographic analysis includes 5-year historical data

#### 6.3 Agent Performance Tracking
**Priority: MEDIUM**

**Requirements:**
- [ ] Individual agent scorecards:
  - Opportunities assigned
  - Outreach activity (calls made, emails sent)
  - Contact rate
  - Quote rate
  - Conversion rate
  - Revenue generated
  - Average time to close
  - Leaderboard ranking
  - **Lead conversion rate by lead score band**
  - **New customer quality (avg claims frequency first year)**

- [ ] Comparative analytics (agent vs. team, agent vs. prior period)
- [ ] Activity logging (automatic and manual entry)
- [ ] Goal setting and progress tracking
- [ ] Recognition of top performers

**Acceptance Criteria:**
- Agents can view own performance only (unless manager)
- Managers see all agent performance with comparison views
- Metrics updated daily
- Fair attribution of cross-sells to appropriate agent

#### 6.4 Lead & Acquisition Analytics ⭐ NEW
**Priority: HIGH**

**Requirements:**
- [ ] **Lead Quality Dashboard:**
  - Leads received by source (count, lead score distribution)
  - Platinum/Gold/Silver/Bronze/Red Flag breakdown by source
  - Trend over time (is lead quality improving or degrading?)
  - Cost per lead by source and quality tier
  - Lead source performance ranking

- [ ] **Lead-to-Customer Funnel:**
  - Leads received → Contacted → Quoted → Closed by lead score band
  - Conversion rates by demographic profile
  - Time to close by lead score
  - Drop-off analysis (where do leads fall out of funnel?)

- [ ] **New Customer Performance Tracking:**
  - Claims frequency in first 12 months by lead source
  - Claims frequency by demographic profile vs. prediction
  - First-year retention rate by acquisition source
  - Cross-sell rate by acquisition source (do they buy additional products?)
  - Actual vs. predicted Platinum rate

- [ ] **Marketing ROI Analysis:**
  - Customer Acquisition Cost (CAC) by channel and demographic targeting
  - Lifetime Value (LTV) projection by demographic profile
  - LTV:CAC ratio by marketing campaign
  - Payback period by acquisition source
  - Contribution margin by customer demographic

- [ ] **Demographic Targeting Performance:**
  - Compare predicted Platinum Index to actual performance
  - Test demographic targeting hypothesis (e.g., "married homeowners age 40-55")
  - A/B test results for demographic campaigns
  - Continuously refine Platinum Profile based on new customer performance

- [ ] **Geographic Performance:**
  - New customer acquisition by zip code
  - Claims frequency by acquisition zip code
  - ROI by geographic market
  - Market penetration by territory (Platinum prospects acquired vs. market potential)

**Acceptance Criteria:**
- Lead quality metrics update daily
- New customer claims tracked for 12+ months before finalizing performance classification
- Marketing ROI calculations accurate within 10%
- Demographic targeting performance reviewed quarterly and model refined
- Geographic heatmaps show both acquisition volume and quality

---

### 7. INTEGRATIONS

#### 7.1 Agency Management System (AMS) Integration
**Priority: CRITICAL**

**Requirements:**
- [ ] **Phase 1 Supported Systems:**
  - Applied Epic
  - Vertafore AMS360
  - Hawksoft
  - QQCatalyst

- [ ] Bi-directional sync:
  - Pull: customers, policies, claims, contacts, activities
  - Push: opportunities as leads/activities in AMS, closed sales as new policies

- [ ] Authentication: OAuth or API key as supported by AMS
- [ ] Error handling: log failed syncs, alert on critical failures
- [ ] Sync frequency: nightly full sync + real-time updates for critical fields

**Acceptance Criteria:**
- Initial data import completes successfully for all Phase 1 systems
- Ongoing sync maintains <1% data discrepancy
- Closed sales in system reflect in AMS within 24 hours
- Sync failures alert administrator with actionable error messages

#### 7.2 Email & Calendar Integration
**Priority: MEDIUM**

**Requirements:**
- [ ] Send campaign emails through agency's email system (Office 365, Gmail)
- [ ] Track email opens and clicks
- [ ] Calendar integration for scheduling appointments from tasks
- [ ] Sync appointment outcomes back to campaign tracking

**Acceptance Criteria:**
- Emails sent from agent's actual address (not noreply@)
- Calendar appointments include customer context and opportunity details
- Email tracking data surfaces in dashboard metrics

#### 7.3 Marketing Platforms Integration ⭐ EXPANDED
**Priority: HIGH**

**Requirements:**
- [ ] **Facebook/Meta Ads Integration:**
  - Export Platinum customers as Custom Audience (hashed emails, phone numbers)
  - Create Lookalike Audiences based on Platinum demographic profiles
  - Push demographic targeting parameters (age, location, interests, behaviors)
  - Track ad performance by demographic targeting back into system
  - Pixel integration for website visitor lead scoring

- [ ] **Google Ads Integration:**
  - Create Customer Match audiences from Platinum customers
  - Generate Similar Audiences based on Platinum profiles
  - Push demographic targeting for Google Display/Search campaigns
  - Import conversion data by keyword/campaign
  - Lead form integration (score leads from Google Lead Form ads)

- [ ] **Email Marketing Platforms:**
  - Mailchimp, Constant Contact, Agency Zoom integration
  - Segment lists by tier (Platinum for cross-sell, prospects by lead score)
  - Track email engagement (opens, clicks) → Update lead/customer scores
  - Trigger drip campaigns based on opportunity identification or lead score
  - Automated follow-up sequences

- [ ] **Lead Aggregators & Vendors:**
  - API integration with EverQuote, Insurify, NetQuote, etc.
  - Real-time lead scoring as leads arrive
  - Accept/reject leads based on score threshold
  - Send lead quality feedback back to vendor
  - Pause poor-performing lead sources automatically

- [ ] **CRM/Marketing Automation:**
  - Salesforce, HubSpot, ActiveCampaign integration
  - Sync opportunities as leads/contacts
  - Push lead scores and demographic analysis
  - Track full customer journey from lead to Platinum customer
  - Automated workflow triggers based on tier changes

- [ ] **Quote Engine/Website Form Integration:**
  - Real-time lead scoring API for agency website quote forms
  - Score visitors before quote is generated
  - Prioritize follow-up on high-scoring form submissions
  - Customize quote presentation based on lead score
  - Capture demographic data from form submissions for scoring

**Acceptance Criteria:**
- Custom Audiences export to Facebook/Google in proper format
- Lead scoring API responds <500ms for real-time form integration
- Lead aggregator integrations process leads within 5 minutes
- Email platform syncs maintain <1% error rate
- Full attribution tracking from ad click → lead → customer → claims performance

#### 7.4 Data Enrichment Services ⭐ NEW
**Priority: MEDIUM**

**Requirements:**
- [ ] **Property Data:**
  - Zillow/Redfin API for home value estimates
  - County records for property characteristics (year built, sq ft, lot size)
  - Flood zone, wildfire risk, crime rate data

- [ ] **Demographic Data:**
  - Experian, Acxiom, or similar for household income estimates
  - Education level, occupation verification
  - Lifestyle/interest data for marketing personalization

- [ ] **Business Data:**
  - D&B, Crunchbase for business information
  - Verify business owner status, company size, industry
  - Enrich commercial leads with firmographic data

- [ ] **Credit/Financial:**
  - LexisNexis, TransUnion for credit tier (where permissible)
  - Prior insurance history (C.L.U.E. reports)
  - Verify self-reported information

**Acceptance Criteria:**
- Enrich at least 70% of records with missing data
- Enrichment completes within 24 hours of new customer/lead addition
- Comply with FCRA and privacy regulations for data usage
- Cost per enrichment within budget constraints

---

### 8. TECHNICAL REQUIREMENTS

#### 8.1 Technology Stack
**Recommendations:**

**Backend:**
- **Application:** Python (Flask/Django) or Node.js
- **Database:** PostgreSQL for relational data, Redis for caching
- **ETL/Data Processing:** Apache Airflow or Prefect for scheduled jobs
- **API:** RESTful API with JWT authentication

**Frontend:**
- **Web Application:** React or Vue.js SPA
- **Mobile:** Responsive web (Phase 1), native apps (future)
- **Data Visualization:** Chart.js, D3.js, or Tableau embedded

**Infrastructure:**
- **Hosting:** AWS or Azure (for insurance industry compliance)
- **CDN:** CloudFront or Azure CDN
- **Storage:** S3/Azure Blob for document storage
- **Monitoring:** DataDog, New Relic, or Application Insights

#### 8.2 Data Security & Compliance
**Priority: CRITICAL**

**Requirements:**
- [ ] Encryption at rest (AES-256) and in transit (TLS 1.3)
- [ ] Role-based access control (RBAC):
  - Admin: full system access
  - Manager: view all data, configure campaigns, view all agents
  - Agent: view assigned tasks and customers only
  - CSR: view customers, flag opportunities, no campaign access

- [ ] Audit logging of all data access and changes
- [ ] Compliance with insurance industry regulations:
  - GLBA (Gramm-Leach-Bliley Act) - financial data privacy
  - State insurance data security laws
  - SOC 2 Type II certification (target within 12 months)

- [ ] Data retention policies (configurable by agency)
- [ ] Customer data deletion on request (CCPA/privacy rights)
- [ ] Multi-factor authentication (MFA) for all users
- [ ] Session timeout after 30 minutes inactivity

**Acceptance Criteria:**
- Security audit by third-party firm passes with no critical findings
- Penetration testing completed and vulnerabilities addressed
- GLBA compliance validated by legal counsel
- User permissions enforce correctly (agents cannot see other agents' data)

#### 8.3 Performance & Scalability
**Priority: HIGH**

**Requirements:**
- [ ] Support agencies with 10,000+ customers at launch
- [ ] Page load times <3 seconds (p95)
- [ ] Dashboard queries <5 seconds (p95)
- [ ] Nightly batch processing completes within 4-hour window
- [ ] API response times <500ms (p95)
- [ ] Support 100+ concurrent users per agency
- [ ] Database query optimization (indexes, query plans)
- [ ] Caching strategy for frequently accessed data

**Acceptance Criteria:**
- Load testing validates performance targets
- Monitoring in place to detect performance degradation
- Auto-scaling configured for traffic spikes
- Database can handle 5x current customer volume

#### 8.4 Reliability & Uptime
**Priority: HIGH**

**Requirements:**
- [ ] 99.5% uptime SLA (excluding scheduled maintenance)
- [ ] Automated backups (nightly) with 30-day retention
- [ ] Disaster recovery plan with 4-hour RTO, 1-hour RPO
- [ ] Automated failover for critical services
- [ ] Health check monitoring and alerting
- [ ] Incident response plan with on-call rotation

**Acceptance Criteria:**
- Uptime monitored and reported monthly
- Backup restoration tested quarterly
- Disaster recovery drill conducted annually
- Incidents resolved within SLA targets

---

## USER EXPERIENCE REQUIREMENTS

### 9. INTERFACE DESIGN

#### 9.1 Dashboard - Landing Page
**Priority: CRITICAL**

**Key Elements:**
- KPI cards (at-a-glance metrics):
  - Total Platinum customers
  - Opportunities in pipeline
  - This month's cross-sell revenue
  - Conversion rate (current vs. target)
  - **⭐ NEW: Lead quality score (avg score of last 30 days leads)**
  - **⭐ NEW: New customer Platinum rate (% of new customers becoming Platinum)**

- Opportunity summary (by type):
  - Umbrella: 147 opportunities, $36K potential revenue
  - Bundle: 89 opportunities, $22K potential revenue
  - Commercial: 24 opportunities, $18K potential revenue
  - Life: 52 opportunities, $41K potential revenue

- **⭐ NEW: Lead pipeline summary:**
  - Leads in queue by score band (Platinum: 12, Gold: 24, Silver: 31)
  - Leads requiring contact within 24 hours
  - Lead sources performance trend

- Activity feed (recent wins, upcoming tasks, alerts)
- Quick links to: My Tasks, Top 50 List, Campaign Manager, Reports, **⭐ Lead Dashboard**

**User Flow:**
1. User logs in → Dashboard loads with personalized view
2. User clicks KPI card → Drills down to detail view
3. User clicks opportunity type → Sees filtered list
4. User clicks "My Tasks" → Sees today's prioritized tasks

#### 9.2 Opportunity List View
**Priority: CRITICAL**

**Key Elements:**
- Filterable/sortable table with columns:
  - Customer name
  - Opportunity type
  - Opportunity score (highlighted if 40+)
  - Tenure
  - Current premium
  - Potential new premium
  - Last contact date
  - Status (new, working, quoted, won, lost)
  - Actions (call, email, schedule, view details)

- Filters: tier, opportunity type, score range, agent assignment, status
- Bulk actions: assign to campaign, export to CSV, mark as contacted
- Click row → Opens customer detail modal

**User Flow:**
1. User navigates to Opportunities
2. User filters for "Umbrella" + "Score 40+" + "My customers"
3. User sorts by score descending
4. User clicks top opportunity → Detail modal opens
5. User clicks "Call" → Task created, script displayed
6. User marks outcome → Status updated

#### 9.3 Customer Detail View
**Priority: HIGH**

**Key Elements:**
- Customer snapshot:
  - Name, age, contact info, tenure
  - Tier badge (Platinum, Gold, Silver, etc.)
  - Claims summary: X claims, $Y total, last claim date
  - Risk indicators (violations, gaps in coverage, etc.)

- Policy summary:
  - All active policies with premium and limits
  - Visual indicator of product gaps
  - Opportunity flags with priority scores

- Timeline of interactions:
  - Prior outreach attempts
  - Quotes provided
  - Policy changes
  - Claims filed

- Action panel:
  - Call customer (opens dialer)
  - Send email (opens template)
  - Schedule appointment
  - Create quote
  - Add note

**User Flow:**
1. User opens customer detail
2. User reviews claims history (confirms zero claims, high tenure)
3. User sees "Umbrella Opportunity - Score 48" highlighted
4. User clicks "View Script"
5. User calls customer using integrated dialer
6. User marks outcome and schedules follow-up if needed

#### 9.4 Campaign Manager
**Priority: HIGH**

**Key Elements:**
- Campaign list (active and past campaigns)
- Campaign creation wizard:
  - Step 1: Name, objective, date range
  - Step 2: Target audience (filters, scoring threshold)
  - Step 3: Outreach channels and schedule
  - Step 4: Agent assignments
  - Step 5: Review and launch

- Campaign detail view:
  - Progress metrics (attempted, contacted, quoted, closed)
  - Member list with status
  - Timeline of campaign phases
  - Cost and ROI tracking

**User Flow:**
1. Manager clicks "New Campaign"
2. Wizard: "Platinum Umbrella Push", target 100 customers, score 40+
3. Wizard: Phone calls week 1, email sequence week 2-3
4. Wizard: Assign to agents based on territory
5. Manager reviews preview of target list
6. Manager clicks "Launch"
7. System generates tasks for assigned agents
8. Manager monitors progress on campaign dashboard

#### 9.5 Agent Task Interface
**Priority: CRITICAL**

**Key Elements:**
- Task list (sorted by priority/due date):
  - Customer/Lead name
  - Type (cross-sell opportunity OR new lead)
  - **⭐ Lead score badge** (if lead: Platinum/Gold/Silver/Bronze)
  - Priority indicator
  - Due date
  - Quick actions (call, email, skip)

- Task detail (when selected):
  - Customer context (claims history, tenure, policies) OR Lead context (demographics, score explanation, source)
  - Opportunity description and recommended pitch
  - Talking points script
  - Prior contact notes
  - Next step options (contacted, scheduled, quoted, closed, etc.)

- Simple outcome logging:
  - What happened? (dropdown: spoke to customer, left voicemail, bad number, etc.)
  - Next step? (follow-up date, quote to prepare, closed, not interested)
  - Notes (free text)

**User Flow:**
1. Agent logs in → Sees "You have 8 cross-sell tasks and 4 new leads today"
2. Agent clicks first task (highest priority lead - Platinum score 94)
3. Agent reviews lead context (Age 42, married, homeowner $680K, accountant, 2 vehicles)
4. Agent sees score explanation ("High Platinum likelihood due to: age, occupation, home value")
5. Agent clicks "Call" → Script displays in side panel
6. Agent makes call, discusses coverage
7. Customer interested → Agent selects "Schedule appointment"
8. Agent picks date/time → Task moves to "Appointment Set"
9. Next task automatically loads

#### 9.6 Demographic Intelligence Dashboard ⭐ NEW
**Priority: HIGH**

**Key Elements:**
- **Platinum Profile Summary:**
  - Top 5 demographic combinations with highest Platinum rate
  - Visual representation (cards or tiles) showing key attributes
  - Example: "Married Homeowners, Age 40-55, Professional Occupation = 78% Platinum"

- **Interactive Heatmaps:**
  - Geographic: Zip codes colored by Platinum density (dark green = high, red = low)
  - Age distribution: Bar chart showing Platinum % by age bracket
  - Occupation: Horizontal bar chart showing claims frequency by job type
  - Home value: Scatter plot of home value vs. claims frequency

- **Risk Analysis:**
  - Demographics over-represented in high-claims tiers (Bronze/Red Flag)
  - Trend analysis: Is book composition improving or deteriorating?
  - "Warning" flags for demographics with Loss Ratio >120%

- **Marketing Targeting Tool:**
  - Select target demographic attributes from dropdowns
  - System calculates predicted Platinum Index for that combination
  - Export targeting parameters for Facebook/Google Ads
  - Generate prospect list estimate (# of prospects in market matching profile)

- **Comparative View:**
  - Current book demographics vs. "ideal" composition
  - Opportunity gaps (underserved Platinum demographics)
  - Over-exposure to high-risk demographics

**User Flow (Marketing Manager):**
1. Manager navigates to Demographic Intelligence
2. Reviews Platinum Profile summary → Sees "Married homeowners 40-55" are top performers
3. Clicks geographic heatmap → Identifies 5 zip codes with >75% Platinum rate
4. Clicks "Create Marketing Campaign"
5. System pre-fills demographic targeting for Facebook Ads
6. Manager exports parameters, launches campaign
7. Returns monthly to track performance of targeted campaigns

#### 9.7 Lead Queue & Scoring Interface ⭐ NEW
**Priority: CRITICAL**

**Key Elements:**
- **Lead Inbox:**
  - New leads awaiting assignment or review
  - Score badge prominently displayed (color-coded: green=Platinum, yellow=Gold, gray=Silver, red=Bronze)
  - Lead source, timestamp received, demographic summary
  - Bulk actions: assign, reject, export

- **Lead Detail View:**
  - Contact information
  - Demographic data captured (age, address, occupation, vehicles, home, etc.)
  - **Lead Score Breakdown:**
    * Overall score: 85/100 (Gold Prospect)
    * Score factors:
      - Age 45: Platinum Index 135 (+15 pts)
      - Married: Platinum Index 115 (+8 pts)
      - Homeowner $600K: Platinum Index 145 (+18 pts)
      - Occupation (Teacher): Platinum Index 130 (+12 pts)
    * Predicted claims frequency: 0.10 per year
    * Estimated LTV: $8,500
  - Lead source and cost
  - Assignment history (if reassigned)

- **Filtering & Sorting:**
  - Filter by score band, source, date received, assigned/unassigned
  - Sort by score (high to low), age, source
  - Search by name, email, phone, zip code

- **Quick Actions:**
  - Assign to agent (dropdown or auto-assign)
  - Reject/decline to quote (with reason)
  - Mark as duplicate
  - Request more information
  - Convert to opportunity (if accepted and quoted)

**User Flow (Manager):**
1. Manager opens Lead Queue → Sees 32 new leads
2. Filters for "Platinum + Gold scores" → 18 leads
3. Selects top 10 → Bulk assigns to senior agents
4. Clicks one Silver lead (score 67) → Reviews demographics
5. Sees young age (22) and apartment renter → Assigns to junior agent for practice
6. Filters for "Bronze/Red Flag" → 3 leads from one vendor
7. Rejects all, adds note "Poor quality from Vendor X, pausing source"

#### 9.8 Mobile Experience
**Priority: MEDIUM**

**Requirements:**
- Responsive design for phone/tablet
- Mobile-optimized task list (simplified columns)
- Click-to-call integration
- Quick outcome logging (minimal typing)
- Offline mode for viewing customer details (sync when connected)

**Acceptance Criteria:**
- Mobile interface usable on iPhone 12+ and equivalent Android
- All critical functions accessible on mobile
- No horizontal scrolling required
- Touch targets minimum 44x44 pixels

---

## SUCCESS METRICS & KPIs

### 10. PRODUCT SUCCESS METRICS

#### 10.1 System Adoption Metrics
**Target: 90 Days Post-Launch**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Active users (monthly) | 90% of agency staff | Login analytics |
| Tasks completed per agent per week | 20+ | Task logging |
| Opportunities worked per agent per month | 40+ | Status updates |
| **Leads processed per agent per week** | **15+** | **Lead status updates** |
| User satisfaction (NPS) | 40+ | Quarterly survey |
| Support tickets per user per month | <2 | Support system |

#### 10.2 Business Impact Metrics
**Target: 12 Months Post-Launch**

**Cross-Sell Performance:**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Platinum customers identified | 60-70% of book | Segmentation report |
| Umbrella policies written | 40% conversion on top 100 | Policy count |
| New multi-product customers | 25% conversion on single-product Platinum | Customer policy count |
| Cross-sell revenue increase | 15-25% vs. prior year | Premium reports |
| Customer retention lift | +5% on Platinum customers | Retention analysis |
| Customer lifetime value increase | +20% on Platinum customers | LTV calculation |
| Agent productivity | +30% cross-sells per agent | Agent performance |

**Lead Targeting & Acquisition Performance:** ⭐ NEW
| Metric | Target | Measurement |
|--------|--------|-------------|
| **Lead quality score (average)** | **70+ (Gold range)** | **Lead scoring system** |
| **% Platinum/Gold leads** | **60%+ of all leads** | **Lead distribution** |
| **New customer Platinum rate** | **55-65%** (vs. 60-70% of existing book) | **12-month tracking** |
| **New customer claims frequency** | **<0.15 per year** (vs. <0.10 for tenured Platinum) | **Claims tracking** |
| **Lead-to-customer conversion** | **25-35% (Platinum/Gold leads)** | **Funnel analysis** |
| **Customer acquisition cost reduction** | **-20% through better targeting** | **CAC calculation** |
| **Marketing ROI improvement** | **+40% through demographic targeting** | **LTV:CAC ratio** |
| **Loss ratio on new customers** | **<60%** (vs. industry avg 70-80%) | **Underwriting data** |
| **First-year retention** | **>90% (targeted leads)** vs. 85% overall | **Retention tracking** |

#### 10.3 Operational Efficiency Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to identify opportunities | <1 hour nightly | Batch job duration |
| Time per cross-sell attempt | -50% vs. manual | Time tracking |
| Contact rate | >60% of outreach attempts | Campaign tracking |
| Quote rate | >50% of contacts | Funnel analysis |
| Average days to close | <30 days | Pipeline velocity |
| **Lead processing time** | **<5 minutes from receipt to assignment** | **Lead routing logs** |
| **Lead scoring accuracy** | **70%+ (predicted vs. actual Platinum rate)** | **12-month validation** |
| **Marketing campaign setup time** | **<30 minutes with demographic targeting** | **User timing** |

#### 10.4 Demographic Intelligence Metrics ⭐ NEW

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Platinum demographic profiles identified** | **5-10 high-performing combinations** | **Analysis output** |
| **Demographic targeting campaigns launched** | **3+ per quarter** | **Campaign tracking** |
| **Improvement in lead quality** | **+15 points average score after 6 months targeting** | **Before/after comparison** |
| **Geographic targeting effectiveness** | **Top 5 zip codes generate 30%+ of Platinum customers** | **Acquisition analysis** |
| **Marketing budget efficiency** | **50% of budget to demographics with Platinum Index >120** | **Budget allocation** |
| **Model accuracy improvement** | **Lead scoring predictive accuracy improves 10% annually** | **Continuous validation** |

---

## IMPLEMENTATION ROADMAP

### 11. PHASED DELIVERY PLAN

#### Phase 1: Foundation (Months 1-3)
**Goal: Core data engine and segmentation**

**Deliverables:**
- Data integration framework (AMS connectors for 2-3 major systems)
- Claims import and validation
- Customer/policy data model
- 5-tier segmentation algorithm
- Basic admin interface for data validation
- Database schema and ETL pipelines

**Exit Criteria:**
- Successfully import and segment 10 pilot agencies (10,000+ customers)
- Platinum tier represents 60-70% of each book
- Tier assignments match manual validation >95%

#### Phase 2: Opportunity Identification & Demographic Analysis (Months 4-6) ⭐ EXPANDED
**Goal: Automated opportunity detection, scoring, AND demographic profiling**

**Deliverables:**
- Opportunity identification logic (umbrella, bundle, commercial, life)
- Multi-factor scoring model
- Opportunity database and prioritization
- Basic opportunity list export (CSV)
- Admin tools for scoring configuration
- **⭐ Demographic analysis engine**
- **⭐ Platinum vs. high-risk demographic profiling**
- **⭐ Platinum Index calculation by demographic segment**
- **⭐ Initial "Platinum Profile" identification (top 5-10 combinations)**
- **⭐ Geographic heatmap of Platinum customer concentration**

**Exit Criteria:**
- Identify 150-200 umbrella opportunities per 1,000 customers
- Scoring model validated by agency owners as accurate prioritization
- Export lists usable for mail merge and manual outreach
- **⭐ Demographic profiles identify segments with 70%+ Platinum rate**
- **⭐ Geographic heatmap shows clear Platinum concentration patterns**

#### Phase 3: Agent Interface & Lead Scoring (Months 7-8) ⭐ EXPANDED
**Goal: Agent-facing tools for execution AND prospect lead scoring**

**Deliverables:**
- Agent dashboard and task list
- Customer detail views
- Pre-built scripts and templates
- Task outcome logging
- Mobile-responsive design
- **⭐ Lead scoring model (0-100 scale)**
- **⭐ Real-time lead scoring API**
- **⭐ Lead queue interface with score display**
- **⭐ Lead assignment and routing logic**

**Exit Criteria:**
- 90% of agents log in and use system weekly
- Task completion rate >80%
- Agent feedback rating >4/5
- Mobile interface functional on iOS and Android
- **⭐ Lead scoring API responds <500ms**
- **⭐ Lead scoring achieves 65%+ predictive accuracy (initial model)**

#### Phase 4: Campaign Management & Marketing Integration (Months 9-10) ⭐ EXPANDED
**Goal: Systematic outreach orchestration AND marketing platform integration**

**Deliverables:**
- Campaign creation wizard
- Multi-channel outreach support (phone, email, mail)
- Automated task generation
- Campaign progress tracking
- Email integration and tracking
- **⭐ Facebook/Google Ads Custom Audience export**
- **⭐ Demographic targeting parameter generation**
- **⭐ Lead source integration (aggregators, website forms)**
- **⭐ Lead source performance tracking**

**Exit Criteria:**
- Agencies successfully launch umbrella campaigns with 100+ members
- 40% contact rate achieved
- Campaign ROI tracking functional
- **⭐ Custom Audience exports compatible with ad platforms**
- **⭐ Lead sources integrated and distributing scored leads**

#### Phase 5: Analytics & Reporting (Months 11-12) ⭐ EXPANDED
**Goal: Performance visibility, optimization, AND demographic intelligence dashboards**

**Deliverables:**
- Performance dashboard (campaign, agent, book composition)
- Demographic claims analysis
- Exportable reports
- Goal tracking and leaderboards
- Historical trend analysis
- **⭐ Demographic Intelligence Dashboard**
- **⭐ Lead quality & acquisition analytics**
- **⭐ Marketing ROI tracking by demographic targeting**
- **⭐ New customer performance tracking (claims frequency, retention)**
- **⭐ Lead source quality comparison**

**Exit Criteria:**
- Agencies using analytics to optimize future campaigns
- Clear ROI calculation per campaign
- Demographic insights actionable
- **⭐ Marketing managers using demographic targeting for ad campaigns**
- **⭐ Lead quality scores correlating with actual performance**
- **⭐ New customer Platinum rate tracking for 12+ months**

#### Phase 6: Advanced Features & Optimization (Month 13+)
**Goal: Optimization, scale, and predictive intelligence**

**Deliverables:**
- A/B testing framework for messaging
- Predictive analytics (churn risk, conversion probability)
- **⭐ Machine learning-enhanced lead scoring** (beyond demographic rules)
- **⭐ Lookalike audience generation algorithms**
- **⭐ Automated marketing campaign optimization**
- Expanded AMS integrations
- Advanced automation (trigger campaigns, AI-powered recommendations)
- API for third-party integrations
- **⭐ Continuous model refinement based on actual outcomes**

**Exit Criteria:**
- 50+ agencies using system
- Measurable improvement in conversion rates through A/B testing
- Churn prediction model validated
- **⭐ ML lead scoring outperforms rule-based scoring by 10%+**
- **⭐ Automated optimization improves marketing ROI by 20%+**
- **⭐ Lead scoring accuracy improves to 75%+ predictive accuracy**

---

## DEPENDENCIES & ASSUMPTIONS

### 12. CRITICAL DEPENDENCIES

**External Dependencies:**
1. **AMS Vendor Cooperation**
   - API access and documentation from Applied, Vertafore, Hawksoft
   - Response time to integration questions/issues
   - Stability of APIs (versioning, breaking changes)

2. **Data Quality**
   - Agencies must have 3-5 years of claims history in AMS
   - Customer demographic data reasonably complete
   - Policy data accurately reflects current coverage

3. **Agency Participation**
   - Pilot agencies commit to testing and feedback
   - Agents willing to adopt new workflow
   - Management support for rollout and training

4. **⭐ Marketing Platform Access (NEW)**
   - Facebook/Google Ads API access for Custom Audiences
   - Lead aggregator APIs available and documented
   - Website/quote engine allows integration for lead scoring
   - Email platform APIs for campaign integration

5. **⭐ Data Enrichment Services (NEW)**
   - Third-party data providers for demographic enrichment
   - Compliance with data usage regulations
   - Reasonable cost per record enriched

**Internal Dependencies:**
6. **Development Resources**
   - 3-4 full-time engineers (1 backend, 1 frontend, 1 data, 0.5-1 ML/analytics)
   - 1 product manager
   - 1 UX/UI designer
   - QA support

7. **Infrastructure**
   - Cloud hosting account and budget
   - Third-party service accounts (email, monitoring, etc.)
   - Legal/compliance review capacity

### 13. ASSUMPTIONS

**Market Assumptions:**
- Independent agencies have 60-70% of customers with zero claims (validates segmentation)
- Umbrella conversion rate of 40% is achievable with Platinum customers
- **⭐ Demographic patterns in claims behavior are consistent and predictable**
- **⭐ Targeting "lookalike" prospects will improve lead quality by 30-50%**
- **⭐ Agencies willing to pay premium for qualified leads vs. quantity**
- Agencies will pay $200-500/month per user for this solution
- Market size: 35,000+ independent agencies in US

**Technical Assumptions:**
- AMS vendors will provide read access to necessary data
- Claims data is structured consistently across agencies
- Standard web technologies sufficient (no specialized AI/ML infrastructure needed initially)
- **⭐ Demographic attributes can be captured/inferred for 70%+ of prospects**
- **⭐ Real-time lead scoring achievable within performance requirements (<500ms)**
- **⭐ Marketing platform APIs stable and adequate for integration needs**

**Business Assumptions:**
- Agencies prioritize cross-sell over new customer acquisition (but will value both)
- Agents will adopt system if it simplifies their workflow
- ROI is achievable within 6 months of launch per agency
- **⭐ Marketing managers exist or can be hired to leverage demographic targeting**
- **⭐ Agencies willing to shift budget toward targeted acquisition vs. broad campaigns**
- **⭐ Predictive lead scoring will be valued even at 65-70% accuracy**

---

## RISKS & MITIGATION

### 14. RISK REGISTER

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| **AMS integration delays** | High | High | Start with CSV import as fallback; prioritize 1-2 integrations; build generic ETL framework |
| **Poor data quality in pilot agencies** | Medium | High | Set minimum data requirements for pilots; include data cleanup tools; offer data hygiene consulting |
| **Low agent adoption** | Medium | Critical | Invest heavily in UX; provide comprehensive training; involve agents in design feedback; show quick wins |
| **Scoring model inaccurate** | Medium | Medium | A/B test scoring variants; include manual override; iterate based on conversion data |
| **⭐ Lead scoring accuracy insufficient** | **Medium** | **High** | **Start with 65% accuracy target; continuous model refinement; validate against 12-month actual data; combine demographic rules with ML** |
| **⭐ Demographics don't predict claims** | **Low** | **Critical** | **Validate on historical data before launch; use multiple demographic factors; allow for regional variations; continuous monitoring** |
| **⭐ Marketing platform API changes** | **Medium** | **Medium** | **Build abstraction layer; monitor platform roadmaps; maintain fallback manual export options** |
| **⭐ Privacy/discrimination concerns** | **Low** | **High** | **Legal review of demographic targeting; document business justification (actuarial risk); avoid protected classes as sole factors; transparency with customers** |
| **Compliance/regulatory issues** | Low | Critical | Engage legal counsel early; obtain SOC 2 certification; implement robust security; document compliance measures |
| **Customer privacy concerns** | Low | Medium | Transparent privacy policy; opt-out mechanisms; data minimization; strong encryption |
| **Competition from AMS vendors** | Medium | Medium | Move fast; differentiate on ease-of-use; build agency community; focus on outcomes not features |
| **Scalability issues at launch** | Low | High | Over-provision infrastructure initially; load testing before launch; phased rollout |
| **⭐ Lead quality doesn't improve** | **Medium** | **High** | **Set realistic expectations (30-50% improvement); track and compare to baseline; pivot targeting if needed; continuous optimization** |
| **⭐ Agencies resist demographic targeting** | **Low** | **Medium** | **Education on actuarial science basis; show competitor success; ROI case studies; make it optional feature** |

---

## GO-TO-MARKET CONSIDERATIONS

### 15. LAUNCH STRATEGY

**Pre-Launch (Months 1-6):**
- Recruit 10 pilot agencies (100-5,000 customers each)
- Beta program with close collaboration and rapid iteration
- Build case studies and ROI calculators
- **⭐ Collect baseline lead quality and marketing metrics for comparison**
- **⭐ Document demographic patterns across pilot agencies**

**Soft Launch (Months 7-9):**
- Open to 50 early adopter agencies
- Referral program (pilot agencies recruit peers)
- Content marketing (blogs, webinars on claims-based targeting **⭐ AND demographic intelligence**)
- **⭐ Share case studies on improved lead quality and acquisition ROI**

**General Availability (Month 10+):**
- Public launch at industry conferences (IIABA, PIA)
- Paid advertising (insurance trade publications, Google)
- Partnership with agency networks and clusters
- **⭐ Partnership with lead aggregators (promote lead scoring capabilities)**
- Freemium tier (basic segmentation) to drive adoption

**Pricing Model (Recommendation):**
- **Starter:** $199/month - Up to 1,000 customers, 2 users, basic segmentation, **⭐ 100 scored leads/month**
- **Professional:** $399/month - Up to 5,000 customers, 10 users, full cross-sell features, **⭐ demographic intelligence, 500 scored leads/month**
- **Enterprise:** $799/month - Unlimited customers, unlimited users, white-glove support, custom integrations, **⭐ unlimited lead scoring, custom demographic modeling**
- **⭐ Add-on: Lead Scoring API** - $0.10-0.50 per lead scored (for high-volume agencies)

**Value Proposition:**

**Primary:** *"Stop wasting time on risky customers. Identify your most profitable customers for cross-sell, and target lookalike prospects for acquisition."*

**Key Messages:**
1. **Cross-Sell Intelligence:** "Your Platinum customers (zero claims) are hidden gold. We find them automatically and prioritize the best opportunities."

2. **⭐ Smarter Acquisition (NEW):** "Stop buying bad leads. We analyze your best customers' demographics and score every prospect before you waste time quoting."

3. **⭐ Marketing ROI (NEW):** "Shift your ad budget to demographics that actually become profitable customers. See which zip codes, ages, and occupations have the lowest claims rates."

4. **Data-Driven Growth:** "Grow revenue 20-35% through strategic cross-sell to existing Platinum customers PLUS better quality acquisition."

5. **Risk Management:** "Reduce loss ratios by focusing resources on profitable customer demographics and declining high-risk prospects."

**Target Buyer:**
- **Primary:** Agency owner/principal (economic buyer)
- **Secondary:** Marketing manager (if agency has one)
- **Influencer:** Top-producing agents (want better leads and easier cross-sell identification)

**Competitive Positioning:**
- **vs. AMS Native Tools:** "We're specialized; they're generalists. We automate what takes them hours."
- **vs. Marketing Automation (HubSpot, etc.):** "We're insurance-specific with claims intelligence. They don't understand risk."
- **⭐ vs. Lead Aggregators (NEW):** "We make YOUR leads better, regardless of source. Plus we tell you which sources to invest in."
- **⭐ vs. Traditional Demographic Targeting:** "We use YOUR claims data, not industry averages. It's personalized to your book."

---

## EXPECTED RESULTS

### 16. PROJECTED OUTCOMES (Based on 1,000 Customer Agency)

#### CROSS-SELL RESULTS (Existing Customers)

**Platinum Tier Customers:**
- Expected: 600-700 customers (60-70% of book)

**Umbrella Opportunities:**
- Auto+Home bundles without umbrella: 150-200
- Outreach to top 100
- Conversion: 40% = 40 policies
- Average premium: $250
- Average commission: $100
- **Revenue: $10,000**

**Bundle Expansion (Single Product → Multi-Line):**
- Single-product Platinum customers: 200-300
- Outreach to top 100
- Conversion: 25% = 25 bundled policies
- Average new premium: $1,200
- Average commission: 12% = $144
- **Revenue: $3,600**

**Commercial Lines:**
- Business owners identified: 50-75
- Outreach to top 30
- Conversion: 20% = 6 policies
- Average premium: $2,500
- Average commission: 18% = $450
- **Revenue: $2,700**

**Life Insurance:**
- Young families identified: 100-150
- Outreach to top 50
- Conversion: 15% = 7-8 policies
- Average first-year commission: $800
- **Revenue: $6,000**

**Cross-Sell Subtotal:**
- New policies: 78-79
- New annual premium: ~$50,000
- Commission revenue: ~$22,300

---

#### LEAD TARGETING RESULTS ⭐ NEW

**Baseline (Before System):**
- Leads per month: 100
- Average lead score: 55 (Silver range)
- Lead-to-customer conversion: 18%
- New customers per month: 18
- % becoming Platinum (first year): 40%
- Platinum new customers: 7 per month
- Cost per lead: $25
- Cost per customer: $139
- Monthly lead spend: $2,500
- Annual customer acquisition: 216 customers
- Annual spend: $30,000

**After Demographic Targeting (12 Months Post-Launch):**
- Leads per month: 100 (same volume)
- **Average lead score: 72 (Gold range)** - 17 point improvement
- **Lead-to-customer conversion: 28%** - improved by targeting better prospects
- **New customers per month: 28** - 55% increase
- **% becoming Platinum (first year): 58%** - improved demographic selection
- **Platinum new customers: 16 per month** - 129% increase in quality customers!
- Cost per lead: $25 (same)
- **Cost per customer: $89** - 36% reduction in CAC
- Monthly lead spend: $2,500 (same budget)
- **Annual customer acquisition: 336 customers** - 55% increase
- Annual spend: $30,000 (same)

**Impact Analysis:**
- +120 net new customers per year (336 vs. 216)
- +108 Platinum customers per year (194 vs. 86)
- -$50 cost per customer acquired ($89 vs. $139)
- **Estimated premium per new customer: $1,500**
- **New premium from improved targeting: $180,000 annually**
- **Commission on new premium (12%): $21,600 first year**

**Longer-Term Impact (Years 2-5):**
- Higher retention (Platinum customers stay longer): +5% = $9,000 additional revenue
- Lower claims costs (better risk selection): Loss ratio improvement 60% vs. 75% = $27,000 savings
- More cross-sell opportunities (Platinum customers buy more): +$5,000
- **Total incremental value: $62,600 over 5 years from Year 1's better targeting**

**Combined Year 1 Impact:** $21,600 (acquisition improvement) + $22,300 (cross-sell) = **$43,900 first-year commission revenue**

---

#### MARKETING EFFICIENCY IMPROVEMENTS ⭐ NEW

**Budget Reallocation:**
- Before: $30,000 spread across all channels equally
- After: $30,000 optimized based on lead quality scores

| Channel | Before Budget | Before Lead Score | After Budget | After Lead Score | ROI Improvement |
|---------|---------------|-------------------|--------------|------------------|------------------|
| Google Ads (broad keywords) | $6,000 | 48 | $3,000 | 52 | -50% budget, modest targeting improvement |
| Google Ads (targeted keywords) | $0 | N/A | $4,500 | 78 | New spend on high-performing terms |
| Facebook Ads (broad targeting) | $6,000 | 52 | $2,000 | 58 | Reduced, slightly better targeting |
| Facebook Ads (Lookalike) | $0 | N/A | $6,000 | 82 | **New, high-quality audience** |
| Direct Mail (all zip codes) | $8,000 | 58 | $3,000 | 62 | Reduced waste on low-Platinum zips |
| Direct Mail (targeted zips) | $0 | N/A | $5,500 | 75 | **Geo-targeted to Platinum concentration** |
| Lead Aggregators (all) | $10,000 | 50 | $3,000 | 54 | Paused poor-performing vendors |
| Referrals (organic) | $0 | 85 | $3,000 | 85 | **Incentivized, highest quality source** |

**Result:** Same $30K budget, average lead score improves from 55 to 72, more efficient allocation

---

#### BOOK COMPOSITION IMPROVEMENT (3-Year Projection)

**Year 0 (Pre-System):**
- Total customers: 1,000
- Platinum tier: 650 (65%)
- Gold tier: 220 (22%)
- Silver/Bronze/Red Flag: 130 (13%)
- Loss ratio: 72%

**Year 3 (Post-System):**
- Total customers: 1,450 (growth through better acquisition + retention)
- Platinum tier: 1,050 (72%) - improved through targeting
- Gold tier: 305 (21%)
- Silver/Bronze/Red Flag: 95 (7%) - reduced through selective quoting
- Loss ratio: 62% - **10 point improvement = $145,000 annual savings**

**Strategic Outcome:**
- More customers, higher quality
- Higher premium per customer (Platinum customers buy more coverage)
- Lower claims costs
- Better retention
- More agency profitability and valuation

---

## APPENDICES

### APPENDIX A: GLOSSARY

**AMS (Agency Management System):** Software used by insurance agencies to manage customers, policies, and transactions. Examples: Applied Epic, Vertafore AMS360, Hawksoft.

**At-Fault Claim:** Insurance claim where the policyholder is determined to be responsible for the loss.

**Bundle/Bundling:** Packaging multiple insurance products (auto + home) with one carrier for discount and convenience.

**BOP (Business Owners Policy):** Commercial insurance package for small businesses combining property and liability coverage.

**Claim Frequency:** Number of claims per customer or per year.

**Claims Severity:** Average dollar amount per claim.

**Commercial Lines:** Insurance products for businesses (general liability, commercial auto, workers comp, etc.).

**Conversion Rate:** Percentage of contacted prospects who purchase.

**Cross-Sell:** Selling additional products to existing customers.

**ETL (Extract, Transform, Load):** Data integration process.

**GLBA (Gramm-Leach-Bliley Act):** Federal law requiring financial institutions to protect customer data.

**KPI (Key Performance Indicator):** Measurable value demonstrating effectiveness.

**Loss Ratio:** Claims paid divided by premiums earned. Lower is better for profitability.

**Personal Lines:** Insurance products for individuals/families (auto, home, umbrella, life).

**Platinum Tier:** Highest-value customer segment with zero claims.

**Premium:** Amount paid for insurance coverage.

**Subrogation:** Insurance company recovering claim costs from responsible party.

**Umbrella Policy:** Excess liability coverage above auto/home policy limits, typically $1M-$5M.

**Underinsured:** Having insurance coverage below actual risk/asset level.

### APPENDIX B: SAMPLE QUERIES (SQL)

*See original framework document for detailed SQL examples for:*
- Platinum umbrella opportunities
- Single-product bundle opportunities
- Business owner commercial opportunities
- Young family life insurance opportunities
- High-claims demographic analysis

### APPENDIX C: COMPETITOR ANALYSIS

**Existing Solutions:**
1. **Agency Zoom** - Marketing automation for agencies, limited claims-based targeting, no lead scoring
2. **Rocket Referrals** - Referral program automation, no claims intelligence or demographic profiling
3. **Indio Technologies** - Client onboarding, not focused on cross-sell or acquisition targeting
4. **AMS Native Tools** - Basic reporting, manual process to identify opportunities, no predictive lead scoring
5. **⭐ Lead Aggregators (EverQuote, NetQuote, Insurify)** - Provide leads but no quality scoring, demographic intelligence, or optimization guidance
6. **⭐ Marketing Automation (HubSpot, Salesforce)** - Generic CRM/marketing tools without insurance-specific claims analysis or risk-based targeting

**Our Differentiation:**
- **Only solution focused specifically on claims-based segmentation** for both existing customers AND new prospects
- **Automated opportunity identification and prioritization** based on actual profitability data
- **Purpose-built for insurance cross-sell and smarter acquisition** (not generic CRM)
- **Deep integration with claims data** to predict future customer value
- **⭐ Predictive lead scoring** using demographic patterns from YOUR book, not industry averages
- **⭐ Marketing intelligence dashboard** showing which demographics actually become profitable customers
- **⭐ Complete acquisition lifecycle** from targeting → scoring → routing → performance tracking
- **Proven methodology** from framework document validated across agencies

**Unique Value:**
- We turn your claims history into both cross-sell opportunities AND a targeting roadmap for acquisition
- We make every lead better through scoring and every marketing dollar more efficient through demographic intelligence
- We close the loop: Track which prospects become Platinum customers and continuously refine targeting

### APPENDIX D: TECHNICAL ARCHITECTURE DIAGRAM

*To be developed during Phase 1:*
- System component diagram
- Data flow diagram
- Integration architecture
- Security architecture

### APPENDIX E: COMPLIANCE CHECKLIST

- [ ] GLBA compliance review
- [ ] State insurance data security laws (all 50 states)
- [ ] SOC 2 Type II certification process initiated
- [ ] Privacy policy drafted and reviewed by counsel
- [ ] Data protection impact assessment (DPIA) completed
- [ ] Vendor security questionnaire template
- [ ] Incident response plan documented
- [ ] Business continuity plan documented
- [ ] Data retention policy defined
- [ ] Data subject access request (DSAR) process defined

---

## DOCUMENT CONTROL

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | TBD | [PM Name] | Initial draft |
| 0.5 | TBD | [PM Name] | Internal review feedback incorporated |
| 1.0 | November 14, 2025 | [PM Name] | Approved for development |

**Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Engineering Lead | | | |
| Design Lead | | | |
| CTO/VP Engineering | | | |
| CEO/Executive Sponsor | | | |

**Distribution:**
- Product team
- Engineering team
- Design team
- Sales & marketing
- Customer success
- Executive team

---

**Next Steps:**
1. Schedule kickoff meeting with engineering and design
2. Finalize pilot agency selection
3. Begin Phase 1 development sprint planning
4. Establish weekly product review cadence
5. Set up project management tools (Jira, Confluence, etc.)

---

*This PRD is a living document and will be updated as requirements evolve through customer feedback, technical discovery, and market changes.*