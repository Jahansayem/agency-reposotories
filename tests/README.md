# Email Generation Feature - Comprehensive Testing Documentation

This directory contains comprehensive test suites for the email generation feature.

## 📋 Overview

The email generation feature has been enhanced with:
- **Voicemail transcription integration** - Uses transcribed voicemails to understand customer concerns
- **Attachment awareness** - Acknowledges documents customers have submitted
- **Subtask progress tracking** - Shows detailed completion status
- **Insurance agent communication style** - Industry-appropriate language and tone
- **Warning flag system** - Flags sensitive info, dates, pricing for review before sending

## 🧪 Test Suites

### 1. Automated Integration Tests
**File:** `run-email-tests.ts`

Comprehensive API-level tests covering:
- Basic email generation
- Transcription handling
- Attachment acknowledgment
- Subtask progress display
- Multiple task scenarios
- Warning flag system (sensitive info, pricing, dates)
- Tone variations (formal, friendly, brief)
- Error handling
- Insurance language quality

**Run with:**
```bash
# Make sure app is running first
npm run dev

# In another terminal:
npx tsx tests/run-email-tests.ts
```

**Expected Output:**
```
🧪 Running Email Generation Integration Tests

Test 1: Basic email generation
  ✅ Email generation successful
  ✅ Subject line generated
  ✅ Body generated
  ✅ Customer name in email
  ...

📊 Test Summary
✅ Passed: 45
❌ Failed: 0
📈 Success Rate: 100.0%

🎉 All tests passed!
```

---

### 2. Manual UI/UX Tests
**File:** `MANUAL_EMAIL_TESTS.md`

Detailed step-by-step manual testing guide covering:
- UI interactions in List and Board views
- Customer detection and auto-fill
- Email editing and regeneration
- Copy-to-clipboard functionality
- Gmail integration
- Dark mode display
- Warning UI display
- Edge cases and error states

**120+ manual test cases organized into 12 test suites**

---

### 3. Unit Tests (Future)
**File:** `email-generation.test.ts`

Jest-based unit tests (template provided) that can be integrated with existing test infrastructure.

To set up Jest testing:
```bash
npm install --save-dev jest @jest/globals @types/jest ts-jest
npx ts-jest config:init
npm test tests/email-generation.test.ts
```

---

## 🎯 Testing Strategy

### Phase 1: Automated Integration Tests ✅
Run automated tests against live API to verify:
- Core functionality works
- All new features (transcription, attachments, subtasks) are integrated
- Warning system detects issues
- Error handling is robust

**When to run:**
- After any changes to `/api/ai/generate-email/route.ts`
- After changes to `CustomerEmailModal.tsx`
- Before deploying to production
- As part of CI/CD pipeline (recommended)

---

### Phase 2: Manual UI/UX Testing ✅
Follow the manual test guide to verify:
- User experience is smooth
- Visual elements render correctly
- Interactions work as expected
- Edge cases are handled gracefully

**When to run:**
- After UI changes
- Before major releases
- When adding new features
- For regression testing

---

### Phase 3: Real-World Usage Testing
Test with actual production-like scenarios:
- Real voicemail transcriptions
- Actual customer documents
- Complex multi-task workflows
- Various customer communication needs

**When to run:**
- Beta testing phase
- User acceptance testing
- Before full rollout

---

## 📊 Test Coverage

### API Endpoint Coverage
- ✅ TaskSummary interface (all fields tested)
- ✅ EmailRequest validation
- ✅ System prompt effectiveness
- ✅ Warning detection logic
- ✅ Response formatting
- ✅ Error handling

### Frontend Coverage
- ✅ CustomerEmailModal component
- ✅ Customer detection logic
- ✅ Warning display UI
- ✅ Data payload construction
- ✅ Email editing functionality
- ✅ Copy and Gmail integration

### Feature Coverage
| Feature | API Tests | UI Tests | Status |
|---------|-----------|----------|--------|
| Basic generation | ✅ | ✅ | Complete |
| Transcriptions | ✅ | ✅ | Complete |
| Attachments | ✅ | ✅ | Complete |
| Subtask progress | ✅ | ✅ | Complete |
| Multiple tasks | ✅ | ✅ | Complete |
| Warning: Sensitive info | ✅ | ✅ | Complete |
| Warning: Date promises | ✅ | ✅ | Complete |
| Warning: Pricing | ✅ | ✅ | Complete |
| Warning: Coverage | ✅ | ✅ | Complete |
| Warning: Negative news | ✅ | ✅ | Complete |
| Tone: Formal | ✅ | ✅ | Complete |
| Tone: Friendly | ✅ | ✅ | Complete |
| Tone: Brief | ✅ | ✅ | Complete |
| Insurance language | ✅ | ✅ | Complete |
| Error handling | ✅ | ✅ | Complete |
| Dark mode | - | ✅ | Complete |

