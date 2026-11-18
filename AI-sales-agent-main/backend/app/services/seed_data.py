from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.entities import (
    User, Lead, LeadScoreFactor, Conversation, Message, 
    KnowledgeDocument, KnowledgeChunk, FollowUp, Meeting, 
    ObjectionRecord, AgentActivityLog
)
from app.rag.engine import index_chunks

def seed_database(db: Session):
    """
    Seeds initial enterprise data:
    - Default user accounts
    - Knowledge base documents & chunks with embeddings
    - Rahul Sharma, Priya Mehta, Amit Patil leads
    - Score breakdown factors
    - Real-estate conversations and chat history
    - Upcoming meetings & scheduled follow-ups
    - Agent audit logs
    """
    # 1. Users
    if db.query(User).count() == 0:
        demo_user = User(
            username="salesrep",
            email="sales@skylineestates.com",
            hashed_password="demo_hashed_password_placeholder",
            full_name="Alex Turner",
            role="sales_rep",
            is_active=True
        )
        manager_user = User(
            username="manager",
            email="manager@skylineestates.com",
            hashed_password="demo_hashed_password_placeholder",
            full_name="Sarah Jenkins",
            role="sales_manager",
            is_active=True
        )
        db.add_all([demo_user, manager_user])
        db.commit()

    # 2. Knowledge Base Documents & Chunks
    if db.query(KnowledgeDocument).count() == 0:
        doc1 = KnowledgeDocument(
            title="Skyline Greens Pune - Master Brochure & Pricing 2026",
            filename="skyline_greens_master_brochure.pdf",
            file_type="pdf",
            category="Brochure",
            industry="real_estate",
            total_chunks=3,
            file_size_bytes=4120000,
            is_processed=True
        )
        doc2 = KnowledgeDocument(
            title="MahaRERA Certifications, Approvals & Bank Loan Partners",
            filename="legal_approvals_rera.pdf",
            file_type="pdf",
            category="Policy",
            industry="real_estate",
            total_chunks=2,
            file_size_bytes=2400000,
            is_processed=True
        )
        doc3 = KnowledgeDocument(
            title="Payment Plans, Subvention Schemes & Stamp Duty Schedule",
            filename="payment_milestones_2026.pdf",
            file_type="pdf",
            category="Pricing",
            industry="real_estate",
            total_chunks=2,
            file_size_bytes=1800000,
            is_processed=True
        )
        db.add_all([doc1, doc2, doc3])
        db.commit()

        # Seed Chunks
        chunks_payload = [
            (doc1.id, 0, "Skyline Greens Hinjawadi Phase 1, Pune. 2 BHK Premium residences start at ₹78 lakh all-inclusive (745 to 820 sq.ft carpet). 3 BHK Ultra-Luxury residences start at ₹1.15 crore (1,050 to 1,220 sq.ft carpet). All units feature East-West Vastu alignment, large sundeck balconies, and zero corridor wastage."),
            (doc1.id, 1, "World-class amenities span across 3 acres: 25,000 sq.ft signature clubhouse, temperature-controlled infinity pool, Olympic-size indoor squash courts, CrossFit gymnasium, senior citizen wellness plaza, and EV charging points in every dedicated car parking bay."),
            (doc1.id, 2, "Connectivity advantage: Situated 4 minutes from Embassy TechZone, 7 minutes from upcoming Metro Line 3 station, and 25 minutes from Pune-Mumbai Expressway junction. 8 top international schools within a 5 km radius."),
            (doc2.id, 0, "MahaRERA Registration Number: P52100034981. Possession guaranteed on or before December 2026 with RERA defect liability protection for 5 years post-handover. Freehold land title certified by Kanga & Co."),
            (doc2.id, 1, "Approved by top Tier-1 financial institutions: State Bank of India (SBI), HDFC Bank, ICICI Bank, and Axis Bank. Home loan pre-approval offers available up to 90% of total property value with special interest rate concessions from 8.35% onwards."),
            (doc3.id, 0, "Special Payment Plan: 10:90 Developer Subvention Scheme. Pay 10% on booking token, 0% EMI during entire construction phase, and balance 90% only upon possession. Zero pre-EMI interest burden for home buyers."),
            (doc3.id, 1, "Construction-Linked Milestone Plan provides an outright 3% early-booking rebate. Maintenance charges are fixed at ₹3.50 per sq.ft/month for the initial 24 months, deposited in an escrow maintenance account.")
        ]

        seeded = [KnowledgeChunk(document_id=d_id, chunk_index=idx, content=content)
                  for d_id, idx, content in chunks_payload]
        db.add_all(seeded)
        db.flush()  # ids needed before indexing
        index_chunks(db, seeded)
        db.commit()

    # 3. Sample Real-Estate Leads
    if db.query(Lead).count() == 0:
        lead1 = Lead(
            name="Rahul Sharma",
            email="rahul.sharma@techcorp.in",
            phone="+91 98201 44821",
            company="Infosys / TechCorp",
            industry="real_estate",
            job_title="Principal Cloud Architect",
            location="Pune",
            budget="₹80 lakh",
            budget_numeric=8000000.0,
            requirements="2 BHK, East-facing, Hinjawadi Phase 1, near IT Park with covered parking",
            timeline="Within 30 days",
            source="Website Form",
            lead_score=87,
            conversion_probability=0.82,
            score_category="Hot",
            stage="Engaged",
            qualification_status="Qualified",
            budget_qualified=True,
            authority_qualified=True,
            need_qualified=True,
            timeline_qualified=True,
            research_summary="Principal Cloud Architect with stable corporate background. Moving closer to Hinjawadi IT cluster to eliminate daily commute. Actively pre-approved for HDFC home loan.",
            pain_points="Commute time in Hinjawadi traffic; wants reliable possession timeline and peaceful gated society for growing family.",
            buying_intent="High",
            next_best_action="Schedule VIP Site Visit for Saturday 11 AM",
            next_best_action_reason="Prospect has confirmed BANT qualification, matches ₹80L inventory, and requested site walkthrough.",
            assigned_rep="AI Sales Workforce",
            created_at=datetime.utcnow() - timedelta(days=2)
        )

        lead2 = Lead(
            name="Priya Mehta",
            email="priya.mehta@finvest.com",
            phone="+91 98112 77340",
            company="Morgan Stanley / Finvest",
            industry="real_estate",
            job_title="Vice President - Investment Banking",
            location="Mumbai",
            budget="₹1.2 crore",
            budget_numeric=12000000.0,
            requirements="3 BHK Luxury, Sea/Green view, High Floor, Clubhouse amenities",
            timeline="Within 60 days",
            source="Meta Ads",
            lead_score=92,
            conversion_probability=0.88,
            score_category="Hot",
            stage="Meeting Scheduled",
            qualification_status="Qualified",
            budget_qualified=True,
            authority_qualified=True,
            need_qualified=True,
            timeline_qualified=True,
            research_summary="Senior Investment Banking VP seeking prime investment property or weekend residence. Highly responsive to digital brochures.",
            pain_points="Demands premium construction finishes, high security, and clear title documentation.",
            buying_intent="Urgent",
            next_best_action="Conduct 3D Virtual Presentation & Prepare Site Welcome Kit",
            next_best_action_reason="Site visit confirmed for Sunday. Needs bespoke high-floor pricing package.",
            assigned_rep="AI Sales Workforce",
            created_at=datetime.utcnow() - timedelta(days=4)
        )

        lead3 = Lead(
            name="Amit Patil",
            email="amit.patil@nashikauto.co",
            phone="+91 97654 33219",
            company="Patil Auto Components",
            industry="real_estate",
            job_title="Managing Director",
            location="Nashik",
            budget="₹55 lakh",
            budget_numeric=5500000.0,
            requirements="1/2 BHK compact investment unit for rental yield",
            timeline="Within 90 days",
            source="MagicBricks",
            lead_score=58,
            conversion_probability=0.55,
            score_category="Warm",
            stage="Contacted",
            qualification_status="Partially Qualified",
            budget_qualified=True,
            authority_qualified=True,
            need_qualified=False,
            timeline_qualified=False,
            research_summary="Business owner seeking Pune rental property for long-term passive rental yield. Comparing multiple suburbs.",
            pain_points="Price sensitivity; wants high rental yield (minimum 5% gross) and low upfront maintenance.",
            buying_intent="Medium",
            next_best_action="Send Rental Yield ROI Calculation Report",
            next_best_action_reason="Needs proof of rental demand before committing to site visit.",
            assigned_rep="AI Sales Workforce",
            created_at=datetime.utcnow() - timedelta(days=6)
        )

        db.add_all([lead1, lead2, lead3])
        db.commit()

        # Score factors for Rahul Sharma
        f1 = LeadScoreFactor(lead_id=lead1.id, factor_name="High Budget Match", score_impact=25, explanation="Budget of ₹80L perfectly aligns with 2 BHK inventory (₹78L-₹82L)", category="Budget")
        f2 = LeadScoreFactor(lead_id=lead1.id, factor_name="Urgent Timeline", score_impact=20, explanation="30-day purchasing timeline signifies imminent buying readiness", category="Timeline")
        f3 = LeadScoreFactor(lead_id=lead1.id, factor_name="Specific Requirements", score_impact=15, explanation="Clear criteria: 2 BHK, East-facing, Hinjawadi location", category="Need")
        f4 = LeadScoreFactor(lead_id=lead1.id, factor_name="High Two-Way Engagement", score_impact=15, explanation="Actively engaged across chat and WhatsApp outreach", category="Engagement")
        f5 = LeadScoreFactor(lead_id=lead1.id, factor_name="Prime Inbound Source", score_impact=12, explanation="Inbound direct website inquiry with verified contact number", category="Fit")
        db.add_all([f1, f2, f3, f4, f5])

        # Conversations for Rahul Sharma
        conv = Conversation(
            lead_id=lead1.id,
            channel="chat",
            status="active",
            sentiment="Positive",
            current_intent="Pricing & Site Visit",
            human_requested=False,
            summary="Prospect inquiring on 2 BHK pricing and floor plans; objections around price handled using subvention financing."
        )
        db.add(conv)
        db.commit()

        m1 = Message(
            conversation_id=conv.id,
            sender="customer",
            content="Hello, I am looking for a 2 BHK apartment in Pune under ₹80 lakh near Hinjawadi.",
            intent="Property Inquiry",
            sentiment="Positive",
            created_at=datetime.utcnow() - timedelta(hours=3)
        )
        m2 = Message(
            conversation_id=conv.id,
            sender="ai_agent",
            agent_name="Sales Communication Agent",
            content="Hello Rahul! I'd be delighted to assist. In our Skyline Greens Phase 1 township at Hinjawadi, 2 BHK residences start at ₹78 lakh all-inclusive. Are you looking for immediate possession or flexible payment milestone plans?",
            intent="Clarification & Pitch",
            sentiment="Positive",
            created_at=datetime.utcnow() - timedelta(hours=2, minutes=58)
        )
        m3 = Message(
            conversation_id=conv.id,
            sender="customer",
            content="₹80 lakh is slightly on the higher side of my budget. Are there hidden charges or discounts?",
            intent="Price Objection",
            sentiment="Hesitant",
            detected_objection="price",
            created_at=datetime.utcnow() - timedelta(hours=2, minutes=30)
        )
        m4 = Message(
            conversation_id=conv.id,
            sender="ai_agent",
            agent_name="Objection Handling Agent",
            content="I completely understand your concern, Rahul. The ₹78 lakh pricing is fully inclusive of clubhouse lifetime membership and designated covered parking. Additionally, with our 10:90 bank subvention scheme with HDFC, you only pay 10% now with zero EMI until possession. Would you like to review this on-site this Saturday?",
            intent="Objection Resolution: Value Reframing",
            sentiment="Positive",
            created_at=datetime.utcnow() - timedelta(hours=2, minutes=29)
        )
        db.add_all([m1, m2, m3, m4])

        # Scheduled Meeting for Priya Mehta
        meet = Meeting(
            lead_id=lead2.id,
            title="VIP 3 BHK Penthouse Walkthrough & Financial Structuring",
            meeting_type="site_visit",
            scheduled_time=datetime.utcnow() + timedelta(days=1, hours=4),
            duration_minutes=60,
            status="scheduled",
            location_or_link="Skyline Experience Centre, Tower B Suite 14, Hinjawadi",
            notes="Client arriving from Mumbai; requested high-floor panoramic view inspection."
        )
        db.add(meet)

        # Follow-ups for Rahul Sharma & Amit Patil
        fu1 = FollowUp(
            lead_id=lead1.id,
            cadence_step=2,
            due_date=datetime.utcnow() + timedelta(days=1),
            status="pending",
            channel="whatsapp",
            title="Day 2: Share 3D Virtual Tour & Site Location Pin",
            message_content="Hi Rahul! Sharing our 2-minute 3D virtual tour of the 2 BHK model residence and the location pin for Saturday's visit."
        )
        fu2 = FollowUp(
            lead_id=lead3.id,
            cadence_step=0,
            due_date=datetime.utcnow() + timedelta(hours=6),
            status="pending",
            channel="email",
            title="Day 0: Rental Yield Comparison Analysis",
            message_content="Dear Amit, attached is the detailed 5-year capital appreciation and gross rental yield report for Hinjawadi 1/2 BHK units."
        )
        db.add_all([fu1, fu2])

        # Objection record
        obj = ObjectionRecord(
            lead_id=lead1.id,
            conversation_id=conv.id,
            objection_type="price",
            customer_statement="₹80 lakh is slightly on the higher side of my budget. Are there hidden charges or discounts?",
            handled_response="I completely understand your concern, Rahul. The ₹78 lakh pricing is fully inclusive of clubhouse lifetime membership and designated covered parking. Additionally, with our 10:90 bank subvention scheme...",
            technique_used="Value Reframing & 10:90 Subvention Plan",
            resolution_status="Resolved"
        )
        db.add(obj)

        # Agent activity logs
        logs = [
            AgentActivityLog(
                agent_name="Lead Research Agent",
                action_type="research",
                lead_id=lead1.id,
                lead_name="Rahul Sharma",
                description="Profiled prospect as Senior IT Architect. Mapped commute pain points to Hinjawadi IT cluster proximity.",
                status="success"
            ),
            AgentActivityLog(
                agent_name="Lead Scoring Agent",
                action_type="score",
                lead_id=lead1.id,
                lead_name="Rahul Sharma",
                description="Assigned score 87/100 (Hot, 82% conversion probability). Factors: High budget match (+25), Urgent timeline (+20).",
                status="success"
            ),
            AgentActivityLog(
                agent_name="Qualification Agent",
                action_type="qualify",
                lead_id=lead1.id,
                lead_name="Rahul Sharma",
                description="BANT Criteria Confirmed: Budget ₹80L, Primary Decision Maker, 2 BHK Need, 30-day timeline.",
                status="success"
            ),
            AgentActivityLog(
                agent_name="Objection Handling Agent",
                action_type="objection_handled",
                lead_id=lead1.id,
                lead_name="Rahul Sharma",
                description="Handled price objection with 10:90 subvention financing and all-inclusive pricing breakdown.",
                status="success"
            ),
            AgentActivityLog(
                agent_name="CRM Agent",
                action_type="crm_sync",
                lead_id=lead1.id,
                lead_name="Rahul Sharma",
                description="Moved pipeline stage to 'Engaged'. Set Next Best Action to 'Schedule VIP Site Visit for Saturday'.",
                status="success"
            )
        ]
        db.add_all(logs)
        db.commit()
