"""Demo dataset: Celestial Wear, a D2C apparel brand that also takes bulk / wholesale orders.

Everything here is fictional demo data. Scores, BANT and research are computed by the real agents at seed
time (not hardcoded), so the factor breakdown shown in the UI matches the scoring code.
"""
import json
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.entities import (
    User, Lead, Conversation, Message, KnowledgeDocument, KnowledgeChunk, FollowUp, Meeting,
    ObjectionRecord,
)
from app.rag.engine import DocumentChunker, index_chunks
from app.services.activity import agent_run

# --------------------------------------------------------------------------- knowledge base
KNOWLEDGE_DOCS = [
    ("Celestial Wear Product Catalogue 2026", "product_catalogue_2026.txt", "Catalogue", """
Celestial Wear product catalogue 2026. Retail prices (MRP) per piece, inclusive of GST, for online orders on celestialwear.in.
Classic Crew Tee: 180 GSM combed cotton, regular fit, sizes XS to 3XL, 14 colours. MRP ₹549.
Heavyweight Oversized Tee: 240 GSM cotton, drop shoulder, sizes S to 3XL, 8 colours. MRP ₹799.
Pique Polo: 220 GSM cotton pique, two-button placket, sizes S to 3XL, 10 colours. MRP ₹899.
French Terry Hoodie: 320 GSM cotton French terry, kangaroo pocket, sizes S to 3XL, 6 colours. MRP ₹1,599.
Zip-Up Hoodie: 320 GSM, metal zip, sizes S to 3XL, 4 colours. MRP ₹1,899.
Crewneck Sweatshirt: 300 GSM fleece-back cotton, sizes S to 3XL, 6 colours. MRP ₹1,299.
Linen-Blend Kurta: 55% linen 45% cotton, straight cut, sizes S to 3XL, 5 colours. MRP ₹1,499.
Relaxed Joggers: 280 GSM French terry, elastic waist with drawcord, sizes S to 3XL, 4 colours. MRP ₹1,199.
Cotton Twill Cap: adjustable strap, one size, 8 colours. MRP ₹449.
Canvas Tote Bag: 12 oz cotton canvas, 38 x 42 cm. MRP ₹399.
All garments are pre-shrunk and made with our manufacturing partner in Tiruppur. Size charts are on each product page.
Showroom: Celestial Wear Studio, Indiranagar, Bengaluru, open Monday to Saturday, 11 AM to 7 PM, by appointment for bulk buyers.
"""),
    ("Bulk Order Price List 2026", "bulk_price_list_2026.txt", "Pricing", """
Celestial Wear bulk order price list 2026. Prices per piece in rupees, excluding GST, plain garments.
Minimum order quantity (MOQ) for bulk pricing is 50 pieces per style; colours and sizes can be mixed within a style.
Volume slabs: 50-99 pieces 15% off MRP, 100-249 pieces 22% off, 250-499 pieces 28% off, 500 or more pieces 35% off.
Classic Crew Tee: 50+ ₹467, 100+ ₹428, 250+ ₹395, 500+ ₹357.
Heavyweight Oversized Tee: 50+ ₹679, 100+ ₹623, 250+ ₹575, 500+ ₹519.
Pique Polo: 50+ ₹764, 100+ ₹701, 250+ ₹647, 500+ ₹584.
French Terry Hoodie: 50+ ₹1,359, 100+ ₹1,247, 250+ ₹1,151, 500+ ₹1,039.
Zip-Up Hoodie: 50+ ₹1,614, 100+ ₹1,481, 250+ ₹1,367, 500+ ₹1,234.
Crewneck Sweatshirt: 50+ ₹1,104, 100+ ₹1,013, 250+ ₹935, 500+ ₹844.
Linen-Blend Kurta: 50+ ₹1,274, 100+ ₹1,169, 250+ ₹1,079, 500+ ₹974.
Relaxed Joggers: 50+ ₹1,019, 100+ ₹935, 250+ ₹863, 500+ ₹779.
Cotton Twill Cap: 50+ ₹382, 100+ ₹350, 250+ ₹323, 500+ ₹292.
Canvas Tote Bag: 50+ ₹339, 100+ ₹311, 250+ ₹287, 500+ ₹259.
Trial order: 20 to 49 pieces of one style at 10% off MRP, plain or one-colour print, so buyers can check quality before a full bulk order.
Printing and embroidery are charged extra (see the customisation FAQ). GST is added at invoicing.
Payment: 50% advance with the order, balance before dispatch. Quotes are valid for 30 days.
"""),
    ("Shipping and Returns Policy", "shipping_returns_policy.txt", "Policy", """
Celestial Wear shipping and returns policy.
Online orders: dispatched within 1-2 business days. Delivery takes 3-5 business days to metro cities and 5-7 business days elsewhere in India. Shipping is free on orders above ₹999, otherwise ₹79.
Bulk orders, plain garments: production and dispatch in 7-10 business days after the advance payment.
Bulk orders, printed or embroidered: 12-15 business days after artwork approval.
Express production: 5-7 business days for bulk orders up to 250 pieces, at a 12% surcharge on the order value. Subject to fabric availability; confirmed at the time of order.
Bulk shipping is free for orders above ₹50,000; below that a fixed ₹1,500 per consignment. We ship across India through courier partners and share tracking for every carton. We do not ship outside India yet.
Returns for online orders: 15-day returns or exchanges for unworn items with tags.
Returns for bulk orders: defective pieces are replaced free if reported with photos within 7 days of delivery. Customised (printed or embroidered) pieces cannot be returned except for defects.
Size exchanges on plain bulk orders are accepted within 7 days of delivery, up to 5% of the order quantity.
"""),
    ("Customisation and Printing FAQ", "customisation_faq.txt", "FAQ", """
Celestial Wear customisation and printing FAQ.
Screen printing: from 50 pieces. ₹35 per piece for one colour, plus ₹15 per piece for each extra colour, up to 6 colours. One-time screen setup ₹600 per colour.
DTF printing: no minimum quantity. ₹90 per print up to A4 size, ₹150 per print up to A3 size. Best for full-colour artwork and small batches.
Embroidery: ₹70 per piece up to 8,000 stitches (a typical left-chest logo), ₹110 per piece up to 15,000 stitches.
Custom woven neck labels: from 250 pieces, ₹12 per piece.
Print positions: front, back, left chest, sleeve. Maximum print area is A3.
Artwork: send AI, PDF or PNG at 300 dpi. We share a digital mockup within 48 hours, and production starts only after you approve it.
Samples: a physical sample costs ₹499 per piece and is adjusted against the bulk order. One free sample is included for orders of 250 pieces or more.
Custom colour dyeing is available from 500 pieces per colour.
Lead times for customised orders are in the shipping and returns policy.
"""),
]

