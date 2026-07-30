import Link from "next/link";
import { ArrowRight, Brain, BriefcaseBusiness, CircleDollarSign, Sparkles } from "lucide-react";
import { MarketingHeader } from "@/components/ui/MarketingHeader";

const areas = [
  { icon: CircleDollarSign, title: "Money", text: "Turn paychecks, bills, debt, and goals into a clear next decision." },
  { icon: BriefcaseBusiness, title: "Career", text: "Know which skill, milestone, or opportunity deserves your attention now." },
  { icon: Brain, title: "Planning", text: "Build a realistic plan around your time, energy, priorities, and deadlines." },
];

export default function HomePage() {
  return (
    <main>
      <MarketingHeader />
      <section className="shell grid min-h-[72vh] items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <p className="eyebrow">Your next move, made clearer</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-7xl">
            Get your life moving in the right direction.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-black/60">
            Joye Life learns what matters to you, notices what needs attention, and turns scattered goals into a practical daily plan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/apply" className="button-primary gap-2">Apply for early access <ArrowRight size={16} /></Link>
            <Link href="/login" className="button-secondary">Member sign in</Link>
          </div>
          <p className="mt-4 text-sm text-black/45">Early beta access is reviewed individually.</p>
        </div>

        <div className="card overflow-hidden p-4 sm:p-6">
          <div className="rounded-3xl bg-ink p-6 text-white sm:p-8">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/55">Today’s brief</span>
              <Sparkles size={18} />
            </div>
            <h2 className="mt-8 text-3xl font-semibold tracking-tight">Protect your focus this evening.</h2>
            <p className="mt-3 leading-7 text-white/65">You have enough time and energy for one meaningful task. Your nearest goal deadline makes it the highest-leverage choice.</p>
            <div className="mt-8 rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[.18em] text-white/45">Recommended next move</p>
              <p className="mt-2 font-medium">Complete the next 30-minute step toward your priority goal.</p>
            </div>
          </div>
          <div className="grid gap-3 pt-4 sm:grid-cols-3">
            {areas.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-mist p-4">
                <Icon size={18} />
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-black/55">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
