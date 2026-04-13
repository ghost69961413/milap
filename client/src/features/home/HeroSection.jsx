import { motion } from "framer-motion";
import SectionTitle from "../../components/common/SectionTitle";

const highlights = [
  "Community-aware matchmaking filters",
  "Profile verification and secure chat",
  "Built for families and individuals"
];

const journeyCards = [
  {
    title: "Create a respectful first impression",
    text: "Profiles are structured around values, lifestyle, education, family background, and long-term intent."
  },
  {
    title: "Discover serious matches faster",
    text: "Smart filters and curated discovery reduce noise and help people focus on genuine compatibility."
  },
  {
    title: "Move forward with confidence",
    text: "Verification, moderation-ready workflows, and private communication support safer interactions."
  }
];

function HeroSection() {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-16 pt-12 lg:px-8 lg:pb-24 lg:pt-20">
      <section className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="mb-5 inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-800">
            India-focused modern matrimony
          </p>
          <h1 className="max-w-3xl font-serif text-5xl font-semibold leading-tight tracking-tight text-slate-900 md:text-6xl">
            A thoughtful platform for meaningful matrimonial connections.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Designed for trust, family context, and serious intent, with a scalable MERN architecture ready for chat, payments, and verified profiles.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              type="button"
              className="rounded-full bg-amber-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-700/20 transition hover:bg-amber-800"
            >
              Start Free
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-white"
            >
              Explore Profiles
            </button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur"
              >
                <p className="text-sm font-medium leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="relative"
        >
          <div className="absolute -left-6 top-8 h-32 w-32 rounded-full bg-amber-300/30 blur-3xl" />
          <div className="absolute -bottom-8 right-4 h-36 w-36 rounded-full bg-rose-300/25 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-slate-900 p-8 text-white shadow-2xl shadow-slate-900/20">
            <p className="text-sm uppercase tracking-[0.3em] text-amber-300">
              Match Snapshot
            </p>
            <div className="mt-8 space-y-6">
              <div className="rounded-2xl bg-white/10 p-5">
                <p className="text-sm text-slate-300">Compatibility Focus</p>
                <p className="mt-2 text-2xl font-semibold">Values, family, future plans</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/10 p-5">
                  <p className="text-3xl font-semibold">100%</p>
                  <p className="mt-2 text-sm text-slate-300">Profile completeness ready</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-5">
                  <p className="text-3xl font-semibold">24/7</p>
                  <p className="mt-2 text-sm text-slate-300">Realtime chat foundation</p>
                </div>
              </div>
              <p className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
                The frontend is prepared for a rich matchmaking experience, while the backend structure is ready for secure auth, discovery, chat, media uploads, and Razorpay subscriptions.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="features" className="mt-24">
        <SectionTitle
          eyebrow="Platform Foundation"
          title="Structured to scale from landing experience to verified matchmaking workflows."
          description="The initial scaffold keeps business logic modular and makes room for auth, profiles, preferences, discovery, realtime messaging, premium plans, and administration without early rewrites."
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {journeyCards.map((card, index) => (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: index * 0.1 }}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm"
            >
              <h3 className="font-serif text-2xl font-semibold text-slate-900">
                {card.title}
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-600">{card.text}</p>
            </motion.article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HeroSection;