# --------------------------------------------------------------------------- leads
# (name, email, phone, company, job_title, location, budget, budget_numeric, requirements, qty, buyer_type,
#  timeline, source, stage)
LEADS = [
    ("Priya Nair", "priya@threadlineboutique.in", "+91 98470 31245", "Threadline Boutique", "Founder", "Kochi",
     "₹1,20,000", 120000, "Mixed tees and linen-blend kurtas for festive collection", 150, "wholesale",
     "Within 3 weeks", "Instagram", "Meeting Scheduled"),
    ("Arjun Mehta", "arjun@urbandrip.store", "+91 99250 66710", "UrbanDrip (Instagram store)", "Owner", "Ahmedabad",
     "₹2,80,000", 280000, "Heavyweight oversized tees, black and off-white, for resale", 500, "wholesale",
     "Within 30 days", "Instagram", "Negotiation"),
    ("Sneha Kulkarni", "sneha.k@finvolve.co", "+91 98220 47813", "Finvolve Technologies", "HR Manager", "Pune",
     "₹3,50,000", 350000, "French terry hoodies with embroidered logo for company offsite", 250, "corporate",
     "Within 2 weeks", "Website Form", "Meeting Scheduled"),
    ("Rohit Verma", "rohit.verma@vcen.edu.in", "+91 97300 12958", "Vidyanagar College of Engineering",
     "Cultural Secretary", "Nagpur", "₹1,60,000", 160000, "Printed fest tees, 2-colour front print", 400,
     "corporate", "Within 10 days", "WhatsApp", "Qualified"),
    ("Fatima Sheikh", "fatima@noorcollections.in", "+91 90000 84512", "Noor Collections", "Proprietor", "Hyderabad",
     "₹95,000", 95000, "Linen-blend kurtas in pastel colours", 80, "wholesale", "Next month", "Trade Fair",
     "Contacted"),
    ("Karan Malhotra", "karan.m@brightpathlogistics.in", "+91 98110 23657", "Brightpath Logistics",
     "Admin & Facilities Lead", "Gurugram", "₹1,00,000", 100000, "Pique polos with left-chest logo as staff uniform",
     120, "corporate", "Within 45 days", "Website Form", "New"),
    ("Ananya Iyer", "ananya@thriftythreads.in", "+91 98840 77231", "ThriftyThreads by Ananya", "Owner", "Chennai",
     "₹20,000", 20000, "Small test batch of oversized tees for Instagram store", 40, "wholesale", "Exploring",
     "Instagram", "Engaged"),
    ("Vikram Singh", "vikram@singhsports.in", "+91 94140 55320", "Singh Sports & Apparel", "Owner", "Jaipur",
     "₹3,60,000", 360000, "Plain classic crew tees in bulk for store stock", 1000, "wholesale", "Within 2 months",
     "Trade Fair", "Contacted"),
    ("Meera Joshi", "meera@sahyadrisummit.in", "+91 98500 61844", "Sahyadri Startup Summit", "Events Head", "Pune",
     "₹2,40,000", 240000, "Printed tees and canvas totes for summit delegates", 600, "corporate", "Within 3 weeks",
     "WhatsApp", "Proposal"),
    ("Imran Qureshi", "imran@kurtakraft.in", "+91 99350 40277", "Kurta Kraft", "Co-founder", "Lucknow",
     "₹2,50,000", 250000, "Linen-blend kurtas for online resale", 200, "wholesale", "Within 2 months",
     "CSV Import", "New"),
    ("Divya Reddy", "divya.reddy@gmail.com", "+91 98450 19366", None, None, "Bengaluru", "₹18,000", 18000,
     "Custom printed tees for a family wedding", 30, "individual", "Within 10 days", "Website Form", "Lost"),
    ("Harsh Agarwal", "harsh@zenmartretail.in", "+91 98300 72519", "Zenmart Retail (3 stores)",
     "Procurement Manager", "Kolkata", "₹5,00,000", 500000, "Crewneck sweatshirts for winter stock", 600,
     "wholesale", "Within 6 weeks", "CSV Import", "Engaged"),
]

