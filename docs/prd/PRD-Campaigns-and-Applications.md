# PRD: Campaigns and Applications

**Version:** 0.1.0 (Development Draft)  
**Last Updated:** 2025-01-20  
**Status:** Development Reference

---

## 1. Overview

Collaboom is an influencer campaign management platform connecting US-based TikTok influencers (1,000+ followers) with K-Beauty, Food, and Lifestyle brands for product seeding campaigns. This PRD defines the core entities, states, and workflows for Campaigns and Applications.

---

## 2. User Roles

### 2.1 Creator (Influencer)
- Can browse and apply to campaigns
- Can submit content (video URLs, bio links, storefront URLs)
- Can view their application status and history
- Can request payouts for completed paid campaigns
- Cannot access admin features

### 2.2 Admin
- Can create, edit, archive, and delete campaigns
- Can approve/reject applications
- Can update shipping status
- Can verify content submissions
- Can award points and apply penalties
- Can manage payout requests
- Cannot apply to campaigns or submit content

---

## 3. Campaign Types

### 3.1 Gifting
- **Reward:** Free product only (no cash)
- **Submission Requirements:** TikTok video URL
- **Database Value:** `gifting`

### 3.2 Link in Bio
- **Reward:** $30 cash + free product
- **Submission Requirements:** Bio link URL (Linktree/Beacons) + TikTok video URL
- **Database Value:** `link_in_bio`
- **Prerequisite:** Creator must have `bioLinkProfileUrl` in profile (Assumption: validated at apply time)

### 3.3 Amazon Video Upload
- **Reward:** $30 cash + free product
- **Submission Requirements:** Amazon Storefront URL + TikTok video URL
- **Database Value:** `amazon_video_upload`
- **Prerequisite:** Creator must have `amazonStorefrontUrl` in profile (Assumption: validated at apply time)

---

## 4. Campaign States

| State | Description |
|-------|-------------|
| `draft` | Campaign created but not visible to creators |
| `active` | Campaign is live and accepting applications |
| `full` | Approved count has reached inventory limit |
| `closed` | Campaign manually closed by admin |
| `archived` | Campaign is archived (soft delete) |

### 4.1 State Transitions

```
draft → active      (Admin publishes)
active → full       (Auto: approvedCount >= inventory)
active → closed     (Admin closes manually)
full → active       (Admin increases inventory)
active → archived   (Admin archives)
closed → archived   (Admin archives)
```

**Note:** `archived` is a terminal state. Archived campaigns cannot be reactivated.

---

## 5. Application States

| State | Description | Owner |
|-------|-------------|-------|
| `pending` | Creator has applied, awaiting admin review | Admin |
| `approved` | Admin approved, awaiting shipment | Admin |
| `rejected` | Admin rejected the application | Terminal |
| `shipped` | Product has been shipped | Admin |
| `delivered` | Product delivered, creator can submit content | Creator |
| `uploaded` | Creator submitted content, awaiting verification | Admin |
| `completed` | Content verified, points awarded | Terminal |
| `deadline_missed` | Creator missed the submission deadline | Terminal |

### 5.1 State Transition Diagram

```
pending → approved     (Admin approves)
pending → rejected     (Admin rejects)

approved → shipped     (Admin marks shipped)
shipped → delivered    (Admin marks delivered)

delivered → uploaded   (Creator submits content)
delivered → deadline_missed  (Auto: past deadline without submission)

uploaded → completed   (Admin verifies content)
uploaded → deadline_missed   (Admin marks as missed)
```

### 5.2 Terminal States
- `rejected` - Application cannot proceed
- `completed` - Successfully finished
- `deadline_missed` - Creator failed to submit on time

### 5.3 Important Rules
- Only one active application per campaign per creator
- Creators cannot apply to campaigns where they have a non-terminal application
- VIP creators (score >= 85, completedCampaigns >= 1) get automatic approval (Assumption: bypasses `pending` → `approved`)

---

## 6. Submission Requirements by Campaign Type

### 6.1 Gifting
```typescript
{
  contentUrl: string;           // Required: TikTok video URL
  contentSubmittedAt: Date;     // Auto-set on submit
}
```

### 6.2 Link in Bio
```typescript
{
  bioLinkUrl: string;           // Required: Linktree/Beacons URL
  bioLinkSubmittedAt: Date;     // Auto-set on submit
  contentUrl: string;           // Required: TikTok video URL
  contentSubmittedAt: Date;     // Auto-set on submit
}
```

### 6.3 Amazon Video Upload
```typescript
{
  amazonStorefrontUrl: string;           // Required: Amazon Storefront URL
  amazonStorefrontSubmittedAt: Date;     // Auto-set on submit
  contentUrl: string;                    // Required: TikTok video URL
  contentSubmittedAt: Date;              // Auto-set on submit
}
```

---

## 7. Verification Workflow

### 7.1 Admin Verification (Uploads Tab)
1. Admin sees applications in `delivered` or `uploaded` status
2. For `uploaded` applications with `contentUrl`:
   - Admin reviews all submitted URLs
   - Admin enters points to award (0-100)
   - Admin clicks "Verify" → status becomes `completed`
3. For applications past deadline without `contentUrl`:
   - Admin can click "Missed Deadline" → status becomes `deadline_missed`

