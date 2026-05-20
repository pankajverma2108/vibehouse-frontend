# Vibehouse SLA Ticketing System — Context Document

> **Source**: Miro Board — `Vibehouse_SLA`
> **Board URL**: https://miro.com/app/board/uXjVGxaSc7Y=/
> **Generated**: 2026-03-25

---

## 1. System Overview

This board documents a **Service Level Agreement (SLA) Ticketing Workflow** for the **Vibe House** hospitality platform. It covers the full lifecycle of guest service requests — from creation to completion and feedback — with automated monitoring, staff assignment, and multi-level escalation.

### Tech Stack

| Component | Tool |
|-----------|------|
| Primary Database | **Zoho** |
| Messaging / Notifications | **Wati** (WhatsApp API) |
| Staff Dashboard | Zoho Admin Dashboard |
| Watchdog Timer | External API (separate service) |

### Ticket Statuses

| Status | Code | Meaning |
|--------|------|---------|
| Open | `OPEN` | Created and **unassigned** |
| Pending | `PEN` | Assigned but **unacknowledged** by staff |
| In-Progress | `PRO` | Assigned and **acknowledged** by staff |
| Completed | `COM` | Task finished, ticket **closed** |

### Escalation Tracking Fields

| Field | Type | Values |
|-------|------|--------|
| `escalation` | Boolean | `true` / `false` |
| `escalation_level` | Integer or NA | `1, 2, …, n` or `NA` (if not escalated) |

---

## 2. High-Level Architecture

The system has **three parallel subsystems** that work together:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VIBEHOUSE SLA SYSTEM                                │
│                                                                            │
│  ┌──────────────────┐   ┌──────────────┐   ┌───────────────────────────┐  │
│  │  ASSIGNMENT       │   │  SLA QUEUE    │   │  WATCHDOG                 │  │
│  │  ESCALATION LOOP  │   │  (Core Flow)  │   │  ESCALATION LOOP          │  │
│  │                   │   │              │   │                           │  │
│  │  Handles:         │   │  Handles:    │   │  Handles:                 │  │
│  │  Unassigned       │──▶│  Ticket      │──▶│  Uncompleted tasks        │  │
│  │  tickets          │   │  lifecycle   │   │  after staff assignment   │  │
│  │                   │   │              │   │                           │  │
│  │  Escalates L1→Ln  │   │  Zoho + Wati │   │  Escalates L1→Ln          │  │
│  └──────────────────┘   └──────────────┘   └───────────────────────────┘  │
│                                                                            │
│  Status Flow:  OPEN ──▶ PEN ──▶ PRO ──▶ COM                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Workflow — SLA Queue (Main Flow)

This is the primary ticket lifecycle from guest request to feedback.

### Flow Diagram

```
Guest makes a service request (e.g. "I need some water")
        │
        ▼
┌───────────────────────────┐
│  Service Request Received  │
│  Status: OPEN              │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  Immediate Response to     │
│  Guest: "Request Under     │
│  Process"                  │
│  (via Wati)                │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  SLA Queue Processing      │
│  (6-second delay for Zoho  │
│   ticket creation)         │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  Create ticket in Zoho DB  │
│  Set escalation = false    │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  Check: Is staff available?│
└─────┬─────────────┬───────┘
      │ YES         │ NO
      ▼             ▼
┌──────────┐  ┌──────────────────────────┐
│ Run SQL  │  │ Trigger ASSIGNMENT        │
│ Query    │  │ ESCALATION LOOP           │
│          │  │ (see Section 4)           │
└────┬─────┘  └──────────────────────────┘
     │
     ▼
┌───────────────────────────────────────────┐
│  SQL: SELECT staff                         │
│  WHERE available = true                    │
│    AND role MATCHES task_type              │
│  ORDER BY current_task_count ASC           │
│  LIMIT 1                                   │
│                                            │
│  (Picks least-loaded matching staff)       │
└───────────┬───────────────────────────────┘
            │
            ▼
┌───────────────────────────┐
│  ops.task.create           │
│  Assign ticket to staff    │
│  Status: OPEN → PEN        │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  Notify staff via Wati     │
│  (request details, guest   │
│   info, room number)       │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────────┐
│  Staff Acknowledges task   │
│  Status: PEN → PRO         │
└───────────┬───────────────┘
            │
            ├───────────────────────────────────┐
            │                                   │
            ▼                                   ▼
┌───────────────────────┐     ┌──────────────────────────┐
│  Activate TICKET       │     │  Staff works on task      │
│  WATCHDOG              │     │                           │
│  (External API)        │     │  Clicks "Completed"       │
│  Timer: Z minutes      │     │  when done                │
│  (see Section 5)       │     │                           │
└───────────────────────┘     └──────────┬───────────────┘
                                         │
                                         ▼
                              ┌───────────────────────────┐
                              │  Status: PRO → COM         │
                              │  Task marked complete      │
                              └───────────┬───────────────┘
                                          │
                                          ▼
                              ┌───────────────────────────┐
                              │  Request feedback from     │
                              │  guest (via Wati)          │
                              └───────────┬───────────────┘
                                          │
                                          ▼
                              ┌───────────────────────────┐
                              │  Store feedback in Zoho    │
                              │  Close ticket              │
                              └───────────────────────────┘
```

