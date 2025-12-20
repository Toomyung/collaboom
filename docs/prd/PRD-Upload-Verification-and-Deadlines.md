# PRD: Upload, Verification, and Deadlines

**Version:** 0.1.0 (Development Draft)  
**Last Updated:** 2025-01-20  
**Status:** Development Reference  
**Prerequisite:** PRD-Campaigns-and-Applications.md (PRD #1)

---

## 1. Purpose

This document defines the operational rules for content upload, verification, and deadline enforcement. These rules exist to:

1. **Ensure accountability** - Creators must fulfill their obligations after receiving products
2. **Protect brand value** - Only verified content qualifies for completion
3. **Minimize operational risk** - Clear rules prevent disputes and inconsistent handling
4. **Enable payout accuracy** - Verification status directly affects cash reward eligibility

This document does NOT redefine campaign types, application states, scores, or payout calculations. Refer to PRD #1 for those definitions.

---

## 2. Creator Actions

Creators may perform the following actions related to uploads:

| Action | When Allowed | Effect |
|--------|--------------|--------|
| Submit upload proof | Application status is `delivered` | Triggers status change to `uploaded` |
| View verification result | Application status is `completed` or `deadline_missed` | Read-only access |

### 2.1 Actions Creators Cannot Perform

- Creators **cannot** directly change application states
- Creators **cannot** mark their own submissions as verified
- Creators **cannot** extend deadlines
- Creators **cannot** resubmit after reaching a terminal state
- Creators **cannot** retract a submission once submitted

---

## 3. Upload Submission Rules

### 3.1 Submission Eligibility

A submission is allowed only when:
- Application status is exactly `delivered`
- The upload deadline has not passed
- All required fields for the campaign type are provided

### 3.2 Required Fields by Campaign Type

**Gifting:**
```
contentUrl: Required (TikTok video URL)
```

**Link in Bio:**
```
bioLinkUrl: Required (Linktree/Beacons URL)
contentUrl: Required (TikTok video URL)
```

**Amazon Video Upload:**
```
amazonStorefrontUrl: Required (Amazon Storefront URL)
contentUrl: Required (TikTok video URL)
```

### 3.3 URL Validation Rules

All submitted URLs must:
- Be valid HTTPS URLs
- Be publicly accessible (not private or login-gated)
- Match the expected domain pattern:
  - `contentUrl`: Must contain `tiktok.com`
  - `bioLinkUrl`: Must be HTTPS (Linktree, Beacons, or similar)
  - `amazonStorefrontUrl`: Must contain `amazon.com`

### 3.4 Submission Receipt

A submission is considered "received" when:
1. All required fields pass validation
2. The corresponding `*SubmittedAt` timestamp is set
3. Application status transitions from `delivered` to `uploaded`

The following timestamps are set on submission:
- `contentSubmittedAt` (always set)
- `bioLinkSubmittedAt` (if Link in Bio campaign)
- `amazonStorefrontSubmittedAt` (if Amazon Video Upload campaign)

---

## 4. Verification Workflow

### 4.1 Verification Process (Step-by-Step)

**Step 1: Submission Received**
- Creator submits all required URLs
- Status changes to `uploaded`
- Application appears in Admin Uploads tab

**Step 2: Admin Review**
- Admin opens the Uploads tab (filters: `delivered` or `uploaded` with `contentUrl`)
- Admin clicks each submitted URL to verify content exists and meets guidelines
- Admin reviews all URLs for the campaign type

**Step 3: Verification Decision**

If approved:
- Admin enters points to award (0-100)
- Admin clicks "Verify"
- `pointsAwarded` is set
- Status changes to `completed`
- Creator's `score` is updated
- Creator's `completedCampaigns` is incremented

If content is invalid:
- Admin clicks "Missed Deadline" (Assumption: no separate rejection action for bad content)
- Status changes to `deadline_missed`
- No points awarded

### 4.2 Verification Criteria

Content is valid if:
- Video is publicly visible on TikTok
- Video mentions the brand/product per campaign guidelines
- Bio link contains the required product link (for Link in Bio)
- Amazon storefront shows the video (for Amazon Video Upload)
- Content was posted within the campaign timeline

### 4.3 No Resubmission After Submission

Once a creator submits:
- The submitted URLs are locked
- Creator cannot modify or resubmit
- Only admin can take the next action (verify or mark missed)

**Assumption:** If a creator submits an incorrect URL, they must contact support. There is no self-service resubmission.

---

## 5. Deadline Enforcement

### 5.1 Upload Deadline Definition

- Defined by `campaign.deadline` field
- Represents the final date/time to submit content
- Applies to all applications in the campaign

### 5.2 Deadline Behavior

**Before deadline:**
- Creators with `delivered` status can submit
- No automatic state changes

**At or after deadline:**

| Current Status | Automatic Action | Result |
|----------------|------------------|--------|
| `delivered` (no submission) | None (requires admin action) | Eligible for `deadline_missed` |
| `uploaded` (pending verification) | None | Remains `uploaded` until admin verifies |

### 5.3 Admin-Triggered Deadline Miss

For applications past deadline without `contentUrl`:
- Admin manually clicks "Missed Deadline"
- Status changes to `deadline_missed`
- `deadlineMissedAt` timestamp is set
- Penalty event is created (per PRD #1)

**Assumption:** There is no fully automatic deadline enforcement. Admin must trigger `deadline_missed` status.

### 5.4 Deadline Extensions

- No self-service deadline extension for creators
- Admin may extend campaign deadline by editing `campaign.deadline`
- Extending campaign deadline affects all applications in that campaign

**Assumption:** Individual application deadline overrides are not supported.

---

## 6. Terminal State Locking

### 6.1 Terminal States (Reference from PRD #1)

The following application states are terminal:
- `completed`
- `rejected`
- `deadline_missed`

### 6.2 Forbidden Actions After Terminal State

Once an application reaches a terminal state:

| Forbidden Action | Reason |
|------------------|--------|
| Creator submits content | Workflow is closed |
| Admin changes status | Terminal = final decision |
| Points modification | Verification is immutable |
| Payout calculation change | Eligibility is locked |
| Deadline miss assignment | Already resolved |

### 6.3 Data Immutability in Terminal States

The following fields become read-only after terminal state:
- `status`
- `contentUrl`
- `bioLinkUrl`
- `amazonStorefrontUrl`
- `pointsAwarded`
- All `*At` timestamps

### 6.4 No Rollback

There is no rollback mechanism for terminal states. If an error occurs:
- Admin must document the issue in `adminNotes`
- Manual database intervention may be required (outside application scope)

---

## 7. Failure and Edge Cases

### 7.1 Invalid Links

| Scenario | Detection | Handling |
|----------|-----------|----------|
| Malformed URL | On submit | Reject submission with validation error |
| URL returns 404 | Admin review | Admin marks as missed deadline |
| Private/login-gated content | Admin review | Admin marks as missed deadline |

### 7.2 Deleted or Modified Content

| Scenario | When Detected | Handling |
|----------|---------------|----------|
| Video deleted after submission | Admin review | Admin marks as missed deadline |
| Video made private after submission | Admin review | Admin marks as missed deadline |
| Content modified after verification | Post-completion | No automatic action (Assumption: not monitored) |

### 7.3 Late Submissions

| Scenario | System Behavior |
|----------|-----------------|
| Submit attempt after deadline | Submission blocked (if enforced client-side) |
| Backend receives late submission | Should reject with error (Assumption: needs backend validation) |

### 7.4 Submission Without All Required Fields

| Scenario | System Behavior |
|----------|-----------------|
| Missing `contentUrl` | Submission rejected |
| Missing `bioLinkUrl` (Link in Bio) | Submission rejected |
| Missing `amazonStorefrontUrl` (Amazon) | Submission rejected |

---

## 8. Safety Rules (Never Allowed)

The following actions must NEVER be permitted by the system:

### 8.1 Verification Safety

- **Never** verify an application without `contentUrl`
- **Never** award points before admin clicks "Verify"
- **Never** allow admin to set `pointsAwarded` without transitioning to `completed`

### 8.2 Payout Safety

- **Never** include `pointsAwarded = 0` completions in payout calculations
- **Never** calculate earned balance for non-`completed` applications
- **Never** allow payout requests before any `completed` applications exist

### 8.3 State Safety

- **Never** transition to `uploaded` without all required URLs validated
- **Never** transition from terminal state to any other state
- **Never** allow creators to trigger status changes directly
- **Never** allow multiple active applications for same campaign-creator pair

### 8.4 Timestamp Safety

- **Never** backdate `contentSubmittedAt` or verification timestamps
- **Never** clear timestamps after they are set (except by manual DB intervention)

---

## 9. Assumptions and Open Questions

### 9.1 Assumptions (Require Confirmation)

| ID | Assumption |
|----|------------|
| A1 | No resubmission allowed after initial submit |
| A2 | `deadline_missed` requires manual admin action (no auto-trigger) |
| A3 | Individual deadline overrides per application are not supported |
| A4 | Content changes after verification are not monitored |
| A5 | Backend enforces deadline validation on submission attempts |
| A6 | Invalid content during verification results in `deadline_missed`, not a separate rejection state |

### 9.2 Open Questions

| ID | Question |
|----|----------|
| Q1 | Should there be a "content_rejected" state separate from `deadline_missed`? |
| Q2 | Should creators be notified before their deadline (e.g., 48h warning)? |
| Q3 | Should late submissions be logged even if rejected? |
| Q4 | What happens if admin accidentally verifies wrong content? |

---

## 10. Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2025-01-20 | Initial development draft |