# --------------------------------------------------------------------------- conversations
# lead name → (channel, sentiment, intent, summary, [(sender, agent, text, intent, sentiment, objection)])
CONVERSATIONS = {
    "Sneha Kulkarni": ("chat", "Positive", "ready_to_buy",
        "250 embroidered hoodies for an offsite; delivery-time concern handled with express production; sample call booked.", [
        ("customer", None, "Hi, we need around 250 hoodies with our logo embroidered for a company offsite.", "question", "Neutral", None),
        ("ai_agent", "Knowledge Agent", "Our French Terry Hoodie is ₹1,151 per piece at the 250+ slab, and left-chest embroidery up to 8,000 stitches is ₹70 per piece. Would you like a mockup of your logo?", "question", "Neutral", None),
        ("customer", None, "The offsite is in 12 days. Your normal lead time is too long for us.", "objection", "Hesitant", "delivery"),
        ("ai_agent", "Objection Agent", "Understood. Express production takes 5-7 business days for orders up to 250 pieces, at a 12% surcharge, so we can still make your date once the artwork is approved. Shall I set up a quick sample review call?", "objection", "Hesitant", "delivery"),
        ("customer", None, "Yes, let's do a call tomorrow afternoon.", "ready_to_buy", "Positive", None),
    ]),
    "Arjun Mehta": ("whatsapp", "Hesitant", "objection",
        "500 oversized tees for resale; price objection answered with the 500+ slab.", [
        ("customer", None, "What's your best price for 500 oversized tees?", "question", "Neutral", None),
        ("ai_agent", "Knowledge Agent", "For 500 or more Heavyweight Oversized Tees the bulk price is ₹519 per piece, excluding GST, with colours and sizes mixable.", "question", "Neutral", None),
        ("customer", None, "That's too expensive, I get similar tees for less.", "objection", "Hesitant", "price"),
        ("ai_agent", "Objection Agent", "I hear you. ₹519 is already our deepest slab at 35% off MRP, for 240 GSM pre-shrunk cotton that holds up to resale. Would a sample piece help you compare quality before you decide?", "objection", "Hesitant", "price"),
    ]),
    "Ananya Iyer": ("chat", "Neutral", "objection",
        "Wants 40 tees to test; MOQ objection answered with the trial order.", [
        ("customer", None, "I only need about 40 tees to test my Instagram store. Is that possible?", "objection", "Neutral", "moq"),
        ("ai_agent", "Objection Agent", "Yes. Bulk pricing starts at 50 pieces, but our trial order covers 20 to 49 pieces of one style at 10% off MRP, plain or one-colour print. Would you like to start with that?", "objection", "Neutral", "moq"),
        ("customer", None, "Okay, send me the colours available for the oversized tee.", "question", "Positive", None),
    ]),
    "Harsh Agarwal": ("email", "Hesitant", "objection",
        "600 sweatshirts for 3 stores; comparing with another supplier.", [
        ("customer", None, "We are also getting quotes from a supplier in Ludhiana who is cheaper for sweatshirts.", "objection", "Hesitant", "competitor"),
        ("ai_agent", "Objection Agent", "That makes sense to compare. Our Crewneck Sweatshirt is 300 GSM fleece-back cotton, we can add your store labels from 250 pieces, and defective pieces are replaced free if reported within 7 days. Shall I send a sample so you can compare side by side?", "objection", "Hesitant", "competitor"),
    ]),
    "Priya Nair": ("chat", "Positive", "ready_to_buy",
        "Boutique owner planning a festive collection; showroom visit booked.", [
        ("customer", None, "Do you have linen kurtas in pastel colours? I run a boutique in Kochi.", "question", "Neutral", None),
        ("ai_agent", "Knowledge Agent", "Yes, our Linen-Blend Kurta (55% linen, 45% cotton) comes in 5 colours, sizes S to 3XL, and is ₹1,169 per piece at the 100+ slab. Would you like to see the fabric in person?", "question", "Neutral", None),
        ("customer", None, "I'll be in Bengaluru next week, can I visit the showroom?", "ready_to_buy", "Positive", None),
    ]),
}

