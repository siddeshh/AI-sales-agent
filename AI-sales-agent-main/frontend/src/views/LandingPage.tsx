import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, BookOpen, Calendar, CheckCircle, Clock, Cpu, GraduationCap, Kanban, MessageSquare,
  PhoneCall, Search, ShieldAlert, Target, UserRound, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spotlight } from '@/components/landing/spotlight';
import { BentoCard, BentoGrid } from '@/components/landing/bento-grid';
import AnimatedGradientBackground from '@/components/landing/animated-gradient-background';

/* Landing page in the style of the v0 "AI Landing Page" template (design/v0-template, see design/DESIGN_TOKENS.md).
   Only real project content: no testimonials, logos, customer counts or pricing. */

const STEPS = [
  { title: 'Lead in', text: 'A lead arrives from a website form, Instagram, WhatsApp, a trade fair or a CSV file.' },
  { title: 'Scored', text: 'It gets a 0–100 score from its profile plus BANT evidence, with every factor shown.' },
  { title: 'Conversation', text: 'The AI answers from your documents, handles objections and asks the next question.' },
  { title: 'Meeting booked', text: 'When the customer is ready, it offers slots and books a demo call or showroom visit.' },
  { title: 'CRM updated', text: 'The stage and next step are saved, and every action is logged with its time.' },
];

const AGENTS: { name: string; text: string; Icon: React.ComponentType<{ className?: string }>; className: string }[] = [
  { name: 'Research', text: 'Builds a buyer profile (wholesale, corporate or individual) from the lead form.', Icon: Search, className: 'lg:col-span-1' },
  { name: 'Lead Qualification', text: 'Scores the lead and tracks Budget, Authority, Need and Timeline with quotes as evidence.', Icon: Target, className: 'lg:col-span-2' },
  { name: 'Communication', text: 'Writes replies and email / WhatsApp drafts in a friendly, short style.', Icon: MessageSquare, className: 'lg:col-span-1' },
  { name: 'Knowledge', text: 'Answers product questions only from your own documents, and says so when it cannot.', Icon: BookOpen, className: 'lg:col-span-1' },
  { name: 'Objection', text: 'Price, minimum order, delivery time, competitors: answered with a clear playbook.', Icon: ShieldAlert, className: 'lg:col-span-1' },
  { name: 'Voice', text: 'A browser voice session that introduces itself as an AI assistant.', Icon: PhoneCall, className: 'lg:col-span-1' },
  { name: 'Scheduling', text: 'Offers open slots and books product demos or showroom visits.', Icon: Calendar, className: 'lg:col-span-1' },
  { name: 'Follow-up', text: 'Day 0 / 2 / 5 / 10 follow-ups. Emails are really sent over SMTP.', Icon: Clock, className: 'lg:col-span-1' },
  { name: 'CRM', text: "Keeps stages and next steps in the app's own database.", Icon: Kanban, className: 'lg:col-span-1' },
  { name: 'Analytics', text: 'Meeting rate, win rate, pipeline and objections, computed from the data.', Icon: BarChart3, className: 'lg:col-span-2' },
];

const NUMBERS = [
  { value: '10', label: 'Agents, each with one job', Icon: Cpu, tone: 'bg-blue-900/40 text-blue-400' },
  { value: '4', label: 'Knowledge documents in the demo (3 loaded, 1 uploaded live)', Icon: BookOpen, tone: 'bg-green-900/40 text-green-400' },
  { value: '0.902', label: 'ROC-AUC of the Random Forest scorer on the X Education dataset (research paper)', Icon: BarChart3, tone: 'bg-purple-900/40 text-purple-400' },
  { value: '2', label: 'Real integrations: email over SMTP and the internal CRM', Icon: CheckCircle, tone: 'bg-orange-900/40 text-orange-400' },
];

const STACK = [
  'React 19 + Vite', 'Tailwind CSS v4 + shadcn/ui', 'FastAPI (Python)', 'SQLite + SQLAlchemy',
  'sentence-transformers MiniLM', 'Groq / OpenAI / Ollama LLMs', 'SMTP email', 'scikit-learn (research)',
];