---

## 🚀 Quick Start Testing Guide

### For Developers

1. **Run automated tests first:**
   ```bash
   npm run dev
   npx tsx tests/run-email-tests.ts
   ```

2. **If tests pass, do spot-check manual testing:**
   - Generate one email with transcription
   - Generate one email with attachments
   - Verify warnings appear
   - Test in both light and dark mode

3. **Check console for errors**

### For QA Team

1. **Follow the manual test guide** (`MANUAL_EMAIL_TESTS.md`)
2. **Complete all 12 test suites**
3. **Score using the 100-point checklist**
4. **Pass threshold: 85+ points**
5. **Report any issues with screenshots and steps**

### For Product Team

1. **Test real-world scenarios:**
   - Use actual customer names and scenarios
   - Test with real voicemail transcriptions
   - Generate emails for various task types
   - Evaluate email quality and tone

2. **Validate insurance language:**
   - Emails should sound like a real agent
   - No generic AI phrases
   - Professional and warm tone
   - Industry-appropriate terminology

---

## 🐛 Known Issues and Limitations

### Current Limitations
1. **API Rate Limits:** Anthropic API has rate limits - tests may fail if run too frequently
2. **Non-Deterministic:** AI-generated content varies between runs (expected behavior)
3. **Network Dependency:** Tests require internet connection and API availability

### Test Infrastructure Todos
- [ ] Add CI/CD integration (GitHub Actions)
- [ ] Set up automated nightly test runs
- [ ] Create performance benchmarks
- [ ] Add accessibility testing
- [ ] Create visual regression tests for UI

---

## 📈 Success Metrics

### Automated Tests
- **Target:** 100% pass rate
- **Current:** TBD (run tests to establish baseline)
- **Threshold:** 95% minimum for production deployment

### Manual Tests
- **Target:** 90+ points out of 100
- **Threshold:** 85+ points for production

### Quality Metrics
- Email generation success rate: >95%
- Warning detection accuracy: >90%
- User satisfaction: >4.5/5

---

## 🔧 Troubleshooting Tests

### "Email generation failed"
- Check `ANTHROPIC_API_KEY` is set in `.env.local`
- Verify API key is valid and has credits
- Check network connectivity
- Look for rate limiting errors

### "Connection refused" errors
- Ensure app is running (`npm run dev`)
- Check app is on correct port (3000)
- Verify no firewall blocking localhost

### Tests pass but UI doesn't work
- Clear browser cache
- Check browser console for errors
- Verify dark mode toggle
- Test in incognito mode

### Warnings don't appear
- This is AI-dependent - warnings only appear for actual issues
- Try examples with obvious sensitive data (SSN, account numbers)
- Check console for API response structure

---

## 📝 Test Maintenance

### When to Update Tests

**Add new tests when:**
- New features are added to email generation
- New warning types are introduced
- New tone options are added
- Bug fixes are implemented

**Update existing tests when:**
- API interface changes
- UI components are redesigned
- Warning thresholds are adjusted
- System prompts are modified

### Test Review Schedule
- **Weekly:** Review failed test reports
- **Monthly:** Update manual test cases
- **Quarterly:** Review test coverage gaps
- **Per release:** Full regression testing

---

## 🤝 Contributing

When adding new email generation features:

1. **Write tests first** (TDD approach recommended)
2. **Update both automated and manual tests**
3. **Document expected behavior**
4. **Add examples to manual test guide**
5. **Update this README with coverage info**

---

## 📚 Related Documentation

- [Email Generation API Docs](../src/app/api/ai/generate-email/README.md) (if exists)
- [CustomerEmailModal Component](../src/components/CustomerEmailModal.tsx)
- [Anthropic API Documentation](https://docs.anthropic.com/)

---

## 🎉 Testing Checklist for Production Release

Before deploying email generation to production:

- [ ] All automated tests passing (100%)
- [ ] Manual UI tests completed (85+ points)
- [ ] Real-world scenario testing done
- [ ] Performance tested (generation time <5 seconds)
- [ ] Error handling verified
- [ ] Dark mode tested
- [ ] Mobile responsiveness checked
- [ ] Accessibility reviewed
- [ ] Security review completed (no sensitive data leaks)
- [ ] User documentation updated
- [ ] Team training completed

---

**Last Updated:** 2026-01-05
**Version:** 1.0
**Maintained by:** Development Team
**Questions?** Check test files or ask in #engineering-support
