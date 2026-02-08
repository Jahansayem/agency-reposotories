/**
 * Import customers from JSON to Supabase
 *
 * Usage: npx tsx scripts/import-customers.ts
 *
 * This script reads customers.json and crossSellOpportunities.json and imports
 * them into the customer_insights and cross_sell_opportunities tables.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  console.error('You can run: source .env.local && npx tsx scripts/import-customers.ts');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface CustomerJson {
  name: string;
  totalPremium: number;
  policyCount: number;
  zipCode: string;
  email: string;
  phone: string;
  tenure: number;
  ezpay: boolean;
  products: string[];
  gender: string;
  maritalStatus: string;
  claimCount: number;
}

interface CrossSellJson {
  priorityRank: number;
  priorityTier: string;
  priorityScore: number;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  renewalDate: string;
  daysUntilRenewal: number;
  currentProducts: string; // It's a string, not array
  recommendedProduct: string;
  segment: string;
  currentPremium: number;
  potentialPremiumAdd: number;
  expectedConversionPct: number;
  retentionLiftPct: number;
  talkingPoint1: string;
  talkingPoint2: string;
  talkingPoint3: string;
  balanceDue: number;
  renewalStatus: string;
  ezpayStatus: string;
  tenureYears: number;
  policyCount: number;
}

function getRetentionRisk(claimCount: number, tenure: number): 'low' | 'medium' | 'high' {
  if (claimCount >= 3) return 'high';
  if (claimCount >= 1 && tenure < 24) return 'medium';
  if (tenure < 12) return 'medium';
  return 'low';
}

async function clearExistingData() {
  console.log('Clearing existing demo data...');

  // Delete only records with NULL agency_id (demo data)
  const { error: deleteInsights } = await supabase
    .from('customer_insights')
    .delete()
    .is('agency_id', null);

  if (deleteInsights) {
    console.error('Error clearing customer_insights:', deleteInsights.message);
  } else {
    console.log('Cleared customer_insights demo data');
  }

  const { error: deleteOpps } = await supabase
    .from('cross_sell_opportunities')
    .delete()
    .is('agency_id', null);

  if (deleteOpps) {
    console.error('Error clearing cross_sell_opportunities:', deleteOpps.message);
  } else {
    console.log('Cleared cross_sell_opportunities demo data');
  }
}

async function importCustomers() {
  const customersPath = path.join(__dirname, '../src/data/customers.json');

  if (!fs.existsSync(customersPath)) {
    console.error('customers.json not found at', customersPath);
    process.exit(1);
  }

  const customersRaw = fs.readFileSync(customersPath, 'utf-8');
  const customers: CustomerJson[] = JSON.parse(customersRaw);

  console.log(`Found ${customers.length} customers to import`);

  // Transform to database format
  const dbRecords = customers.map((c) => ({
    customer_name: c.name,
    customer_email: c.email || null,
    customer_phone: c.phone || null,
    total_premium: c.totalPremium || 0,
    total_policies: c.policyCount || 0,
    products_held: c.products || [],
    tenure_years: Math.floor((c.tenure || 0) / 12), // Convert months to years
    retention_risk: getRetentionRisk(c.claimCount || 0, c.tenure || 0),
    agency_id: null, // Will be scoped later when multi-tenancy is fully enabled
  }));

  // Insert in batches of 100
  const BATCH_SIZE = 100;
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < dbRecords.length; i += BATCH_SIZE) {
    const batch = dbRecords.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('customer_insights')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
      failed += batch.length;
    } else {
      imported += data?.length || 0;
      process.stdout.write(`\rImported ${imported}/${customers.length} customers...`);
    }
  }

  console.log(`\n✅ Customer import complete: ${imported} imported, ${failed} failed`);
  return imported;
}

async function importCrossSellOpportunities() {
  const oppsPath = path.join(__dirname, '../src/data/crossSellOpportunities.json');

  if (!fs.existsSync(oppsPath)) {
    console.log('crossSellOpportunities.json not found, skipping...');
    return 0;
  }

  const oppsRaw = fs.readFileSync(oppsPath, 'utf-8');
  const opportunities: CrossSellJson[] = JSON.parse(oppsRaw);

  console.log(`Found ${opportunities.length} cross-sell opportunities to import`);

  // Map segment types to valid database values
  function mapSegmentType(segment: string | null | undefined): string {
    if (!segment) return 'auto_to_home';
    const lower = segment.toLowerCase();
    if (lower.includes('auto') && lower.includes('home')) return 'auto_to_home';
    if (lower.includes('home') && lower.includes('auto')) return 'home_to_auto';
    if (lower.includes('mono') || lower.includes('bundle')) return 'mono_to_bundle';
    if (lower.includes('life')) return 'add_life';
    if (lower.includes('umbrella')) return 'add_umbrella';
    if (lower.includes('commercial')) return 'commercial_add';
    return 'other';
  }

  // Map renewal status to valid database values
  // Valid: 'Not Taken', 'Renewed', 'Pending', 'At Risk', 'Cancelled'
  function mapRenewalStatus(status: string | null | undefined): string {
    if (!status) return 'Pending';
    const lower = status.toLowerCase();
    if (lower === 'not taken' || lower.includes('not taken')) return 'Not Taken';
    if (lower.includes('renew')) return 'Renewed';
    if (lower.includes('cancel')) return 'Cancelled';
    if (lower.includes('risk') || lower.includes('lapse')) return 'At Risk';
    if (lower.includes('pending')) return 'Pending';
    return 'Pending';
  }

  // Parse date from MM/DD/YYYY to ISO format
  function parseDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr; // Return as-is if not MM/DD/YYYY format
  }

  // Transform to database format
  const dbRecords = opportunities.map((o) => ({
    customer_name: o.customerName,
    email: o.email || null,
    phone: o.phone || null,
    address: o.address || null,
    city: o.city || null,
    zip_code: o.zipCode || null,
    current_premium: o.currentPremium || 0,
    policy_count: o.policyCount || 1,
    tenure_years: o.tenureYears || 0,
    current_products: o.currentProducts || '',
    recommended_product: o.recommendedProduct,
    segment_type: mapSegmentType(o.segment),
    potential_premium_add: o.potentialPremiumAdd || 0,
    expected_conversion_pct: o.expectedConversionPct || 0,
    priority_score: o.priorityScore || 50,
    priority_tier: o.priorityTier || 'MEDIUM',
    priority_rank: o.priorityRank || 999,
    renewal_date: parseDate(o.renewalDate),
    days_until_renewal: o.daysUntilRenewal || null,
    renewal_status: mapRenewalStatus(o.renewalStatus),
    balance_due: o.balanceDue || 0,
    talking_point_1: o.talkingPoint1 || null,
    talking_point_2: o.talkingPoint2 || null,
    talking_point_3: o.talkingPoint3 || null,
    dismissed: false,
    agency_id: null,
  }));

  // Insert in batches of 100
  const BATCH_SIZE = 100;
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < dbRecords.length; i += BATCH_SIZE) {
    const batch = dbRecords.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('cross_sell_opportunities')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
      failed += batch.length;
    } else {
      imported += data?.length || 0;
      process.stdout.write(`\rImported ${imported}/${opportunities.length} opportunities...`);
    }
  }

  console.log(`\n✅ Cross-sell import complete: ${imported} imported, ${failed} failed`);
  return imported;
}

async function main() {
  console.log('🚀 Starting customer data import...\n');

  // Clear existing demo data first
  await clearExistingData();

  // Import customers
  const customersImported = await importCustomers();

  // Import cross-sell opportunities
  const oppsImported = await importCrossSellOpportunities();

  console.log('\n📊 Import Summary:');
  console.log(`   Customers: ${customersImported}`);
  console.log(`   Cross-sell opportunities: ${oppsImported}`);
  console.log('\n✨ Done!');
}

main().catch(console.error);