# BANT evidence for leads with seeded conversations, in the same shape the LLM writes (Lead.bant_json).
# Quotes are verbatim from the seeded messages above or from the lead form ("Lead form: ...").
SEED_BANT = {
    "Sneha Kulkarni": {"budget": ("partial", "Lead form: ₹3,50,000"), "authority": ("partial", "Lead form: HR Manager"),
                       "need": ("confirmed", "we need around 250 hoodies with our logo embroidered"),
                       "timeline": ("confirmed", "The offsite is in 12 days.")},
    "Arjun Mehta": {"budget": ("partial", "That's too expensive, I get similar tees for less."),
                    "authority": ("partial", "Lead form: Owner"),
                    "need": ("confirmed", "What's your best price for 500 oversized tees?"),
                    "timeline": ("partial", "Lead form: Within 30 days")},
    "Ananya Iyer": {"budget": ("absent", ""), "authority": ("partial", "Lead form: Owner"),
                    "need": ("confirmed", "I only need about 40 tees to test my Instagram store."),
                    "timeline": ("absent", "")},
    "Harsh Agarwal": {"budget": ("partial", "Lead form: ₹5,00,000"), "authority": ("partial", "Lead form: Procurement Manager"),
                      "need": ("partial", "getting quotes from a supplier in Ludhiana who is cheaper for sweatshirts"),
                      "timeline": ("partial", "Lead form: Within 6 weeks")},
    "Priya Nair": {"budget": ("partial", "Lead form: ₹1,20,000"),
                   "authority": ("confirmed", "I run a boutique in Kochi."),
                   "need": ("confirmed", "Do you have linen kurtas in pastel colours?"),
                   "timeline": ("partial", "I'll be in Bengaluru next week")},
}

