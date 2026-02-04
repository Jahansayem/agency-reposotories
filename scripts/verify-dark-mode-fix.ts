/**
 * Verify Dark Mode Fix
 * Checks that DashboardPage.tsx uses CSS variables instead of hardcoded colors
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 Verifying Dark Mode Fix\n');
console.log('='.repeat(80) + '\n');

// Check 1: Verify DashboardPage.tsx uses CSS variable
console.log('CHECK 1: DashboardPage.tsx Background\n');

const dashboardPagePath = path.resolve(__dirname, '../src/components/views/DashboardPage.tsx');
const dashboardPageContent = fs.readFileSync(dashboardPagePath, 'utf-8');

const hasBgSlate50 = dashboardPageContent.includes('bg-slate-50');
const hasCssVariable = dashboardPageContent.includes('bg-[var(--background)]');

if (hasBgSlate50) {
  console.log('❌ FAIL: Found hardcoded bg-slate-50 in DashboardPage.tsx');

  // Show line numbers where it appears
  const lines = dashboardPageContent.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('bg-slate-50')) {
      console.log(`   Line ${index + 1}: ${line.trim()}`);
    }
  });
  console.log('');
} else {
  console.log('✅ PASS: No hardcoded bg-slate-50 found\n');
}

if (hasCssVariable) {
  console.log('✅ PASS: Using CSS variable bg-[var(--background)]\n');

  // Show line where it appears
  const lines = dashboardPageContent.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('bg-[var(--background)]')) {
      console.log(`   Line ${index + 1}: ${line.trim()}`);
    }
  });
  console.log('');
} else {
  console.log('❌ FAIL: CSS variable bg-[var(--background)] not found\n');
}

// Check 2: Verify CSS variables are defined in globals.css
console.log('━'.repeat(80));
console.log('CHECK 2: CSS Variables in globals.css\n');

const globalsPath = path.resolve(__dirname, '../src/app/globals.css');
const globalsContent = fs.readFileSync(globalsPath, 'utf-8');

const hasLightBackground = globalsContent.match(/--background:\s*#F8FAFC/);
const hasDarkBackground = globalsContent.match(/:root\.dark[\s\S]*?--background:\s*#0A1628/);

if (hasLightBackground) {
  console.log('✅ PASS: Light mode --background defined (#F8FAFC)\n');
} else {
  console.log('❌ FAIL: Light mode --background not found\n');
}

if (hasDarkBackground) {
  console.log('✅ PASS: Dark mode --background defined (#0A1628)\n');
} else {
  console.log('❌ FAIL: Dark mode --background not found\n');
}

// Check 3: Look for other hardcoded slate colors in DashboardPage
console.log('━'.repeat(80));
console.log('CHECK 3: Other Hardcoded Colors in DashboardPage\n');

const hardcodedSlateColors = dashboardPageContent.match(/bg-slate-\d+/g);
const hardcodedGrayColors = dashboardPageContent.match(/bg-gray-\d+/g);

if (hardcodedSlateColors && hardcodedSlateColors.length > 0) {
  console.log(`⚠️  WARNING: Found ${hardcodedSlateColors.length} hardcoded slate colors:\n`);
  console.log(`   ${Array.from(new Set(hardcodedSlateColors)).join(', ')}\n`);
} else {
  console.log('✅ PASS: No hardcoded slate colors found\n');
}

if (hardcodedGrayColors && hardcodedGrayColors.length > 0) {
  console.log(`⚠️  WARNING: Found ${hardcodedGrayColors.length} hardcoded gray colors:\n`);
  console.log(`   ${Array.from(new Set(hardcodedGrayColors)).join(', ')}\n`);
} else {
  console.log('✅ PASS: No hardcoded gray colors found\n');
}

// Check 4: Verify DailyDigestPanel uses CSS variables
console.log('━'.repeat(80));
console.log('CHECK 4: DailyDigestPanel.tsx\n');

const digestPath = path.resolve(__dirname, '../src/components/dashboard/DailyDigestPanel.tsx');
const digestContent = fs.readFileSync(digestPath, 'utf-8');

const digestHasSurface = digestContent.includes('bg-[var(--surface)]');
const digestHasBackground = digestContent.includes('bg-[var(--background)]');
const digestHasSlate = digestContent.includes('bg-slate-');

if (digestHasSurface || digestHasBackground) {
  console.log('✅ PASS: DailyDigestPanel uses CSS variables\n');
} else {
  console.log('⚠️  WARNING: DailyDigestPanel may not be using CSS variables\n');
}

if (digestHasSlate) {
  console.log('⚠️  WARNING: DailyDigestPanel has hardcoded slate colors\n');
} else {
  console.log('✅ PASS: No hardcoded slate colors in DailyDigestPanel\n');
}

// Final summary
console.log('='.repeat(80));
console.log('🎯 SUMMARY\n');

const issues: string[] = [];

if (hasBgSlate50) {
  issues.push('❌ DashboardPage still has bg-slate-50');
}

if (!hasCssVariable) {
  issues.push('❌ DashboardPage missing bg-[var(--background)]');
}

if (!hasLightBackground || !hasDarkBackground) {
  issues.push('❌ CSS variables not properly defined');
}

if (issues.length === 0) {
  console.log('✅ ✅ ✅  ALL CHECKS PASSED  ✅ ✅ ✅\n');
  console.log('Dark mode fix successfully applied!');
  console.log('Dashboard background will now properly switch between light and dark modes.\n');
  console.log('Expected behavior:');
  console.log('  - Light mode: #F8FAFC (light gray-blue)');
  console.log('  - Dark mode: #0A1628 (dark blue-gray)\n');
} else {
  console.log('⚠️  ISSUES DETECTED:\n');
  issues.forEach(issue => console.log(`   ${issue}`));
  console.log('');
}

console.log('='.repeat(80));

// Exit with appropriate code
process.exit(issues.length > 0 ? 1 : 0);