### Key Notes — SLA Queue

- There is a documented **6-second delay** during Zoho ticket creation (open question on whether this is a Zoho limitation).
- The escalation flag is set in the DB entry when a ticket enters the escalation path: `escalation = true`.
- Staff notification includes: request details, guest info, and room number.
- **No escalation mechanism exists at the acknowledgment stage** — the system currently assumes staff will acknowledge after being reminded.

---

## 4. Assignment Escalation Loop

Handles the case when **no staff is available** or an assigned manager **fails to assign** the ticket. Escalates through management levels L1 → L2 → L3 → … → Ln.

### Flow Diagram

```
Ticket is UNASSIGNED
        │
        ▼
┌────────────────────────────────────────────────────────┐
│                ASSIGNMENT ESCALATION LOOP               │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │  START: Lx is notified                          │  │
│   │  "Ticket is un-assigned, assign via Admin       │  │
│   │   Dashboard / Zoho"                             │  │
│   │  Status: OPEN                                   │  │
│   └──────────────┬──────────────────────────────────┘  │
│                  │                                      │
│                  ▼                                      │
│   ┌──────────────────────────┐                         │
│   │  Wait X minutes           │                         │
│   └──────────────┬───────────┘                         │
│                  │                                      │
│                  ▼                                      │
│   ┌──────────────────────────┐                         │
│   │  DB Check #1:             │                         │
│   │  Has ticket been assigned?│                         │
│   └─────┬────────────┬───────┘                         │
│         │ YES        │ NO                               │
│         │            ▼                                  │
│         │  ┌──────────────────────────┐                │
│         │  │  Send REMINDER to Lx      │                │
│         │  │  (via Wati)               │                │
│         │  └──────────────┬───────────┘                │
│         │                 │                             │
│         │                 ▼                             │
│         │  ┌──────────────────────────┐                │
│         │  │  Wait X minutes           │                │
│         │  └──────────────┬───────────┘                │
│         │                 │                             │
│         │                 ▼                             │
│         │  ┌──────────────────────────┐                │
│         │  │  DB Check #2:             │                │
│         │  │  Has ticket been assigned?│                │
│         │  └─────┬───────────┬────────┘                │
│         │        │ YES       │ NO                       │
│         │        │           ▼                          │
│         │        │  ┌──────────────────────┐           │
│         │        │  │  ESCALATE to Lx+1    │           │
│         │        │  │  (next management    │           │
│         │        │  │   level)             │──┐        │
│         │        │  └──────────────────────┘  │        │
│         │        │                            │        │
│         ▼        ▼                            │        │
│   ┌─────────────────┐                  Loop back to    │
│   │  EXIT: Ticket    │                  START with      │
│   │  is now assigned │                  Lx = Lx+1      │
│   └─────────────────┘                                  │
│                                                         │
│   Levels: L1 → L2 → L3 → L4 → ... → Ln               │
└────────────────────────────────────────────────────────┘
```

### Key Notes — Assignment Escalation

- **Two wait periods** of X minutes each before escalation.
- X is configurable by admin.
- Assignment must be done through the **Admin Dashboard or Zoho**.
- The loop runs iteratively through the entire management hierarchy.
- Color coding on the board: Purple (notification), Orange (first DB check), Blue (reminder), Green (second DB check).

---

## 5. Watchdog Escalation Loop (Completion Monitor)

Monitors **assigned and acknowledged** tasks (status = `PRO`). If staff fails to complete a task within the allotted time, it escalates through management levels.

### Flow Diagram

