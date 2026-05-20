# Escalation Notification Strategy — Wati WhatsApp vs PagerDuty Free Tier

## Context

VibeHouse SLA escalation currently relies on WhatsApp (Wati) as the sole notification channel for staff. The problem: Lx recipients (receptionist, manager, owner) are busy people who may miss WhatsApp messages in notification noise. A missed L2/L3 escalation means a guest's issue goes unresolved.

**Constraint: ₹0 additional spend.** Only the PagerDuty free tier is being considered.

---

## The Problem

```
L0 (Staff)  → WhatsApp reminder     ← Usually works (staff are on their phones)
L1 (Lead)   → WhatsApp escalation   ← Sometimes missed (lead is helping a guest)
L2 (Manager)→ WhatsApp escalation   ← Often missed (manager is in a meeting)
L3 (Owner)  → WhatsApp escalation   ← Frequently missed (owner has 200+ unread chats)
```

WhatsApp notifications look identical to personal messages, group chats, and marketing spam. There's no way to make an escalation message "louder" than a friend's meme. For L2/L3, we need something that **demands attention** — a phone call, a persistent alarm, or a pager-like alert.

---

## Option A: Wati WhatsApp Only (Current Plan)

### What We Have
- Wati Growth plan: ₹2,500–4,000/mo (already budgeted)
- Utility messages: ₹0.13/msg
- Template messages with interactive buttons ("Accept", "Complete")
- Wati webhook for staff responses

### Pros

| # | Pro | Detail |
|---|-----|--------|
| 1 | **Zero additional cost** | Already budgeted. No new vendor. |
| 2 | **No extra app install** | Every Indian staff member already has WhatsApp. Zero onboarding friction. |
| 3 | **Single channel simplicity** | One notification system to build, debug, and maintain. |
| 4 | **Interactive buttons** | Staff can "Accept" / "Complete" directly from WhatsApp. PagerDuty can't do this. |
| 5 | **Rich content** | Room number, guest name, SLA timer — all in one message. PagerDuty alerts are plain text. |
| 6 | **Works offline-ish** | Messages queue and deliver when phone reconnects. No app to crash/drain battery. |
| 7 | **Already designed** | Notification Worker, Kafka topics, Wati templates — all planned. Adding PagerDuty means a second integration. |

### Cons

| # | Con | Severity | Detail |
|---|-----|----------|--------|
| 1 | **No phone call alert** | **HIGH** | WhatsApp can't ring someone's phone like a call. L3 owner with 200 unread chats will miss it. |
| 2 | **No alarm/pager sound** | **HIGH** | WhatsApp notification sound is the same for all messages. Can't make escalation louder than a friend's text. |
| 3 | **Single channel dependency** | **MEDIUM** | If WhatsApp is down or phone has no data, escalation is completely blind. |
| 4 | **Notification fatigue** | **MEDIUM** | Staff receive L0 reminders, L1 escalations, personal messages — all in same app. Critical alerts drown in noise. |
| 5 | **No built-in on-call rotation** | **LOW** | We'd need to build shift scheduling ourselves (or use Zoho). |
| 6 | **No acknowledgment tracking** | **LOW** | We can't confirm Lx *read* the escalation. WhatsApp blue ticks aren't API-accessible via Wati. |

---

## Option B: PagerDuty Free Tier

### What's Included (Free Tier)

| Feature | Limit |
|---------|-------|
| Users | **5 max** |
| On-call schedules | **1** |
| Escalation policies | **1** |
| SMS + Phone calls | **100/month combined** |
| Push notifications | **Unlimited** (via PagerDuty mobile app) |
| Email notifications | **Unlimited** |
| API access | Full REST + Events API (960 req/min) |
| Integrations | 700+ (but no Slack/Teams on free tier) |
| Support | Email only |

### Pros

| # | Pro | Detail |
|---|-----|--------|
| 1 | **Phone call alerts** | PagerDuty can *call* L2/L3 on their phone. This is the closest thing to a pager — the phone rings until answered. |
| 2 | **Persistent push notifications** | PagerDuty mobile app has a dedicated, loud, alarm-like notification sound. Distinct from WhatsApp/SMS. |
| 3 | **Built-in escalation policy** | "If L2 doesn't ack in 5 min, auto-escalate to L3" — built into PagerDuty, no code needed. |
| 4 | **Built-in on-call scheduling** | Rotate who gets paged on which shift. Free tier supports 1 schedule. |
| 5 | **Acknowledgment tracking** | PagerDuty tracks whether the alert was acknowledged, by whom, and when. Full audit trail. |
| 6 | **Multi-channel redundancy** | Push + SMS + Phone + Email — if one channel fails, others still fire. |
| 7 | **₹0 cost** | Free tier. No payment required. |
| 8 | **Full API** | We can create incidents programmatically from our Notification Worker via Events API. |

### Cons

