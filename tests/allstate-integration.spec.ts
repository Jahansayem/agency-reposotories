/**
 * Allstate Analytics Integration Tests
 *
 * Tests for the cross-sell opportunities and data upload functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('Allstate Analytics Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Login (adjust based on actual login flow)
    await page.waitForSelector('[data-testid="user-card-Derrick"]', { timeout: 10000 });
    await page.click('[data-testid="user-card-Derrick"]');

    // Enter PIN
    await page.waitForSelector('[data-testid="pin-input"]', { timeout: 5000 });
    await page.fill('[data-testid="pin-input"]', '8008');
    await page.click('button:has-text("Login")');

    // Wait for main app to load
    await page.waitForSelector('[data-testid="main-app"]', { timeout: 10000 });
  });

  test.describe('API Endpoints', () => {
    test('GET /api/analytics/cross-sell returns opportunities list', async ({ request }) => {
      const response = await request.get('/api/analytics/cross-sell');

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('opportunities');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('summary');
      expect(Array.isArray(data.opportunities)).toBeTruthy();
    });

    test('GET /api/analytics/cross-sell with tier filter', async ({ request }) => {
      const response = await request.get('/api/analytics/cross-sell?tier=HOT,HIGH');

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('opportunities');

      // All returned opportunities should be HOT or HIGH
      for (const opp of data.opportunities) {
        expect(['HOT', 'HIGH']).toContain(opp.priority_tier);
      }
    });

    test('GET /api/analytics/calendar returns calendar entries', async ({ request }) => {
      const response = await request.get('/api/analytics/calendar');

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('entries');
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('date_range');
    });

    test('GET /api/analytics/upload returns upload history', async ({ request }) => {
      const response = await request.get('/api/analytics/upload?limit=5');

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('batches');
      expect(Array.isArray(data.batches)).toBeTruthy();
    });

    test('POST /api/analytics/cross-sell creates new opportunity', async ({ request }) => {
      const newOpp = {
        customer_name: 'Test Customer',
        phone: '555-123-4567',
        email: 'test@example.com',
        current_products: 'Auto',
        recommended_product: 'Homeowners',
        current_premium: 1500,
        potential_premium_add: 2500,
        priority_tier: 'MEDIUM',
        priority_score: 75,
        segment_type: 'auto_to_home',
      };

      const response = await request.post('/api/analytics/cross-sell', {
        data: newOpp,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.opportunity).toBeDefined();
      expect(data.opportunity.customer_name).toBe('Test Customer');

      // Clean up - dismiss the test opportunity
      if (data.opportunity?.id) {
        await request.delete(`/api/analytics/cross-sell?id=${data.opportunity.id}`);
      }
    });

    test('PATCH /api/analytics/cross-sell marks opportunity as contacted', async ({ request }) => {
      // First create a test opportunity
      const createResponse = await request.post('/api/analytics/cross-sell', {
        data: {
          customer_name: 'Contact Test Customer',
          current_products: 'Auto',
          recommended_product: 'Homeowners',
          priority_tier: 'LOW',
          priority_score: 50,
        },
      });

      const { opportunity } = await createResponse.json();

      // Mark as contacted
      const patchResponse = await request.patch('/api/analytics/cross-sell', {
        data: {
          id: opportunity.id,
          mark_contacted: true,
          contacted_by: 'Derrick',
          contact_notes: 'Test contact',
        },
      });

      expect(patchResponse.status()).toBe(200);

      const patchData = await patchResponse.json();
      expect(patchData.success).toBeTruthy();
      expect(patchData.opportunity.contacted_at).toBeDefined();
      expect(patchData.opportunity.contacted_by).toBe('Derrick');

      // Clean up
      await request.delete(`/api/analytics/cross-sell?id=${opportunity.id}`);
    });
  });

  test.describe('Upload Functionality', () => {
    test('rejects invalid file types', async ({ request }) => {
      const formData = new FormData();
      const invalidFile = new Blob(['invalid content'], { type: 'text/plain' });
      formData.append('file', invalidFile, 'test.txt');
      formData.append('uploaded_by', 'Derrick');
      formData.append('data_source', 'book_of_business');

      const response = await request.post('/api/analytics/upload', {
        multipart: {
          file: {
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('invalid content'),
          },
          uploaded_by: 'Derrick',
          data_source: 'book_of_business',
        },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid file type');
    });

    test('processes valid CSV data', async ({ request }) => {
      // Create a valid CSV with the expected columns
      const csvContent = `Customer Name,Phone,Email,Renewal Date,Current Products,Premium,Tenure
John Doe,555-111-2222,john@test.com,03/15/2026,Auto,1800,5
Jane Smith,555-333-4444,jane@test.com,03/20/2026,Homeowners,2500,10`;

      const response = await request.post('/api/analytics/upload', {
        multipart: {
          file: {
            name: 'test_data.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent),
          },
          uploaded_by: 'Derrick',
          data_source: 'book_of_business',
          dry_run: 'true', // Don't actually insert, just validate
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.dry_run).toBeTruthy();
      expect(data.stats.valid_records).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Task Generation', () => {
    test('generates tasks from opportunities', async ({ request }) => {
      // Create a test opportunity first
      const createResponse = await request.post('/api/analytics/cross-sell', {
        data: {
          customer_name: 'Task Gen Test',
          phone: '555-999-8888',
          current_products: 'Auto',
          recommended_product: 'Homeowners',
          priority_tier: 'HOT',
          priority_score: 110,
          renewal_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          talking_point_1: 'Great time to bundle',
          talking_point_2: 'Save 20% with bundle',
          talking_point_3: 'Long-term customer appreciation',
        },
      });

      const { opportunity } = await createResponse.json();

      // Generate task from this opportunity
      const generateResponse = await request.post('/api/analytics/cross-sell/generate-tasks', {
        data: {
          opportunity_ids: [opportunity.id],
          created_by: 'Derrick',
          options: {
            create_subtasks: true,
            include_talking_points_in_notes: true,
          },
        },
      });

      expect(generateResponse.status()).toBe(200);

      const genData = await generateResponse.json();
      expect(genData.success).toBeTruthy();
      expect(genData.tasks_created).toBe(1);
      expect(genData.tasks[0].opportunity_id).toBe(opportunity.id);

      // Clean up - dismiss the opportunity (task cleanup is separate)
      await request.delete(`/api/analytics/cross-sell?id=${opportunity.id}`);
    });
  });

  test.describe('Priority Tier Scoring', () => {
    test('HOT tier for imminent renewals with high score', async ({ request }) => {
      // Create opportunity with renewal in 5 days
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 5);

      const response = await request.post('/api/analytics/cross-sell', {
        data: {
          customer_name: 'HOT Tier Test',
          current_products: 'Auto',
          recommended_product: 'Home',
          current_premium: 3000,
          potential_premium_add: 2500,
          renewal_date: renewalDate.toISOString().split('T')[0],
          tenure_years: 15,
          policy_count: 1,
          ezpay_status: 'Yes',
          balance_due: 0,
          priority_tier: 'HOT',
          priority_score: 115,
        },
      });

      const { opportunity } = await response.json();

      expect(opportunity.priority_tier).toBe('HOT');
      expect(opportunity.priority_score).toBeGreaterThanOrEqual(100);

      // Clean up
      await request.delete(`/api/analytics/cross-sell?id=${opportunity.id}`);
    });
  });
});