const TEAM = ['Ayush Pisal', 'Neha Nagawade', 'Siddesh Hiwale', 'Girish Soni'];

const initials = (n: string) => n.split(' ').map((p) => p[0]).join('').slice(0, 2);

const NavLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  // Template's animated nav link: two stacked labels, the hover colour slides up
  <a href={href} className="group relative inline-flex h-5 items-start overflow-hidden text-sm leading-5">
    <div className="flex flex-col transition-transform duration-400 ease-out group-hover:-translate-y-1/2">
      <span className="text-gray-300">{children}</span>
      <span className="text-white">{children}</span>
    </div>
  </a>
);

const Navbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const links = [['How it works', '#how'], ['Agents', '#agents'], ['Demo', '#demo'], ['Team', '#team']];
  return (
    <header className={`fixed left-1/2 top-6 z-20 flex w-[calc(100%-2rem)] -translate-x-1/2 flex-col items-center border border-[#333] bg-[#1f1f1f57] px-6 py-3 backdrop-blur-sm sm:w-auto ${open ? 'rounded-xl' : 'rounded-full'}`}>
      <div className="flex w-full items-center justify-between gap-x-8">
        <a href="#top" className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="flex size-6 items-center justify-center rounded-sm border border-gray-300/60 text-xs">N</span> Nova
        </a>
        <nav className="hidden items-center gap-6 sm:flex">
          {links.map(([l, h]) => <NavLink key={h} href={h}>{l}</NavLink>)}
        </nav>
        <div className="group relative hidden sm:block">
          <div className="pointer-events-none absolute inset-0 -m-2 rounded-full bg-blue-400 opacity-40 blur-lg transition-all duration-300 group-hover:-m-3 group-hover:opacity-60 group-hover:blur-xl" />
          <Link to="/app" className="relative z-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 px-4 py-2 text-sm font-semibold text-white hover:from-blue-500 hover:to-blue-700">
            Open dashboard
          </Link>
        </div>
        <button className="text-gray-300 sm:hidden" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? <X className="size-6" /> : <span className="text-xl">☰</span>}
        </button>
      </div>
      {open && (
        <nav className="flex w-full flex-col items-center gap-4 pt-4 sm:hidden">
          {links.map(([l, h]) => <a key={h} href={h} onClick={() => setOpen(false)} className="text-gray-300 hover:text-white">{l}</a>)}
          <Link to="/app" className="rounded-full bg-gradient-to-br from-blue-400 to-blue-600 px-4 py-2 text-sm font-semibold text-white">Open dashboard</Link>
        </nav>
      )}
    </header>
  );
};

const SectionTitle: React.FC<{ title: string; text?: string }> = ({ title, text }) => (
  <div className="mb-16 space-y-4 text-center">
    <h2 className="text-3xl font-bold text-white md:text-4xl">{title}</h2>
    {text && <p className="mx-auto max-w-2xl text-xl text-gray-300">{text}</p>}
  </div>
);

const Screenshot: React.FC<{ className?: string }> = ({ className }) => (
  <img src="/screenshots/dashboard.png" alt="The Nova dashboard with demo data: number cards, lead pipeline, items that need attention and the AI activity feed"
    className={`rounded-xl border border-white/10 shadow-2xl ${className || ''}`} />
);