```
Task is IN-PROGRESS (PRO) but timer expires
        │
        ▼
┌────────────────────────────────────────────────────────┐
│              WATCHDOG ESCALATION LOOP                    │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │  Watchdog timer expires (Z minutes)             │  │
│   │                                                 │  │
│   │  Z = admin-configured per task complexity:      │  │
│   │    • Towel request   → 10 minutes               │  │
│   │    • AC fix          → 1 hour                   │  │
│   │    • Room cleaning   → 30 minutes (example)     │  │
│   └──────────────┬──────────────────────────────────┘  │
│                  │                                      │
│                  ▼                                      │
│   ┌─────────────────────────────────────────────────┐  │
│   │  Check Zoho: Is task completed?                 │  │
│   └─────┬────────────────────────────┬──────────────┘  │
│         │ YES                        │ NO               │
│         ▼                            ▼                  │
│   ┌───────────┐     ┌──────────────────────────────┐   │
│   │  EXIT:    │     │  Notify Lx:                   │   │
│   │  All good │     │  "Staff didn't manage to      │   │
│   └───────────┘     │   complete the task on time"  │   │
│                     └──────────────┬───────────────┘   │
│                                    │                    │
│                                    ▼                    │
│                     ┌──────────────────────────┐       │
│                     │  Wait X minutes           │       │
│                     └──────────────┬───────────┘       │
│                                    │                    │
│                                    ▼                    │
│                     ┌──────────────────────────┐       │
│                     │  DB Check: Task closed?   │       │
│                     └─────┬──────────────┬─────┘       │
│                           │ YES          │ NO           │
│                           ▼              ▼              │
│                     ┌──────────┐  ┌────────────────┐   │
│                     │ Lx must  │  │ Send REMINDER  │   │
│                     │ inform   │  │ to Lx          │   │
│                     │ parties  │  └───────┬────────┘   │
│                     │ & close  │          │             │
│                     │ SLA      │          ▼             │
│                     │ manually │  ┌────────────────┐   │
│                     └──────────┘  │ Wait X minutes  │   │
│                                   └───────┬────────┘   │
│                                           │             │
│                                           ▼             │
│                                   ┌────────────────┐   │
│                                   │ DB Check:       │   │
│                                   │ Acknowledged    │   │
│                                   │ by Lx?          │   │
│                                   └──┬──────────┬──┘   │
│                                      │ YES      │ NO    │
│                                      ▼          ▼       │
│                                ┌──────────┐ ┌────────┐ │
│                                │  Lx      │ │ESCALATE│ │
│                                │  handles │ │to Lx+1 │─┤
│                                │  it      │ └────────┘ │
│                                └──────────┘            │
│                                                         │
│   Levels: L1 → L2 → L3 → L4 → ... → Ln               │
└────────────────────────────────────────────────────────┘
```

### Key Notes — Watchdog

- The watchdog is an **external API** — separate from the main workflow.
- **Z minutes** is the initial completion deadline, configured per task type/complexity.
- After escalation, **Lx must manually close** the SLA after confirming resolution and informing concerned parties.
- The same two-wait, two-check escalation pattern is used as in the assignment loop.
- `PRO` status badge is shown at entry to this loop.

---

## 6. Complete End-to-End Status Flow

```
GUEST REQUEST
     │
     ▼
   OPEN ────────────▶ (Assignment Escalation if no staff available)
     │
     │  Staff assigned
     ▼
   PEN (Pending) ───▶ (No escalation at ack stage — assumed staff will ack)
     │
     │  Staff acknowledges
     ▼
   PRO (In Progress) ▶ (Watchdog Escalation if not completed in Z mins)
     │
     │  Staff clicks "Completed"
     ▼
   COM (Completed) ──▶ Feedback requested → Feedback stored → Ticket closed
```

---

## 7. Database Operations Summary

| Operation | When | Details |
|-----------|------|---------|
| Ticket creation | On service request | Created in Zoho with 6s delay; `escalation = false` |
| Staff query | During assignment | SQL: available + role match + lowest task count, `LIMIT 1` |
| Escalation flag | On escalation trigger | Set `escalation = true`, `escalation_level = N` |
| Status updates | At each transition | `OPEN → PEN → PRO → COM` |
| Completion check | Watchdog polling | External API checks Zoho for task closure |
| Feedback storage | After completion | Guest feedback stored in Zoho |

---

## 8. Notification Touchpoints

| Trigger | Recipient | Channel | Message |
|---------|-----------|---------|---------|
| New request | Guest | Wati | "Request Under Process" |
| Task assigned | Staff | Wati | Request details + guest info + room |
| Unassigned reminder | Manager Lx | Wati | "Ticket is unassigned" |
| Escalation (assignment) | Manager Lx+1 | Wati | "Ticket unassigned, escalated from Lx" |
| Task overdue | Manager Lx | Wati | "Staff didn't complete on time" |
| Escalation (completion) | Manager Lx+1 | Wati | "Task not acknowledged by Lx" |
| Feedback request | Guest | Wati | Feedback collection prompt |

---

## 9. Configurable Parameters

| Parameter | Symbol | Configured By | Example Values |
|-----------|--------|--------------|----------------|
| Reminder wait time | X minutes | Admin | Varies per escalation policy |
| Completion deadline | Z minutes | Admin (per task type) | Towel = 10 min, AC fix = 1 hr |
| Escalation levels | L1…Ln | Org hierarchy | L1 = Supervisor, L2 = Manager, etc. |

---

## 10. Known Gaps / Open Questions

1. **No escalation at acknowledgment stage** — Currently assumes staff will acknowledge after being reminded. No fallback if staff never acknowledges.
2. **6-second Zoho delay** — Open question on why there is a 6-second delay during ticket creation in Zoho. Needs investigation.
3. **Manual SLA closure** — After watchdog escalation resolves, Lx must manually close the SLA. No auto-close mechanism.
4. **Staff unavailability edge case** — What happens if the assignment escalation loop reaches Ln and the ticket is still unassigned?

---

## 11. Color Coding Reference (from Miro Board)

| Color | Hex | Usage |
|-------|-----|-------|
| Yellow | `#fff6b6` | Loops / iterative processes |
| Purple | `#dedaff` | Notifications |
| Orange | `#f8d3af` | Database operations |
| Green | `#adf0c7` | Verifications / checks |
| Blue | `#c6dcff` | Reminders |