OBJECTION_TECHNIQUES = {"delivery": "Express production option", "price": "Volume-slab pricing and value",
                        "moq": "Smaller trial order", "competitor": "Quality, customisation and returns policy"}


def seed_database(db: Session):
    """Seeds an empty database. Called at startup and by POST /api/demo/reset."""
    from app.agents.lead_research_agent import LeadResearchAgent
    from app.agents.qualification_agent import LeadQualificationAgent

    if db.query(User).count() == 0:
        db.add_all([
            User(username="salesrep", email="sales@celestialwear.in", hashed_password="demo_hashed_password_placeholder",
                 full_name="Alex Turner", role="sales_rep", is_active=True),
            User(username="manager", email="manager@celestialwear.in", hashed_password="demo_hashed_password_placeholder",
                 full_name="Sarah Jenkins", role="sales_manager", is_active=True),
        ])
        db.commit()

    if db.query(KnowledgeDocument).count() == 0:
        chunks = []
        for title, filename, category, text in KNOWLEDGE_DOCS:
            body = " ".join(text.split())
            parts = DocumentChunker.chunk_text(body)
            doc = KnowledgeDocument(title=title, filename=filename, file_type="txt", category=category,
                                    industry="retail", total_chunks=len(parts),
                                    file_size_bytes=len(body.encode("utf-8")), is_processed=True)
            db.add(doc)
            db.flush()
            chunks += [KnowledgeChunk(document_id=doc.id, chunk_index=i, content=p) for i, p in enumerate(parts)]
        db.add_all(chunks)
        db.flush()  # ids needed before indexing
        index_chunks(db, chunks)
        db.commit()

    if db.query(Lead).count() > 0:
        return

    now = datetime.utcnow()
    leads = {}
    for i, (name, email, phone, company, title, city, budget, budget_num, req, qty, btype, timeline, source,
            stage) in enumerate(LEADS):
        lead = Lead(name=name, email=email, phone=phone, company=company, industry="retail", job_title=title,
                    location=city, budget=budget, budget_numeric=budget_num, requirements=req, order_quantity=qty,
                    buyer_type=btype, timeline=timeline, source=source, stage=stage,
                    created_at=now - timedelta(days=12 - i))
        db.add(lead)
        db.flush()
        leads[name] = lead

    # Conversations first, so engagement counts real customer messages when scoring.
    for name, (channel, sentiment, intent, summary, msgs) in CONVERSATIONS.items():
        lead = leads[name]
        conv = Conversation(lead_id=lead.id, channel=channel, status="active", sentiment=sentiment,
                            current_intent=intent, summary=summary, created_at=now - timedelta(days=3))
        db.add(conv)
        db.flush()
        for j, (sender, agent, text, m_intent, m_sent, objection) in enumerate(msgs):
            at = now - timedelta(days=3) + timedelta(minutes=7 * j)
            db.add(Message(conversation_id=conv.id, sender=sender, agent_name=agent, content=text, intent=m_intent,
                           sentiment=m_sent, detected_objection=objection,
                           provider="demo seed" if sender == "ai_agent" else None, created_at=at))
            if sender == "customer" and objection:
                reply = msgs[j + 1][2]
                db.add(ObjectionRecord(lead_id=lead.id, conversation_id=conv.id, objection_type=objection,
                                       customer_statement=text, handled_response=reply,
                                       technique_used=OBJECTION_TECHNIQUES[objection], resolution_status="Addressed",
                                       created_at=at))
        lead.last_contacted = now - timedelta(days=3)
    db.flush()

    for lead in leads.values():
        # Real agent runs at seed time; each writes a timed activity-log row.
        with agent_run(db, "Research Agent", "research", lead) as run:
            research = LeadResearchAgent.research_lead(lead)
            lead.research_summary, lead.pain_points = research["research_summary"], research["pain_points"]
            lead.buying_intent = research["buying_intent"]
            run["description"] = f"Demo seed: profiled lead as '{research['persona_type']}'."
        with agent_run(db, "Lead Qualification Agent", "score", lead) as run:
            LeadQualificationAgent.apply_bant_checklist(lead)
            if lead.name in SEED_BANT:
                lead.bant_json = json.dumps({k: {"status": st, "evidence": ev} for k, (st, ev) in SEED_BANT[lead.name].items()})
            score = LeadQualificationAgent.apply(lead, db)
            run["description"] = f"Demo seed: BANT checklist and score {score['lead_score']}/100 ({score['score_category']})."
        lead.next_best_action = research["next_best_action"]

    # Next actions for leads in active conversations
    leads["Sneha Kulkarni"].next_best_action = "Run sample review call and confirm express production"
    leads["Arjun Mehta"].next_best_action = "Send a sample piece and the 500+ slab quote"
    leads["Ananya Iyer"].next_best_action = "Share oversized tee colours and trial-order details"
    leads["Harsh Agarwal"].next_best_action = "Dispatch a sweatshirt sample for comparison"
    leads["Priya Nair"].next_best_action = "Prepare kurta fabric swatches for the showroom visit"

    day = (now + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0)
    db.add_all([
        Meeting(lead_id=leads["Sneha Kulkarni"].id, title="Sample review call: embroidered hoodies, Finvolve",
                meeting_type="product_demo", scheduled_time=day, duration_minutes=30, status="scheduled",
                location_or_link="Video call (link not generated)", notes="Review logo mockup and confirm express production."),
        Meeting(lead_id=leads["Priya Nair"].id, title="Showroom visit: Threadline Boutique festive collection",
                meeting_type="showroom_visit", scheduled_time=day + timedelta(days=5, hours=-3), duration_minutes=60,
                status="scheduled", location_or_link="Celestial Wear Studio, Indiranagar, Bengaluru",
                notes="Show linen-blend kurta colours and crew tee fabric."),
        Meeting(lead_id=leads["Arjun Mehta"].id, title="Product demo: oversized tee quality check, UrbanDrip",
                meeting_type="product_demo", scheduled_time=day + timedelta(days=2, hours=-2), duration_minutes=30,
                status="scheduled", location_or_link="Video call (link not generated)", notes="Walk through fabric weight and print options."),
    ])

    db.add_all([
        FollowUp(lead_id=leads["Arjun Mehta"].id, cadence_step=2, due_date=now + timedelta(days=1), status="pending",
                 channel="whatsapp", title="Day 2: Sample offer and slab quote",
                 message_content="Hi Arjun, sharing the 500+ slab quote for the Heavyweight Oversized Tee. Happy to send a sample piece so you can check the fabric."),
        FollowUp(lead_id=leads["Harsh Agarwal"].id, cadence_step=2, due_date=now + timedelta(days=2), status="pending",
                 channel="email", title="Day 2: Sweatshirt sample for comparison",
                 message_content="Dear Harsh, we can send a Crewneck Sweatshirt sample so you can compare it side by side with other quotes."),
        FollowUp(lead_id=leads["Ananya Iyer"].id, cadence_step=2, due_date=now + timedelta(days=1), status="pending",
                 channel="whatsapp", title="Day 2: Trial order colours",
                 message_content="Hi Ananya, here are the oversized tee colours for your trial order of 20 to 49 pieces."),
        FollowUp(lead_id=leads["Imran Qureshi"].id, cadence_step=0, due_date=now, status="pending",
                 channel="email", title="Day 0: Introduction with catalogue",
                 message_content="Dear Imran, thank you for your interest in Celestial Wear. Attached are our product catalogue and bulk price list."),
        FollowUp(lead_id=leads["Vikram Singh"].id, cadence_step=5, due_date=now + timedelta(days=3), status="pending",
                 channel="whatsapp", title="Day 5: Bulk price list follow-up",
                 message_content="Hi Vikram, following up from the trade fair. Would a quote for 1,000 Classic Crew Tees at the 500+ slab help?"),
    ])
    db.commit()
