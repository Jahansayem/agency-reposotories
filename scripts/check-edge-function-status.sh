#!/bin/bash

# Edge Function Status Checker
# Verifies if digest-cron Edge Function is properly configured

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  Edge Function Status Checker"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found"
    echo "   Install with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Check login status
echo "Checking login status..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase"
    echo "   Run: supabase login"
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Check if project is linked
if [ ! -f ".git/supabase-project-ref" ]; then
    echo "⚠️  Project not linked"
    echo "   Run: supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "   Find your project ref at:"
    echo "   Supabase Dashboard → Settings → General → Reference ID"
    exit 1
fi

PROJECT_REF=$(cat .git/supabase-project-ref 2>/dev/null || echo "")
if [ -z "$PROJECT_REF" ]; then
    echo "❌ Could not read project reference"
    exit 1
fi

echo "✅ Project linked: $PROJECT_REF"
echo ""

# List deployed Edge Functions
echo "Checking deployed Edge Functions..."
echo ""

FUNCTIONS=$(supabase functions list 2>&1)

if echo "$FUNCTIONS" | grep -q "digest-cron"; then
    echo "✅ digest-cron Edge Function is DEPLOYED"
    echo ""
    echo "$FUNCTIONS"
    echo ""

    # Check function logs
    echo "═══════════════════════════════════════════════════════════"
    echo "Recent function logs (last 10 entries):"
    echo "═══════════════════════════════════════════════════════════"
    supabase functions logs digest-cron --limit 10 2>&1 || echo "No logs available yet"
    echo ""

else
    echo "❌ digest-cron Edge Function NOT FOUND"
    echo ""
    echo "Deployed functions:"
    echo "$FUNCTIONS"
    echo ""
    echo "To deploy, run:"
    echo "  supabase functions deploy digest-cron"
fi

echo ""

# Check secrets
echo "═══════════════════════════════════════════════════════════"
echo "Checking environment secrets..."
echo "═══════════════════════════════════════════════════════════"

SECRETS=$(supabase secrets list 2>&1)

if echo "$SECRETS" | grep -q "NETLIFY_URL"; then
    echo "✅ NETLIFY_URL is set"
else
    echo "❌ NETLIFY_URL not set"
    echo "   Run: supabase secrets set NETLIFY_URL=https://your-site.netlify.app"
fi

if echo "$SECRETS" | grep -q "OUTLOOK_ADDON_API_KEY"; then
    echo "✅ OUTLOOK_ADDON_API_KEY is set"
else
    echo "❌ OUTLOOK_ADDON_API_KEY not set"
    echo "   Run: supabase secrets set OUTLOOK_ADDON_API_KEY=your-api-key"
fi

echo ""

# Test function endpoint
echo "═══════════════════════════════════════════════════════════"
echo "Testing Edge Function endpoint..."
echo "═══════════════════════════════════════════════════════════"

FUNCTION_URL="https://$PROJECT_REF.supabase.co/functions/v1/digest-cron?type=morning"

echo "Endpoint: $FUNCTION_URL"
echo ""

if command -v curl &> /dev/null; then
    echo "Testing with curl..."
    RESPONSE=$(curl -s -w "\n%{http_code}" "$FUNCTION_URL" 2>&1 || echo "")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Function responded successfully (HTTP $HTTP_CODE)"
        echo ""
        echo "Response:"
        echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    else
        echo "⚠️  Function responded with HTTP $HTTP_CODE"
        echo ""
        echo "Response:"
        echo "$BODY"
    fi
else
    echo "⚠️  curl not found - skipping endpoint test"
    echo "   Test manually with:"
    echo "   curl \"$FUNCTION_URL\""
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Status Check Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Configure cron triggers in Supabase Dashboard"
echo "  2. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/functions"
echo "  3. Click 'digest-cron' → Add Trigger → Cron"
echo ""
echo "  Morning: 0 13 * * * → ?type=morning"
echo "  Afternoon: 0 0 * * * → ?type=afternoon"
echo ""
