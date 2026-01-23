#!/bin/bash

# Deploy Daily Digest Cron to Supabase Edge Functions
# This script automates the deployment process

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════"
echo "  Daily Digest Cron - Supabase Deployment Script"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
echo "Checking Supabase login status..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please login:"
    supabase login
fi

echo "✅ Logged in to Supabase"
echo ""

# Prompt for project ref if not linked
if [ ! -f ".git/supabase-project-ref" ]; then
    echo "📝 Enter your Supabase project reference ID:"
    echo "   (Find it in: Supabase Dashboard → Settings → General → Reference ID)"
    read -p "   Project Ref: " PROJECT_REF

    if [ -z "$PROJECT_REF" ]; then
        echo "❌ Project ref is required"
        exit 1
    fi

    echo "Linking to project $PROJECT_REF..."
    supabase link --project-ref "$PROJECT_REF"

    # Save for future use
    mkdir -p .git
    echo "$PROJECT_REF" > .git/supabase-project-ref
else
    PROJECT_REF=$(cat .git/supabase-project-ref)
    echo "✅ Using saved project ref: $PROJECT_REF"
fi

echo ""

# Check if secrets are set
echo "📝 Checking environment secrets..."
echo ""
echo "Current secrets (you'll need to set these if not already set):"
echo "  1. NETLIFY_URL - Your deployed site URL"
echo "  2. OUTLOOK_ADDON_API_KEY - Your API key"
echo ""

read -p "Have you already set these secrets? (y/n): " SECRETS_SET

if [ "$SECRETS_SET" != "y" ]; then
    echo ""
    echo "Setting up secrets..."

    read -p "Enter your site URL (e.g., https://your-app.netlify.app): " SITE_URL
    if [ -z "$SITE_URL" ]; then
        echo "❌ Site URL is required"
        exit 1
    fi

    read -p "Enter your API key (OUTLOOK_ADDON_API_KEY): " API_KEY
    if [ -z "$API_KEY" ]; then
        echo "❌ API key is required"
        exit 1
    fi

    echo "Setting NETLIFY_URL..."
    supabase secrets set NETLIFY_URL="$SITE_URL"

    echo "Setting OUTLOOK_ADDON_API_KEY..."
    supabase secrets set OUTLOOK_ADDON_API_KEY="$API_KEY"

    echo "✅ Secrets configured"
fi

echo ""
echo "🚀 Deploying digest-cron Edge Function..."
supabase functions deploy digest-cron

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Deployment Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next Steps:"
echo ""
echo "1. Configure Cron Triggers in Supabase Dashboard:"
echo "   → Go to: https://supabase.com/dashboard/project/$PROJECT_REF/functions"
echo "   → Click on 'digest-cron' function"
echo "   → Add two cron triggers:"
echo ""
echo "   Morning Digest:"
echo "   - Name: Morning Digest"
echo "   - Cron: 0 13 * * *  (5am Pacific = 1pm UTC)"
echo "   - Request Path: ?type=morning"
echo ""
echo "   Afternoon Digest:"
echo "   - Name: Afternoon Digest"
echo "   - Cron: 0 0 * * *  (4pm Pacific = 12am UTC)"
echo "   - Request Path: ?type=afternoon"
echo ""
echo "2. Test the function:"
echo "   curl \"https://$PROJECT_REF.supabase.co/functions/v1/digest-cron?type=morning\""
echo ""
echo "3. Monitor logs in Supabase Dashboard → Edge Functions → digest-cron"
echo ""
echo "═══════════════════════════════════════════════════════════"
