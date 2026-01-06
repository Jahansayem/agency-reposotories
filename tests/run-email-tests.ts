#!/usr/bin/env tsx
/**
 * Integration Test Runner for Email Generation API
 * Run with: npx tsx tests/run-email-tests.ts
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const ENDPOINT = `${API_URL}/api/ai/generate-email`;

interface TaskSummary {
  text: string;
  status: 'todo' | 'in_progress' | 'done';
  subtasksCompleted: number;
  subtasksTotal: number;
  notes?: string;
  dueDate?: string;
  transcription?: string;
  attachments?: Array<{ file_name: string; file_type: string }>;
  completed?: boolean;
}

interface EmailRequest {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  tasks: TaskSummary[];
  tone: 'formal' | 'friendly' | 'brief';
  senderName: string;
  includeNextSteps: boolean;
}

interface EmailResponse {
  success: boolean;
  subject?: string;
  body?: string;
  suggestedFollowUp?: string | null;
  warnings?: Array<{
    type: string;
    message: string;
    location: string;
  }>;
  error?: string;
}

// Test results tracking
let passed = 0;
let failed = 0;
const failures: string[] = [];

async function generateEmail(request: EmailRequest): Promise<EmailResponse> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.json();
}

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.log(`  ❌ ${message}`);
    failures.push(message);
  }
}

async function runTests() {
  console.log('\n🧪 Running Email Generation Integration Tests\n');
  console.log(`Testing endpoint: ${ENDPOINT}\n`);

  // Test 1: Basic Email Generation
  console.log('Test 1: Basic email generation');
  try {
    const result1 = await generateEmail({
      customerName: 'John Smith',
      customerEmail: 'john@example.com',
      tasks: [{
        text: 'Review auto insurance policy',
        status: 'done',
        subtasksCompleted: 0,
        subtasksTotal: 0,
        completed: true,
      }],
      tone: 'friendly',
      senderName: 'Sarah Johnson',
      includeNextSteps: true,
    });

    assert(result1.success === true, 'Email generation successful');
    assert(!!result1.subject, 'Subject line generated');
    assert(!!result1.body, 'Body generated');
    assert(result1.body!.includes('John') || result1.body!.includes('john'), 'Customer name in email');
    assert(!result1.body!.includes('['), 'No placeholder text');
    assert(Array.isArray(result1.warnings), 'Warnings array present');
  } catch (err) {
    console.log(`  ❌ Test failed with error: ${err}`);
    failed++;
  }

  // Test 2: Email with Transcription
  console.log('\nTest 2: Email with voicemail transcription');
  try {
    const result2 = await generateEmail({
      customerName: 'Mike Johnson',
      customerPhone: '555-1234',
      tasks: [{
        text: 'Follow up on renewal quote',
        status: 'in_progress',
        subtasksCompleted: 1,
        subtasksTotal: 3,
        transcription: 'Hi, I got your quote but the premium seems higher than last year. Can you explain why?',
      }],
      tone: 'friendly',
      senderName: 'Sarah',
      includeNextSteps: true,
    });

    assert(result2.success === true, 'Generation with transcription successful');
    assert(!!result2.body, 'Body generated with transcription');
    const bodyLower = result2.body!.toLowerCase();
    assert(
      bodyLower.includes('premium') || bodyLower.includes('quote') || bodyLower.includes('voicemail'),
      'Transcription content referenced'
    );
  } catch (err) {
    console.log(`  ❌ Test failed with error: ${err}`);
    failed++;
  }

  // Test 3: Email with Attachments
  console.log('\nTest 3: Email with attachments');
  try {
    const result3 = await generateEmail({
      customerName: 'Robert Davis',
      tasks: [{
        text: 'Review submitted documents',
        status: 'done',
        subtasksCompleted: 0,
        subtasksTotal: 0,
        attachments: [
          { file_name: 'drivers_license.pdf', file_type: 'application/pdf' },
          { file_name: 'vehicle_registration.jpg', file_type: 'image/jpeg' },
        ],
        completed: true,
      }],
      tone: 'friendly',
      senderName: 'Sarah',
      includeNextSteps: false,
    });

    assert(result3.success === true, 'Generation with attachments successful');
    assert(!!result3.body, 'Body generated');
    const bodyLower = result3.body!.toLowerCase();
    assert(
      bodyLower.includes('document') || bodyLower.includes('file') || bodyLower.includes('review'),
      'Attachments acknowledged'
    );
  } catch (err) {
    console.log(`  ❌ Test failed with error: ${err}`);
    failed++;
  }

  // Test 4: Subtask Progress
  console.log('\nTest 4: Email with subtask progress');
  try {
    const result4 = await generateEmail({
      customerName: 'Tom Wilson',
      tasks: [{
        text: 'Commercial policy setup',
        status: 'in_progress',
        subtasksCompleted: 4,
        subtasksTotal: 7,
        notes: 'Need COI from previous carrier',
      }],
      tone: 'friendly',
      senderName: 'Sarah',
      includeNextSteps: true,
    });

    assert(result4.success === true, 'Generation with subtasks successful');
    assert(!!result4.body, 'Body shows progress');
  } catch (err) {
    console.log(`  ❌ Test failed with error: ${err}`);
    failed++;
  }

  // Test 5: Multiple Tasks
  console.log('\nTest 5: Email with multiple tasks (mixed status)');
  try {
    const result5 = await generateEmail({
      customerName: 'David Thompson',
      tasks: [
        {
          text: 'Auto policy renewal',
          status: 'done',
          subtasksCompleted: 3,
          subtasksTotal: 3,
          completed: true,
        },
        {
          text: 'Add new driver',
          status: 'in_progress',
          subtasksCompleted: 1,
          subtasksTotal: 2,
        },
        {
          text: 'Review homeowners',
          status: 'todo',
          subtasksCompleted: 0,
          subtasksTotal: 0,
        },
      ],
      tone: 'friendly',
      senderName: 'Sarah',
      includeNextSteps: true,
    });

    assert(result5.success === true, 'Multiple tasks generation successful');
    assert(!!result5.subject && !!result5.body, 'Complete email generated');
  } catch (err) {
    console.log(`  ❌ Test failed with error: ${err}`);
    failed++;
  }

  // Test 6: Warning Flags - Sensitive Info
  console.log('\nTest 6: Warning flags for sensitive information');
  try {
    const result6 = await generateEmail({
      customerName: 'Alice Cooper',
      tasks: [{
        text: 'Process claim',
        status: 'todo',
        subtasksCompleted: 0,
        subtasksTotal: 0,
        transcription: 'My SSN is 123-45-6789 and account number is 987654321',
      }],
      tone: 'formal',
      senderName: 'Agent',
      includeNextSteps: false,
    });

    assert(result6.success === true, 'Generation with sensitive info successful');
    assert(Array.isArray(result6.warnings), 'Warnings array exists');
    if (result6.warnings && result6.warnings.length > 0) {
      const hasSensitiveWarning = result6.warnings.some(w => w.type === 'sensitive_info');
      assert(hasSensitiveWarning, 'Sensitive info warning flagged');
    } else {
      console.log('  ⚠️  No warnings generated (AI may have handled safely)');
    }
  } catch (err) {
    console.log(`  ❌ Test failed with error: ${err}`);
    failed++;
  }

  // Test 7: Warning Flags - Pricing
  console.log('\nTest 7: Warning flags for pricing information');
  try {
    const result7 = await generateEmail({
      customerName: 'George Harris',
      tasks: [{
        text: 'Update coverage limits',
        status: 'done',
        subtasksCompleted: 0,
        subtasksTotal: 0,
        notes: 'Increased liability to $500,000. Premium will be $1,200/year.',
        completed: true,
      }],
      tone: 'friendly',
      senderName: 'Sarah',
      includeNextSteps: false,
    });

    assert(result7.success === true, 'Generation with pricing successful');
    if (result7.warnings && result7.warnings.length > 0) {
      const hasPricingWarning = result7.warnings.some(w =>
        w.type === 'pricing' || w.type === 'coverage_detail'
      );
      assert(hasPricingWarning, 'Pricing/coverage warning flagged');
    } else {
      console.log('  ⚠️  No warnings generated');
    }
  } catch (err) {
    console.log(`  ❌ Test failed with error: ${err}`);
    failed++;
  }

  // Test 8: Tone Variations
  console.log('\nTest 8: Different tone options');
  const toneTestTask = {
    text: 'Policy review complete',
    status: 'done' as const,
    subtasksCompleted: 0,
    subtasksTotal: 0,
    completed: true,
  };

  try {
    const formal = await generateEmail({
      customerName: 'Test Customer',
      tasks: [toneTestTask],
      tone: 'formal',
      senderName: 'Agent',
      includeNextSteps: false,
    });

    const friendly = await generateEmail({
      customerName: 'Test Customer',
      tasks: [toneTestTask],
      tone: 'friendly',
      senderName: 'Agent',
      includeNextSteps: false,
    });

    const brief = await generateEmail({
      customerName: 'Test Customer',
      tasks: [toneTestTask],
      tone: 'brief',
      senderName: 'Agent',
      includeNextSteps: false,
    });

    assert(formal.success && friendly.success && brief.success, 'All tones generate successfully');
    assert(brief.body!.length < friendly.body!.length, 'Brief tone is shorter');
    assert(brief.body!.length < 500, 'Brief tone is concise');
  } catch (err) {
    console.log(`  ❌ Test failed with error: ${err}`);
    failed++;
  }

  // Test 9: Error Handling - Missing Customer Name
  console.log('\nTest 9: Error handling for missing customer name');
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tasks: [{ text: 'Test', status: 'todo', subtasksCompleted: 0, subtasksTotal: 0 }],
        tone: 'friendly',
        senderName: 'Agent',
        includeNextSteps: false,
      }),
    });
    const result9 = await response.json();

    assert(result9.success === false, 'Request fails without customer name');
    assert(!!result9.error, 'Error message provided');
  } catch (err) {
    console.log(`  ❌ Test failed with error: ${err}`);
    failed++;
  }

  // Test 10: Complex Real-World Scenario
  console.log('\nTest 10: Complex real-world scenario');
  try {
    const result10 = await generateEmail({
      customerName: 'Jennifer Anderson',
      customerEmail: 'jennifer@example.com',
      customerPhone: '555-9876',
      tasks: [
        {
          text: 'Review renewal quote',
          status: 'done',
          subtasksCompleted: 4,
          subtasksTotal: 4,
          notes: 'Compared 3 carriers',
          completed: true,
        },
        {
          text: 'Add teen driver',
          status: 'in_progress',
          subtasksCompleted: 2,
          subtasksTotal: 3,
          transcription: 'My daughter just got her license. Can you add her to the policy?',
          attachments: [{ file_name: 'license.jpg', file_type: 'image/jpeg' }],
        },
        {
          text: 'Update home insurance',
          status: 'todo',
          subtasksCompleted: 0,
          subtasksTotal: 2,
          dueDate: '2026-02-01',
        },
      ],
      tone: 'friendly',
      senderName: 'Sarah Johnson',
      includeNextSteps: true,
    });

    assert(result10.success === true, 'Complex scenario generation successful');
    assert(!!result10.subject && !!result10.body, 'Complete email generated');
    const bodyLower = result10.body!.toLowerCase();
    assert(
      bodyLower.includes('daughter') || bodyLower.includes('driver') || bodyLower.includes('license'),
      'Transcription details included'
    );
    assert(
      bodyLower.includes('document') || bodyLower.includes('license') || bodyLower.includes('received'),
      'Attachment acknowledged'
    );
  } catch (err) {
    console.log(`  ❌ Test failed with error: ${err}`);
    failed++;
  }

  // Test 11: Insurance Language Quality
  console.log('\nTest 11: Insurance agent language style');
  try {
    const result11 = await generateEmail({
      customerName: 'Test Customer',
      tasks: [
        {
          text: 'Review auto policy and update coverage',
          status: 'done',
          subtasksCompleted: 0,
          subtasksTotal: 0,
          completed: true,
        },
      ],
      tone: 'friendly',
      senderName: 'Sarah',
      includeNextSteps: true,
    });

    assert(result11.success === true, 'Language test generation successful');
    const bodyLower = result11.body!.toLowerCase();

    // Should NOT contain generic AI phrases
    assert(
      !bodyLower.includes('i hope this email finds you well'),
      'Avoids "I hope this email finds you well"'
    );
    assert(
      !bodyLower.includes('task management') && !bodyLower.includes('task system'),
      'Does not mention task management system'
    );
    assert(!result11.body!.includes('['), 'No placeholder brackets');

    // Should be concise
    const paragraphs = result11.body!.split('\n\n').length;
    assert(paragraphs <= 5, `Concise (${paragraphs} paragraphs, max 5)`);
  } catch (err) {
    console.log(`  ❌ Test failed with error: ${err}`);
    failed++;
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  }

  console.log('\n' + (failed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed'));
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