| # | Con | Severity | Detail |
|---|-----|----------|--------|
| 1 | **5 user limit** | **HIGH** | We have 5 roles now (Owner, Manager, Reception, HK Lead, Maintenance Lead). Multi-property = instant overflow. Adding a 6th staff member breaks the free tier. |
| 2 | **100 SMS+Phone/month** | **HIGH** | Shared quota. With ~5-10 escalations/day × 30 days = 150-300/month. **Exceeds free tier on day 10-20.** After 100, only push/email remain. |
| 3 | **1 escalation policy** | **MEDIUM** | We have 3 departments (HK, Maintenance, Front Office) with different escalation ladders. PagerDuty free tier forces all into one policy. |
| 4 | **Extra app to install** | **MEDIUM** | Staff (especially housekeeping) must install PagerDuty app. Onboarding friction. Some may resist. |
| 5 | **No interactive actions** | **MEDIUM** | PagerDuty ack ≠ task completion. Staff still need WhatsApp/Zoho to mark task done. Two systems to interact with. |
| 6 | **India phone number support** | **LOW-MEDIUM** | PagerDuty's phone call delivery to Indian mobile numbers may have latency or reliability issues. Not their primary market. |
| 7 | **No Slack/Teams on free** | **LOW** | Not relevant now (staff don't use Slack), but limits future options. |
| 8 | **Maintenance overhead** | **LOW** | Second notification system to maintain, debug, and keep in sync with Wati. |

---

## Option C: Hybrid — Wati for Tasks + PagerDuty for L2/L3 Only (Recommended)

### How It Works

```
L0 (Staff reminder)       → WhatsApp only (Wati)
L1 (Team Lead escalation) → WhatsApp only (Wati)
L2 (Manager escalation)   → WhatsApp (Wati) + PagerDuty (push + phone call)
L3 (Owner escalation)     → WhatsApp (Wati) + PagerDuty (push + phone call)
```

### Why This Works

| Factor | Detail |
|--------|--------|
| **User count** | Only 2-3 users in PagerDuty (Manager + Owner, maybe Reception Lead). Well under 5 limit. |
| **SMS/Phone quota** | L2/L3 escalations are rare by design (~2-5/day worst case). ~60-150/month. Under 100 if SLA is well-tuned. |
| **1 escalation policy** | Fine — only 1 policy needed: "Page Manager → if no ack in 5 min → Page Owner". |
| **No extra app for ground staff** | Housekeeping/Maintenance staff only use WhatsApp. PagerDuty app only on Manager/Owner phones. |
| **Interactive actions stay in WhatsApp** | Task accept/complete still via Wati buttons. PagerDuty is alert-only (ack = "I've seen it"). |

### Notification Flow

```
Redis SLA timer expires at L2
    ↓
Ops Task Worker
    ├── 1. Publish: notify.staff (Kafka) → Notification Worker → Wati WhatsApp to Manager
    └── 2. POST PagerDuty Events API v2 → creates incident → Manager gets phone call + push
    ↓
Manager acknowledges PagerDuty alert (phone rings, they pick up)
    ↓
Manager opens WhatsApp → sees ticket details → takes action in WhatsApp/Zoho
    ↓
If no PagerDuty ack in 5 min → PagerDuty auto-escalates to Owner (phone call)
```

### Integration Effort (Minimal)

- **Notification Worker** adds a PagerDuty Events API v2 call for L2/L3 only
- **PagerDuty setup**: 1 service, 1 escalation policy (Manager → Owner), 2-3 users
- **Events API payload**:
  ```json
  POST https://events.pagerduty.com/v2/enqueue
  {
    "routing_key": "<integration-key>",
    "event_action": "trigger",
    "payload": {
      "summary": "SLA L2: Towel Request — Room 101 (12/15 min)",
      "severity": "critical",
      "source": "vibehouse-sla",
      "custom_details": {
        "ticket_id": "VH-0042",
        "room": "101",
        "guest": "Rahul Mehta",
        "elapsed_minutes": 12,
        "sla_minutes": 15
      }
    }
  }
  ```
- **Auto-resolve**: When ticket is completed, send `event_action: "resolve"` to close the PagerDuty incident

---

## Head-to-Head Comparison

| Criteria | Wati Only | PagerDuty Only | Hybrid (Recommended) |
|----------|-----------|----------------|----------------------|
| **Phone call alerts** | No | Yes | Yes (L2/L3 only) |
| **Alarm-like push** | No | Yes | Yes (L2/L3 only) |
| **Interactive task actions** | Yes | No | Yes (via WhatsApp) |
| **Zero onboarding friction** | Yes | No | Yes (only 2-3 install PD) |
| **Multi-property ready** | Yes | No (5 user cap) | Partial (2-3 properties) |
| **Cost** | ₹0 extra | ₹0 extra | ₹0 extra |
| **SMS/Phone quota risk** | N/A | High | Low (L2/L3 only) |
| **Maintenance complexity** | Low | Medium | Medium (but scoped) |
| **Ack tracking** | No | Yes | Yes (L2/L3 via PD) |
| **On-call scheduling** | No (build ourselves) | Yes | Yes (for managers) |

---

## Recommendation

**Go with Option C (Hybrid)** — but with a phased approach:

### Phase 1: Launch with Wati only
- Build the full SLA system with WhatsApp as the only notification channel
- This is already designed and budgeted
- Measure: how often do L2/L3 escalations actually happen?

### Phase 2: Add PagerDuty if L2/L3 miss rate > 10%
- If managers/owners are missing escalations, add PagerDuty for L2/L3
- Only 2-3 PagerDuty users (Manager + Owner)
- Notification Worker gets a small addition: `if (escalationLevel >= 2) → triggerPagerDuty()`
- Monitor SMS/Phone quota usage

### Why not PagerDuty from day 1?
1. We don't know yet if L2/L3 escalations will be frequent enough to justify a second system
2. Single-property Bandra may have tight-knit staff who respond quickly to WhatsApp
3. Adding PagerDuty later is trivial (one API call in Notification Worker) — no architectural change needed
4. Avoid premature complexity

### When PagerDuty free tier stops working
If VibeHouse grows to 3+ properties with 6+ managers, the free tier breaks (5 user limit). At that point, evaluate:
- **PagerDuty paid** ($21/user/month — expensive for Indian hostel ops)
- **Twilio Voice API** (~₹1.5/min for outbound calls to Indian numbers — much cheaper for just phone call alerts)
- **Custom native alarm app** (high dev effort, but zero per-unit cost)