export const LandingPage: React.FC = () => (
  <div id="top" className="min-h-screen bg-black text-white">
    <Navbar />

    {/* Hero */}
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black pt-24">
      <div className="container mx-auto px-4">
        <Card className="relative w-full overflow-hidden border-none bg-black/[0.96] py-0 lg:h-[520px]">
          <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" size={320} />
          <div className="flex h-full flex-col lg:flex-row">
            <div className="relative z-10 flex flex-1 flex-col justify-center p-8">
              <h1 className="bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
                Your AI sales assistant for small businesses
              </h1>
              <p className="mt-4 max-w-lg text-lg text-neutral-300">
                Nova takes in your leads, scores them, chats with customers using your own documents, books meetings and
                keeps your CRM up to date. When a conversation gets hard, it hands it to a person.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button size="lg" asChild className="bg-white text-black hover:bg-gray-100">
                  <Link to="/app">Open dashboard <ArrowRight className="ml-1" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-neutral-600 bg-transparent text-neutral-300 hover:bg-neutral-800 hover:text-white">
                  <a href="#how">See how it works</a>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-neutral-400">
                <span className="flex items-center gap-2"><CheckCircle className="size-4 text-green-400" /> Answers only from your documents</span>
                <span className="flex items-center gap-2"><CheckCircle className="size-4 text-green-400" /> Every AI action logged with its time</span>
              </div>
            </div>
            <div className="relative flex flex-1 items-center justify-center p-6">
              <Screenshot className="max-h-[440px] w-full object-cover object-left-top" />
            </div>
          </div>
        </Card>
      </div>
    </section>

    {/* Problem & solution */}
    <section className="bg-black py-24">
      <div className="container mx-auto grid items-center gap-16 px-4 lg:grid-cols-2">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Selling in bulk is a lot of small work</h2>
          <div className="space-y-4 text-gray-300">
            {['Leads arrive on Instagram, WhatsApp, forms and fairs, and some never get a reply',
              'The same price, MOQ and delivery questions, every day',
              'Hard to tell which buyers are serious',
              'Meetings and next steps live in someone’s head'].map((t) => (
              <p key={t} className="flex items-start gap-3 text-gray-300"><span className="mt-1 text-red-500">✗</span>{t}</p>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-white">What Nova does</h3>
          <div className="space-y-4 text-gray-300">
            {['Replies to every lead and asks the next useful question',
              'Answers from your catalogue, price list and policies, with sources',
              'Scores each lead and shows why',
              'Books the meeting and writes it into the CRM'].map((t) => (
              <p key={t} className="flex items-start gap-3 text-gray-300"><CheckCircle className="mt-0.5 size-5 shrink-0 text-green-500" />{t}</p>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* How it works */}
    <section id="how" className="bg-black py-24">
      <div className="container mx-auto px-4">
        <SectionTitle title="How it works" text="From a new lead to an updated CRM, in five steps." />
        <div className="grid gap-8 md:grid-cols-5">
          {STEPS.map((s, i) => (
            <div key={s.title} className="space-y-4 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-white text-2xl font-bold text-black">{i + 1}</div>
              <h3 className="text-xl font-bold text-white">{s.title}</h3>
              <p className="text-gray-300">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* The 10 agents */}
    <section id="agents" className="bg-black py-24">
      <div className="container mx-auto px-4">
        <SectionTitle title="Ten agents, one job each" text="An orchestrator reads every customer message and hands it to the right agent." />
        <BentoGrid className="auto-rows-[15rem] lg:grid-cols-4">
          {AGENTS.map((a) => (
            <BentoCard key={a.name} name={a.name} description={a.text} Icon={a.Icon} href="/app/agents" cta="See it run"
              className={`col-span-3 md:col-span-1 ${a.className}`}
              background={<div className="absolute inset-0 border border-white/10 bg-black/80 backdrop-blur-sm" />} />
          ))}
        </BentoGrid>
      </div>
    </section>

    {/* Real numbers (replaces the template's invented "results") */}
    <section className="bg-black py-24">
      <div className="container mx-auto px-4">
        <SectionTitle title="The project in numbers" text="Facts about what is built, not promises." />
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {NUMBERS.map(({ value, label, Icon, tone }) => (
            <div key={label} className="space-y-4 text-center">
              <div className={`mx-auto flex size-16 items-center justify-center rounded-full ${tone.split(' ')[0]}`}>
                <Icon className={`size-8 ${tone.split(' ')[1]}`} />
              </div>
              <h3 className="text-2xl font-bold text-white">{value}</h3>
              <p className="text-gray-300">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Live demo */}
    <section id="demo" className="bg-black py-24">
      <div className="container mx-auto grid items-center gap-12 px-4 lg:grid-cols-[1.4fr_1fr]">
        <Screenshot className="w-full" />
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white md:text-4xl">Try the live demo</h2>
          <p className="text-gray-300">
            The demo runs on sample data for <span className="text-white">Celestial Wear</span>, a fictional apparel brand that
            sells online and takes bulk orders. Things to try:
          </p>
          <ul className="space-y-3 text-gray-300">
            {['Conversations: switch on "Play the customer" and ask about bulk prices',
              'Say "That\'s too expensive" or "I only need 30 pieces" and watch the Objection agent',
              'Ask for a call on Friday, then open Meetings',
              'Ask for a manager and see the handoff on the dashboard'].map((t) => (
              <li key={t} className="flex items-start gap-3"><CheckCircle className="mt-0.5 size-5 shrink-0 text-green-500" />{t}</li>
            ))}
          </ul>
          <p className="text-sm text-gray-400">
            Salesforce, HubSpot, Zoho, WhatsApp and Google Calendar are not connected; the app labels them "Demo mode — simulated".
          </p>
          <Button size="lg" asChild className="bg-white text-black hover:bg-gray-100">
            <Link to="/app">Open dashboard <ArrowRight className="ml-1" /></Link>
          </Button>
        </div>
      </div>
    </section>

    {/* Tech stack */}
    <section className="bg-black py-24">
      <div className="container mx-auto px-4">
        <SectionTitle title="Built with" />
        <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-3">
          {STACK.map((t) => (
            <span key={t} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-gray-300 backdrop-blur-sm">{t}</span>
          ))}
        </div>
      </div>
    </section>

    {/* Team */}
    <section id="team" className="bg-black py-24">
      <div className="container mx-auto px-4">
        <SectionTitle title="Team" text="Final-year project, MIT ADT University." />
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((n) => (
            <Card key={n} className="items-center border-white/10 bg-black/80 py-6 text-center backdrop-blur-sm">
              <div className="flex size-14 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-white">{initials(n)}</div>
              <div className="font-semibold text-white">{n}</div>
            </Card>
          ))}
        </div>
        <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-gray-300">
          <GraduationCap className="size-5 text-blue-400" />
          <span>Guide: <span className="font-semibold text-white">Prof. Dr. Sachin Jagdale</span></span>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="relative overflow-hidden py-24">
      <AnimatedGradientBackground Breathing />
      <div className="container relative z-10 mx-auto px-4 text-center">
        <div className="mx-auto max-w-3xl space-y-8">
          <h2 className="bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
            See Nova handle a lead from start to finish
          </h2>
          <Button size="lg" asChild className="bg-white text-black hover:bg-gray-100">
            <Link to="/app">Open dashboard <ArrowRight className="ml-1" /></Link>
          </Button>
        </div>
      </div>
    </section>

    {/* Footer */}
    <footer className="relative border-t border-white/10 bg-black py-16">
      <div className="container mx-auto grid gap-10 px-4 md:grid-cols-3">
        <div className="space-y-3">
          <h3 className="text-2xl font-bold text-white">Nova</h3>
          <p className="text-gray-400">An AI sales assistant for retail and e-commerce SMEs. Final-year project, MIT ADT University.</p>
        </div>
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-white">On this page</h4>
          {[['How it works', '#how'], ['Agents', '#agents'], ['Demo', '#demo'], ['Team', '#team']].map(([l, h]) => (
            <a key={h} href={h} className="group flex items-center text-gray-400 hover:text-white">
              <ArrowRight className="mr-2 size-3 opacity-0 transition-opacity group-hover:opacity-100" />{l}
            </a>
          ))}
        </div>
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-white">The app</h4>
          <Link to="/app" className="flex items-center gap-2 text-gray-400 hover:text-white"><UserRound className="size-4" /> Open the dashboard</Link>
          <p className="text-sm text-gray-500">Demo data is fictional. Design based on the v0 "AI Landing Page" template.</p>
        </div>
      </div>
      <div className="container mx-auto mt-12 border-t border-white/10 px-4 pt-6 text-sm text-gray-500">© 2026 Nova project team</div>
    </footer>
  </div>
);
