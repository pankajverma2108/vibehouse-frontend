**VIBE HOUSE**

DevOps Consultant Meeting --- Follow-Up Document

Meeting Date: April 1, 2026 \| Property: Koramangala --- 5 Floors, 39
Rooms, 119 Beds

1\. Meeting Context

This document captures the key decisions, recommendations, and action
items from the DevOps consultant meeting held on April 1, 2026. The
meeting was called to validate the proposed production architecture for
Vibe House's hostel management platform, currently in development on
Railway and planned for production deployment on AWS.

The discussion covered infrastructure choices (ECS configuration, load
balancing, database), deployment strategy (blue-green vs rolling
updates), handling of race conditions in the booking flow, third-party
API rate limits (eZee PMS), and caching strategy for room rates.

2\. Attendees

  ----------------------- ----------------------- -----------------------
  **Name**                **Role**                **Notes**

  Anil                    DevOps Consultant       External advisor

  Amit                    Product / Business Lead Provided eZee context

  Apon                    Lead Developer          Built the current stack
  ----------------------- ----------------------- -----------------------

3\. Key Decisions & Recommendations

The following decisions were made or validated during the meeting,
mapped against the questions from the preparation document:

  ---------------- ----------------------- -------------------------------
  **Topic**        **Decision**            **Rationale**

  **Container      Use ECS with 2          Cost-effective at
  Orchestration    clusters, each running  \~\$30--35/cluster. Failover
  (ECS vs EKS)**   2 tasks (primary +      handled by primary/secondary
                   secondary failover).    task setup.
                   EKS and blue-green      
                   deemed overkill at      
                   current scale.          

  **Auto-Scaling   Set auto-scaling        Prevents sudden impact during
  Policy**         targets at 45--50% for  gradual traffic increases.
                   both CPU and memory. If Ensures headroom before
                   either crosses 50%, a   degradation.
                   new machine attaches    
                   automatically.          

  **Load           Use ALB. No need for    ALB supports session transfer
  Balancer**       Nginx or other          natively, required for the
                   alternatives.           booking flow.

  **Database       Use RDS with Aurora     Aurora provides Point-in-Time
  (RDS)**          PostgreSQL (not         Recovery (PITR) --- data
                   community edition). No  recovers within seconds if
                   Multi-AZ needed at      something crashes. Multi-AZ
                   current stage.          deferred.

  **Race           SQS FIFO confirmed.     Prevents race conditions when
  Conditions &     Implement retry with    multiple guests book limited
  Booking Queue**  deadlock handling.      rooms. Deadlock retry ensures
                                           failed transactions are
                                           re-processed.

  **eZee Rate      25 req/min sufficient   Third-party dependency --- only
  Limits**         for launch. Plan to     option is to wait or upgrade.
                   request increase or     Show users a waiting message if
                   upgrade plan when       queue backs up.
                   scaling (\~6 months).   

  **Redis Cache    Continue using Redis.   24-hour invalidation may be too
  for Room Rates** Review cache            long. Match invalidation to how
                   invalidation timing     fast eZee reflects changes on
                   based on eZee's price   OTAs.
                   update reflection       
                   speed.                  

  **Blue-Green     Not recommended. Use    Blue-green doubles costs.
  Deployment**     rolling updates with    2-task ECS setup with
                   primary/secondary       auto-scaling provides
                   failover.               sufficient zero-downtime.
  ---------------- ----------------------- -------------------------------

4\. Topics Not Yet Resolved

The following items from the preparation document were not addressed
during the meeting and require follow-up:

-   Networking: NAT Gateway vs Elastic IP vs no fixed IP --- depends on
    whether eZee/MyGate require IP whitelisting.

-   Secrets Management: AWS Secrets Manager vs SSM Parameter Store ---
    not discussed.

-   CI/CD Pipeline Details: GitHub Actions → ECR → ECS flow not
    explicitly walked through.

