# Scheduled Digest Generation Setup

The daily digest feature generates personalized AI briefings for all users at scheduled times:
- **Morning digest**: 5:00 AM Pacific Time
- **Afternoon digest**: 4:00 PM Pacific Time

## How It Works

1. External cron service calls `POST /api/digest/generate?type=morning|afternoon`
2. API generates AI-powered digest for each user
3. Stores digests in `daily_digests` table
4. Sends push notifications to users with enabled notifications

## Setup with cron-job.org (Free)

### Step 1: Create Account
1. Go to [cron-job.org](https://cron-job.org)
2. Sign up for a free account

### Step 2: Get Your API Key
The API key is the `OUTLOOK_ADDON_API_KEY` environment variable set in Railway.

To find it:
1. Go to [Railway Dashboard](https://railway.app)
2. Select your project
3. Go to Variables
4. Copy the value of `OUTLOOK_ADDON_API_KEY`

### Step 3: Create Morning Digest Cron Job

1. Click "Create cronjob"
2. Fill in the details:
   - **Title**: `Morning Digest Generation`
   - **URL**: `https://shared-todo-list-production.up.railway.app/api/digest/generate?type=morning`
   - **Schedule**: Custom cron expression: `0 5 * * *` (5:00 AM)
   - **Timezone**: `America/Los_Angeles` (Pacific Time)
   - **Request method**: `POST`
   - **Request headers**:
     ```
     X-API-Key: <your-api-key>
     Content-Type: application/json
     ```
3. Click "Create"

### Step 4: Create Afternoon Digest Cron Job

1. Click "Create cronjob"
2. Fill in the details:
   - **Title**: `Afternoon Digest Generation`
   - **URL**: `https://shared-todo-list-production.up.railway.app/api/digest/generate?type=afternoon`
   - **Schedule**: Custom cron expression: `0 16 * * *` (4:00 PM)
   - **Timezone**: `America/Los_Angeles` (Pacific Time)
   - **Request method**: `POST`
   - **Request headers**:
     ```
     X-API-Key: <your-api-key>
     Content-Type: application/json
     ```
3. Click "Create"

## Testing the Endpoint

You can test the endpoint manually:

```bash
# Test morning digest
curl -X POST "https://shared-todo-list-production.up.railway.app/api/digest/generate?type=morning" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json"

# Test afternoon digest
curl -X POST "https://shared-todo-list-production.up.railway.app/api/digest/generate?type=afternoon" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json"

# Health check
curl -X GET "https://shared-todo-list-production.up.railway.app/api/digest/generate" \
  -H "X-API-Key: YOUR_API_KEY"
```

## Expected Response

```json
{
  "success": true,
  "digestType": "morning",
  "generated": 2,
  "notified": 1,
  "failed": 0,
  "duration": "3500ms",
  "results": [
    { "userName": "Derrick", "generated": true, "notified": true },
    { "userName": "Sefra", "generated": true, "notified": false }
  ]
}
```

## Troubleshooting

### 401 Unauthorized
- Verify the `X-API-Key` header matches `OUTLOOK_ADDON_API_KEY` in Railway

### 500 Internal Server Error
- Check that `ANTHROPIC_API_KEY` is set in Railway
- Check Railway logs for detailed error messages

### Digests Not Appearing
- Verify the cron job is enabled and running (check cron-job.org history)
- Check the `daily_digests` table in Supabase
- Ensure the user has accessed the dashboard to see their digest

## Alternative: GitHub Actions (Optional)

If you prefer using GitHub Actions:

Create `.github/workflows/digest-cron.yml`:

```yaml
name: Generate Daily Digests

on:
  schedule:
    # 5 AM PT (12 PM UTC in winter, 1 PM UTC in summer due to DST)
    - cron: '0 13 * * *'
    # 4 PM PT (11 PM UTC in winter, 12 AM UTC next day in summer)
    - cron: '0 0 * * *'
  workflow_dispatch:
    inputs:
      type:
        description: 'Digest type'
        required: true
        default: 'morning'
        type: choice
        options:
          - morning
          - afternoon

jobs:
  generate-digest:
    runs-on: ubuntu-latest
    steps:
      - name: Determine digest type
        id: type
        run: |
          HOUR=$(TZ=America/Los_Angeles date +%H)
          if [ "${{ github.event.inputs.type }}" != "" ]; then
            echo "type=${{ github.event.inputs.type }}" >> $GITHUB_OUTPUT
          elif [ "$HOUR" -lt 12 ]; then
            echo "type=morning" >> $GITHUB_OUTPUT
          else
            echo "type=afternoon" >> $GITHUB_OUTPUT
          fi

      - name: Generate digest
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/digest/generate?type=${{ steps.type.outputs.type }}" \
            -H "X-API-Key: ${{ secrets.OUTLOOK_ADDON_API_KEY }}" \
            -H "Content-Type: application/json" \
            --fail
```

Required secrets:
- `APP_URL`: `https://shared-todo-list-production.up.railway.app`
- `OUTLOOK_ADDON_API_KEY`: Your API key
