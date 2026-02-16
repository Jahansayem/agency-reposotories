# Allstate IT Onboarding Guide: Wavezly Todo List

**Document Type:** Vendor Integration Checklist
**For:** Allstate IT / Vendor Integration Team
**Application:** Wavezly Todo List
**Version:** 1.0
**Date:** 2026-02-04
**Classification:** Internal Use Only

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Technical Requirements](#2-technical-requirements)
3. [Attribute Requirements](#3-attribute-requirements)
4. [PingFederate Configuration Checklist](#4-pingfederate-configuration-checklist)
5. [Testing Procedure](#5-testing-procedure)
6. [Contact Information](#6-contact-information)
7. [Security Compliance](#7-security-compliance)
8. [Appendix: Troubleshooting](#appendix-troubleshooting)

---

## 1. Application Overview

### 1.1 Description

**Wavezly Todo List** is a collaborative task management platform designed specifically for Allstate insurance agencies. The application enables agency staff to:

- Manage tasks and assignments across team members
- Collaborate via real-time team chat
- Track strategic goals and milestones
- Generate AI-powered customer emails and task parsing
- View analytics dashboards with productivity metrics

### 1.2 Business Context

| Field | Value |
|-------|-------|
| **Vendor** | Wavezly |
| **Application Name** | Wavezly Todo List |
| **Application Type** | Web Application (SaaS) |
| **Deployment Model** | Multi-tenant Cloud |
| **User Base** | Allstate Exclusive Agents (Captive) |
| **Access Method** | MyConnection Portal Tile (IdP-initiated) |

### 1.3 Architecture Summary

```
User (Allstate Employee)
    |
    v
MyConnection Portal (Tile Click)
    |
    v
PingFederate (IdP)
    |
    v
Clerk (Auth Broker / SP)
    |
    v
Wavezly Todo List
```

The application uses **Clerk** as an authentication broker (Service Provider). Clerk accepts SAML assertions from PingFederate and manages user sessions within the application.

---

## 2. Technical Requirements

### 2.1 Protocol Support

| Protocol | Support Status |
|----------|---------------|
| **SAML 2.0** | Required (Primary) |
| OIDC | Supported (Alternative) |
| WS-Federation | Not Supported |

**Recommended:** SAML 2.0 with PingFederate as Identity Provider

### 2.2 SAML Service Provider (SP) Configuration

The following endpoints are provided by Clerk (our authentication broker):

| Configuration | Value |
|---------------|-------|
| **ACS URL (Assertion Consumer Service)** | `https://clerk.wavezly.com/v1/saml/acs` |
| **Entity ID (SP Issuer)** | `https://clerk.wavezly.com` |
| **SP Metadata URL** | `https://clerk.wavezly.com/v1/saml/metadata` |
| **Name ID Format** | `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress` |
| **Binding** | HTTP-POST |
| **Signature Algorithm** | RSA-SHA256 |
| **Signed Assertions** | Required |
| **Encrypted Assertions** | Supported (Optional) |

> **Note:** Replace `clerk.wavezly.com` with the actual Clerk instance URL provided during onboarding.

### 2.3 SP Metadata

Our SP metadata is available at the URL above. For convenience, key elements are:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="https://clerk.wavezly.com">
  <md:SPSSODescriptor
      AuthnRequestsSigned="true"
      WantAssertionsSigned="true"
      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:AssertionConsumerService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="https://clerk.wavezly.com/v1/saml/acs"
        index="0"
        isDefault="true"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>
```

### 2.4 Network Requirements

| Requirement | Details |
|-------------|---------|
| **Outbound from Allstate** | HTTPS (443) to `*.wavezly.com` |
| **TLS Version** | TLS 1.2 or higher required |
| **IP Allowlisting** | Not required (cloud-hosted) |
| **Certificate** | Valid public CA certificate |

---

## 3. Attribute Requirements

### 3.1 Required SAML Assertion Attributes

The following attributes **MUST** be included in the SAML assertion for the application to function correctly:

| Attribute Name | SAML Attribute | Format | Example | Required | Description |
|----------------|----------------|--------|---------|----------|-------------|
| **Agency Code** | `agency_code` | String | `A1234` | **REQUIRED** | Allstate agency identifier. Used for multi-tenant data isolation. |
| **Role** | `role` | String | `Agent` | **REQUIRED** | User's role within the agency. See Section 3.2 for valid values. |
| **Email** | `email` | Email | `john.smith@allstate.com` | **REQUIRED** | User's corporate email address. Used as unique identifier. |
| **First Name** | `first_name` | String | `John` | **REQUIRED** | User's first name. Displayed in UI and notifications. |
| **Last Name** | `last_name` | String | `Smith` | **REQUIRED** | User's last name. Displayed in UI and notifications. |
| **Department** | `department` | String | `Claims` | OPTIONAL | User's department. Used for filtering and analytics. |
| **Employee ID** | `employee_id` | String | `EMP12345` | OPTIONAL | Internal employee identifier. Stored for audit purposes. |

### 3.2 Valid Role Values

The `role` attribute must contain one of the following values:

| Role Value | Application Permission Level | Description |
|------------|------------------------------|-------------|
| `Owner` | Full Access | Agency owner. Full administrative privileges including strategic goals, team management, and billing. |
| `Manager` | Administrative | Agency manager. Can assign tasks, view analytics, manage team members. Cannot access billing or strategic goals. |
| `Agent` | Standard | Insurance agent. Can create, complete, and reassign tasks. Can participate in team chat. |
| `Staff` | Limited | Support staff. Can view and complete assigned tasks. Limited creation privileges. |
| `Adjuster` | Standard | Claims adjuster. Same permissions as Agent. Role designation for reporting purposes. |

**Default Behavior:** If `role` is not provided or contains an unrecognized value, the user will be assigned `Staff` (most restrictive) permissions.

### 3.3 Attribute Mapping from Azure AD

If sourcing attributes from Azure AD (via PingFederate pass-through), use the following mappings:

| Azure AD Attribute | Target SAML Attribute | Notes |
|--------------------|----------------------|-------|
| `user.mail` | `email` | Primary email |
| `user.givenName` | `first_name` | First name |
| `user.surname` | `last_name` | Last name |
| `user.department` | `department` | Optional |
| `user.employeeId` | `employee_id` | Optional |
| `extension_AgencyCode` | `agency_code` | Custom attribute (see note below) |
| `extension_AgencyRole` | `role` | Custom attribute (see note below) |

> **Note:** `agency_code` and `role` may require custom attribute configuration in Azure AD or attribute transformation in PingFederate. Contact Wavezly support if these attributes are not available in your directory schema.

### 3.4 Attribute Contract (PingFederate)

Configure the following attribute contract in PingFederate:

```
Attribute Contract:
  - SAML_SUBJECT (NameID)        : email
  - email                        : urn:oasis:names:tc:SAML:2.0:attrname-format:basic
  - first_name                   : urn:oasis:names:tc:SAML:2.0:attrname-format:basic
  - last_name                    : urn:oasis:names:tc:SAML:2.0:attrname-format:basic
  - agency_code                  : urn:oasis:names:tc:SAML:2.0:attrname-format:basic
  - role                         : urn:oasis:names:tc:SAML:2.0:attrname-format:basic
  - department                   : urn:oasis:names:tc:SAML:2.0:attrname-format:basic (optional)
  - employee_id                  : urn:oasis:names:tc:SAML:2.0:attrname-format:basic (optional)
```

---

## 4. PingFederate Configuration Checklist

### 4.1 Pre-Configuration Checklist

Before creating the SP connection, ensure the following:

- [ ] Received SP metadata URL from Wavezly
- [ ] Verified `agency_code` attribute is available in directory or can be derived
- [ ] Verified `role` attribute is available in directory or can be derived
- [ ] Identified pilot user(s) for testing
- [ ] Confirmed network connectivity to SP endpoints

### 4.2 Create SP Connection

- [ ] Navigate to **Identity Provider** > **SP Connections**
- [ ] Click **Create New**
- [ ] Select **Browser SSO Profiles** > **SAML 2.0**

**Connection Settings:**

| Field | Value |
|-------|-------|
| Connection Name | `Wavezly Todo List` |
| Partner Entity ID | `https://clerk.wavezly.com` |
| Connection Type | Browser SSO |
| Protocol | SAML 2.0 |

- [ ] Import SP metadata from URL: `https://clerk.wavezly.com/v1/saml/metadata`

### 4.3 Configure Browser SSO

- [ ] Navigate to **Browser SSO** > **Configure Browser SSO**

**SSO Settings:**

| Setting | Configuration |
|---------|---------------|
| SAML Profiles | IdP-Initiated SSO, SP-Initiated SSO |
| Assertion Lifetime | 5 minutes (default) |
| Assertion Creation | Standard |

### 4.4 Configure Attribute Contract

- [ ] Navigate to **Attribute Contract**
- [ ] Add the following attributes:

| Attribute | Source |
|-----------|--------|
| `SAML_SUBJECT` | `email` from Azure AD |
| `email` | `user.mail` from Azure AD |
| `first_name` | `user.givenName` from Azure AD |
| `last_name` | `user.surname` from Azure AD |
| `agency_code` | Custom mapping (see 4.5) |
| `role` | Custom mapping (see 4.5) |
| `department` | `user.department` from Azure AD (optional) |
| `employee_id` | `user.employeeId` from Azure AD (optional) |

### 4.5 Configure Attribute Mapping (Agency Code & Role)

**Option A: Direct Mapping (if attributes exist in directory)**

- [ ] Map `extension_AgencyCode` to `agency_code`
- [ ] Map `extension_AgencyRole` to `role`

**Option B: Attribute Transformation (if lookup required)**

If `agency_code` or `role` must be derived from other attributes or an external data store:

- [ ] Create custom Data Store or LDAP lookup
- [ ] Configure attribute source with appropriate filter
- [ ] Map transformed value to `agency_code` and `role`

**Option C: Static Value (for pilot testing only)**

For initial testing, you may use static values:

```
agency_code = "PILOT001"
role = "Agent"
```

> **Warning:** Static values should only be used during pilot testing. Production configuration must use directory-sourced values.

### 4.6 Configure IdP-Initiated SSO (for MyConnection Portal)

To enable the application as a tile in MyConnection:

- [ ] Navigate to **Protocol Settings** > **Allowable SAML Bindings**
- [ ] Enable **POST** binding
- [ ] Navigate to **IdP-Initiated SSO**
- [ ] Enable IdP-Initiated SSO
- [ ] Set **Target Application URL**: `https://app.wavezly.com/dashboard`

**MyConnection Portal Configuration:**

- [ ] Add tile to MyConnection portal
- [ ] Set tile icon (provided by Wavezly)
- [ ] Set tile label: `Wavezly Todo List`
- [ ] Configure IdP-initiated flow to SP connection

### 4.7 Configure Signature Settings

- [ ] Navigate to **Signature Policy**
- [ ] Configure:

| Setting | Value |
|---------|-------|
| Sign Assertion | Yes |
| Sign Response | Yes |
| Signature Algorithm | RSA-SHA256 |
| Digest Algorithm | SHA256 |

### 4.8 Activate Connection

- [ ] Review all configuration settings
- [ ] Set connection status to **Active**
- [ ] Save configuration

---

## 5. Testing Procedure

### 5.1 Test Environment

| Environment | URL | Purpose |
|-------------|-----|---------|
| Staging | `https://staging.wavezly.com` | Initial integration testing |
| Production | `https://app.wavezly.com` | Production deployment |

> **Recommendation:** Perform all testing in staging environment before enabling production access.

### 5.2 Test Cases

#### Test Case 1: SP-Initiated SSO

**Steps:**
1. Open browser in incognito/private mode
2. Navigate to `https://staging.wavezly.com`
3. Click "Log in with Allstate"
4. Authenticate at Allstate IdP (Azure AD)
5. Verify redirect back to application

**Expected Results:**
- User is redirected to Allstate login
- After successful authentication, user is redirected to application dashboard
- User's name is displayed correctly in the header
- User can access features appropriate to their role

#### Test Case 2: IdP-Initiated SSO (MyConnection)

**Steps:**
1. Log in to MyConnection portal
2. Click "Wavezly Todo List" tile
3. Verify landing page

**Expected Results:**
- User is automatically logged into the application
- User lands on dashboard (not login screen)
- Session is established without additional authentication

#### Test Case 3: Attribute Verification

**Steps:**
1. Complete SSO login
2. Navigate to Settings > Profile
3. Verify displayed information

**Expected Results:**
- First name and last name are correct
- Email is correct
- Agency code is displayed (if visible in UI)
- Role-appropriate features are available

#### Test Case 4: Multi-Agency Isolation

**Steps:**
1. Log in as User A (Agency A)
2. Create a test task
3. Log out
4. Log in as User B (Agency B)
5. Verify task visibility

**Expected Results:**
- User B cannot see tasks created by User A
- User B only sees data associated with Agency B

### 5.3 Validation Checklist

After completing test cases, verify:

- [ ] SP-Initiated SSO works correctly
- [ ] IdP-Initiated SSO works correctly
- [ ] All required attributes are received
- [ ] User name displays correctly
- [ ] Role permissions are applied correctly
- [ ] Agency data isolation is enforced
- [ ] Session timeout works as expected
- [ ] Logout returns user to Allstate portal

### 5.4 SAML Assertion Debugging

If testing fails, capture the SAML assertion for debugging:

1. Enable SAML tracer browser extension
2. Reproduce the SSO flow
3. Capture the SAML response
4. Verify all required attributes are present:

```xml
<!-- Expected SAML Assertion Attributes -->
<saml:Attribute Name="email">
  <saml:AttributeValue>john.smith@allstate.com</saml:AttributeValue>
</saml:Attribute>
<saml:Attribute Name="first_name">
  <saml:AttributeValue>John</saml:AttributeValue>
</saml:Attribute>
<saml:Attribute Name="last_name">
  <saml:AttributeValue>Smith</saml:AttributeValue>
</saml:Attribute>
<saml:Attribute Name="agency_code">
  <saml:AttributeValue>A1234</saml:AttributeValue>
</saml:Attribute>
<saml:Attribute Name="role">
  <saml:AttributeValue>Agent</saml:AttributeValue>
</saml:Attribute>
```

---

## 6. Contact Information

### 6.1 Wavezly Support

| Contact Type | Details |
|--------------|---------|
| **Technical Support** | support@wavezly.com |
| **Integration Support** | integrations@wavezly.com |
| **Security Team** | security@wavezly.com |
| **Emergency Contact** | +1 (555) 123-4567 (24/7 for P0/P1 issues) |

### 6.2 Escalation Path

| Severity | Response Time | Contact |
|----------|---------------|---------|
| **P0 - Critical** (Production down) | 1 hour | Emergency hotline |
| **P1 - High** (Major feature broken) | 4 hours | support@wavezly.com |
| **P2 - Medium** (Feature degraded) | 1 business day | support@wavezly.com |
| **P3 - Low** (Question/Enhancement) | 3 business days | support@wavezly.com |

### 6.3 Key Contacts at Wavezly

| Role | Name | Email |
|------|------|-------|
| Technical Account Manager | [To be assigned] | tam@wavezly.com |
| Security Officer | [To be assigned] | security@wavezly.com |
| Engineering Lead | [To be assigned] | engineering@wavezly.com |

### 6.4 Information Required from Allstate

Please provide the following to Wavezly during onboarding:

| Item | Description | Status |
|------|-------------|--------|
| **IdP Metadata URL** | PingFederate SAML metadata endpoint | Pending |
| **IdP Entity ID** | PingFederate entity identifier | Pending |
| **Signing Certificate** | X.509 certificate for signature validation | Pending |
| **Pilot User List** | Users for initial testing (name, email, agency code) | Pending |
| **Go-Live Date** | Target production deployment date | Pending |

---

## 7. Security Compliance

### 7.1 Vendor Security Certifications

| Certification | Status | Evidence |
|---------------|--------|----------|
| **SOC 2 Type II** | In Progress | Expected Q2 2026 |
| **NIST CSF** | Aligned | Self-assessment completed |
| **NAIC Model Law** | Compliant | See security checklist |

### 7.2 Infrastructure Security (Our Vendors)

All infrastructure vendors maintain SOC 2 Type II certification:

| Vendor | Service | SOC 2 Status |
|--------|---------|--------------|
| **Railway** | Application hosting | SOC 2 Type II |
| **Supabase** | Database & real-time | SOC 2 Type II |
| **Clerk** | Authentication broker | SOC 2 Type II |
| **Anthropic** | AI services | SOC 2 Type II |

### 7.3 Data Handling

| Aspect | Implementation |
|--------|----------------|
| **Data at Rest** | AES-256 encryption (Supabase) |
| **Data in Transit** | TLS 1.2+ enforced |
| **PII Encryption** | Field-level AES-256-GCM for sensitive fields |
| **Data Residency** | US-East (AWS us-east-1) |
| **Backup** | Point-in-time recovery (PITR), encrypted |
| **Retention** | Configurable per agency, default 7 years for audit logs |

### 7.4 Access Controls

| Control | Implementation |
|---------|----------------|
| **Authentication** | Federated SSO via SAML 2.0 (no local passwords) |
| **Authorization** | Role-based access control (RBAC) |
| **Session Management** | 30-minute idle timeout, secure HttpOnly cookies |
| **Multi-Tenancy** | Agency-level data isolation |
| **Audit Logging** | All actions logged with user attribution |

### 7.5 Security Controls

| Control | Status |
|---------|--------|
| Rate limiting | Implemented (API-level) |
| CSRF protection | Implemented (token-based) |
| XSS prevention | Implemented (CSP + React escaping) |
| SQL injection prevention | Implemented (parameterized queries) |
| Input validation | Implemented (server-side) |
| Security headers | Implemented (CSP, HSTS, X-Frame-Options) |
| Vulnerability scanning | CI/CD integrated (CodeQL, Semgrep) |
| Dependency scanning | Automated (npm audit) |
| Secret detection | CI/CD integrated (TruffleHog) |

### 7.6 Incident Response

| Item | Details |
|------|---------|
| **Incident Response Plan** | Documented and tested |
| **Breach Notification** | Within 72 hours per NAIC requirements |
| **Security Contact** | security@wavezly.com |
| **Status Page** | https://status.wavezly.com |

### 7.7 Compliance Documentation

The following documents are available upon request:

- Security Architecture Overview
- Data Processing Agreement (DPA)
- Business Associate Agreement (BAA) - if applicable
- Penetration Test Summary (when available)
- Vulnerability Remediation Policy
- Incident Response Plan Summary

---

## Appendix: Troubleshooting

### Common Issues and Resolutions

#### Issue: User receives "Access Denied" after SSO

**Possible Causes:**
1. `agency_code` attribute missing from assertion
2. `role` attribute missing or unrecognized value
3. User not provisioned in application

**Resolution:**
- Verify SAML assertion contains `agency_code` and `role`
- Check attribute mapping in PingFederate
- Contact Wavezly support with SAML trace

#### Issue: User sees wrong agency data

**Possible Causes:**
1. `agency_code` mapped incorrectly
2. User has multiple agency memberships

**Resolution:**
- Verify `agency_code` value in SAML assertion
- Confirm attribute source in PingFederate

#### Issue: SSO redirect fails with "Invalid SAML Response"

**Possible Causes:**
1. Clock skew between IdP and SP
2. Assertion signature validation failed
3. Expired assertion

**Resolution:**
- Verify server time synchronization (NTP)
- Confirm signing certificate is current
- Check assertion lifetime settings (default 5 minutes)

#### Issue: IdP-Initiated SSO shows login page instead of dashboard

**Possible Causes:**
1. RelayState not configured
2. Target URL incorrect

**Resolution:**
- Configure default target URL in PingFederate
- Set RelayState to `https://app.wavezly.com/dashboard`

### Debug Information to Collect

When contacting support, please provide:

1. **SAML Trace** - Full SAML request and response
2. **Timestamp** - Exact time of failure (with timezone)
3. **User Email** - Affected user's email address
4. **Error Message** - Complete error text or screenshot
5. **Browser/Device** - Browser name, version, and OS

### Support Hours

| Support Type | Hours | Timezone |
|--------------|-------|----------|
| Standard Support | Mon-Fri 8am-6pm | US Central |
| Emergency Support | 24/7 | All timezones |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-04 | Wavezly | Initial release |

---

**End of Document**

*This document is confidential and intended for Allstate IT personnel only. Do not distribute externally.*