### 7.2 Points Awarded on Verification
- `pointsAwarded` field stores the points given by admin
- Range: 0-100 (Assumption: configurable per verification)
- Points are added to creator's `score` field

### 7.3 Cash Reward Eligibility
- **Critical Rule:** Cash rewards are only earned when `pointsAwarded > 0`
- If admin sets `pointsAwarded = 0`, the completion does not count toward payouts

---

## 8. Payout System

### 8.1 Earned Balance Calculation
```
Total Earned = Sum of $30 for each application where:
  - campaignType is 'link_in_bio' OR 'amazon_video_upload'
  - status is 'completed'
  - pointsAwarded > 0
```

### 8.2 Available Balance Calculation
```
Available Balance = Total Earned - Sum of all payout requests (any status)
```

### 8.3 Payout Request States
| State | Description |
|-------|-------------|
| `pending` | Creator submitted request, awaiting admin action |
| `processing` | Admin is processing the payout |
| `completed` | Payout sent successfully |
| `rejected` | Payout rejected by admin |

### 8.4 Payout Rules
- Creator must have `paypalEmail` set in profile
- Full available balance is requested (no partial payouts)
- Admin can add notes when processing or rejecting

---

## 9. Score and Tier System

### 9.1 Score Events
Scores are tracked via `scoreEvents` table with delta values:

| Event | Delta | Trigger |
|-------|-------|---------|
| `signup_bonus` | +50 | Account creation (auto) |
| `address_completion` | +10 | First profile completion (auto) |
| `upload_verified` | +0 to +100 | Admin verification (configurable) |
| `admin_adjustment` | variable | Manual admin action |

### 9.2 Penalty Events
Penalties are tracked via `penaltyEvents` table:

| Event | Trigger |
|-------|---------|
| `deadline_missed` | Auto when deadline passes without submission |
| `first_ghosting` | First missed deadline (Assumption: distinct penalty) |
| `admin_manual` | Manual admin action |
| `rollback` | Undo previous penalty |

### 9.3 Tier Definitions

| Tier | Criteria | Benefits |
|------|----------|----------|
| Starting | completedCampaigns === 0 OR score < 50 | 1 active campaign limit |
| Standard | completedCampaigns >= 1 AND score >= 50 AND score < 85 | No special limits |
| VIP | completedCampaigns >= 1 AND score >= 85 | Automatic approval |

### 9.4 Tier Upgrade Triggers
- First campaign completion → May upgrade to Standard (if score >= 50)
- Reaching 85 points → Upgrades to VIP
- Tier upgrades trigger congratulatory email

---

## 10. Shipping Workflow

### 10.1 Shipping Record
Each approved application can have a shipping record:

```typescript
{
  applicationId: string;
  status: 'pending' | 'shipped' | 'delivered';
  trackingNumber?: string;
  trackingUrl?: string;
  courier?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
}
```

### 10.2 Address Override
- Application stores its own shipping address fields
- Initially copied from creator's profile at approval time
- Admin can override without affecting creator's profile

---

## 11. Deadlines

### 11.1 Application Deadline
- `applicationDeadline`: Last date to apply for the campaign
- After this date, campaign stops accepting new applications

### 11.2 Upload Deadline
- `deadline`: Last date to submit content
- Applications past this date without `contentUrl` are eligible for `deadline_missed`

---

## 12. Notifications

### 12.1 Email Notifications (via Resend)
| Type | Trigger |
|------|---------|
| `welcome` | Account creation |
| `approved` | Application approved |
| `rejected` | Application rejected |
| `shipping_shipped` | Product shipped |
| `shipping_delivered` | Product delivered |
| `deadline_48h` | 48 hours before deadline (Assumption: not yet implemented) |
| `deadline_missed` | Deadline missed |
| `tier_upgraded` | Creator tier changed |
| `comment_reply` | Admin replied to comment |

### 12.2 Real-time Notifications (via Socket.IO)
- `newPayoutRequest` - Admin receives when creator requests payout
- `payoutRequestUpdated` - Creator receives when admin updates payout status

---

## 13. Database Schema Reference

### 13.1 Core Tables
- `campaigns` - Campaign definitions
- `applications` - Creator applications to campaigns
- `influencers` - Creator profiles
- `admins` - Admin accounts

### 13.2 Supporting Tables
- `shipping` - Shipping records for applications
- `uploads` - Upload tracking (legacy, mostly unused)
- `scoreEvents` - Score change history
- `penaltyEvents` - Penalty history
- `payoutRequests` - Payout request records
- `notifications` - Email/in-app notification log
- `shippingIssues` - Creator-reported shipping problems
- `supportTickets` - General support requests
- `adminNotes` - Internal admin notes on creators/applications

---

## 14. Assumptions and Open Questions

### 14.1 Assumptions (Marked for Review)
1. VIP auto-approval bypasses the `pending` state entirely
2. `pointsAwarded = 0` means no cash reward even for paid campaigns
3. Partial payouts are not supported (full balance only)
4. 48-hour deadline reminder email is conceptual but may not be implemented
5. Bio link and Amazon storefront prerequisites are validated at apply time

### 14.2 Open Questions
1. Should rejected applications be deletable by creators?
2. What happens to applications when a campaign is archived?
3. Should there be a maximum number of pending applications per creator?

---

## 15. Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2025-01-20 | Initial development draft |