-   Multi-Property Architecture: Not discussed in depth. Revisit when
    property #2 planning begins.

-   Monitoring & Alerting Stack: CloudWatch vs alternatives not
    discussed.

-   Dev Environment Strategy: Full ECS dev environment vs local Docker
    Compose not addressed.

5\. Action Items

  -------------------- ------------- -------------- -------------------------
  **Action Item**      **Owner**     **Deadline**   **Details**

  **Confirm eZee price Product / Ops Before prod    Check how fast price
  reflection timing**  Team          launch         changes in eZee reflect
                                                    on OTAs. Set Redis
                                                    invalidation accordingly.

  **Confirm eZee &     Backend Team  Before prod    Contact support to get
  MyGate rate limits**               launch         documented rate limits
                                                    for production.

  **Configure ECS      DevOps / Apon Sprint 1       Primary + secondary
  clusters (2 tasks                                 tasks. Auto-scaling at
  each)**                                           45--50% CPU/memory.

  **Migrate to Aurora  Backend Team  Before prod    Migrate from Neon.tech.
  PostgreSQL on RDS**                migration      Enable PITR.

  **Implement SQS      Backend Team  Before prod    Add dead-letter queue and
  retry + deadlock                   launch         retry logic for booking
  handling**                                        race conditions.

  **Plan eZee rate     Product / Ops Month 3--6     Monitor volume. Request
  limit upgrade**      Team                         increase before hitting
                                                    25 req/min ceiling.

  **Design user-facing Frontend / UX Before prod    Friendly
  queue message**      Team          launch         waiting/processing
                                                    message when SQS queue
                                                    has backlog.
  -------------------- ------------- -------------- -------------------------

6\. Revised Architecture Summary

Based on the meeting outcomes, the revised production architecture:

  ---------------- --------------------------- ---------------------------
  **Component**    **Original Proposal**       **Post-Meeting Decision**

  **Compute**      ECS Fargate, 2× API + 2×    ECS with 2 clusters, 2
                   Frontend + Redis + Worker   tasks each (primary +
                                               secondary). Auto-scale at
                                               45--50%.

  **Load           ALB (\~\$18/mo)             ALB confirmed. Session
  Balancer**                                   transfer support needed for
                                               bookings.

  **Database**     RDS PostgreSQL t3.micro     RDS Aurora PostgreSQL with
                                               PITR enabled. No Multi-AZ
                                               for now.

  **Deployment**   Blue-green via CodeDeploy   Rolling updates with
                                               primary/secondary failover.
                                               Blue-green deferred.

  **Message        AWS SQS (3 queues)          SQS FIFO confirmed. Add
  Queue**                                      retry with deadlock
                                               handling + DLQ.

  **Cache**        Self-hosted Redis container Redis confirmed. Adjust
                                               invalidation based on eZee
                                               price update speed.
  ---------------- --------------------------- ---------------------------

7\. Consultant's Overall Assessment

The consultant (Anil) gave a positive assessment of the overall
architecture and tech stack. He noted that the technology choices are
sound and the architecture is well-planned for the current stage. He
specifically acknowledged the implementation quality as impressive for
an early-stage project.

The key theme of his recommendations was to avoid over-engineering at
this scale (\~0.5 req/sec, single property) while ensuring the
foundation supports future growth to 3--5 properties.

8\. Next Steps

1.  Complete all pre-production action items (Section 5) before
    migrating from Railway to AWS.

2.  Set up ECS clusters with the recommended 2-task primary/secondary
    configuration.

3.  Migrate database from Neon.tech to RDS Aurora PostgreSQL and
    validate PITR.

4.  Conduct load testing to validate auto-scaling triggers at 45--50%
    thresholds.

5.  Schedule a follow-up session with Anil if questions arise during
    implementation.

*Document prepared based on meeting recording and preparation notes.*

*For questions or corrections, contact the Vibe House tech team.*
