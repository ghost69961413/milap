import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { landingHighlights } from "../../data/mockUiData";

function LandingHero() {
  return (
    <section className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:px-8 lg:pt-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="mb-5 inline-flex rounded-full border border-[#f0d7c8] bg-[#fff0e7] px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#8a2918]">
          India-focused matchmaking
        </p>

        <h1 className="font-display max-w-3xl text-5xl font-semibold leading-[1.07] tracking-tight text-[#1f2a44] md:text-6xl">
          Find a life partner with warmth, trust, and modern clarity.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4f5670]">
          Milap combines respectful matchmaking with verified profiles, compatibility-aware discovery, and secure real-time conversations.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            to="/dashboard/discover"
            className="rounded-full bg-[#8a2918] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#8a2918]/30 transition hover:bg-[#a23622]"
          >
            Start Discovering
          </Link>
          <Link
            to="/dashboard"
            className="rounded-full border border-[#d7c4b5] bg-white px-6 py-3 text-sm font-semibold text-[#1f2a44] transition hover:border-[#c8b3a3] hover:bg-[#fef8f2]"
          >
            Open Dashboard
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {landingHighlights.map((item, index) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.09, duration: 0.4 }}
              className="rounded-2xl border border-[#efe3da] bg-white/75 p-4 shadow-sm"
            >
              <p className="text-sm leading-6 text-[#485068]">{item}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, delay: 0.12 }}
        className="relative"
      >
        <div className="absolute -left-5 top-12 h-36 w-36 rounded-full bg-[#f6b893]/35 blur-3xl" />
        <div className="absolute -bottom-8 right-4 h-40 w-40 rounded-full bg-[#86a6d5]/28 blur-3xl" />

        <div className="relative overflow-hidden rounded-[2rem] border border-[#eadbcf] bg-gradient-to-br from-[#fff] via-[#fdf4eb] to-[#f8ece3] p-7 shadow-2xl shadow-[#c5a58f]/20">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#8a2918]">
            Compatibility Snapshot
          </p>

          <div className="mt-7 grid gap-4">
            <div className="rounded-2xl bg-[#1f2a44] p-5 text-white">
              <p className="text-sm text-[#bec9e2]">Top Match Score</p>
              <p className="mt-2 font-display text-4xl font-semibold">89%</p>
              <p className="mt-2 text-sm text-[#d8e2f8]">Strong alignment on values, education, and long-term goals.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[#e3d2c5] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8f785f]">Verified</p>
                <p className="mt-2 text-xl font-semibold text-[#1f2a44]">Identity + Family</p>
              </div>
              <div className="rounded-2xl border border-[#e3d2c5] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8f785f]">Realtime</p>
                <p className="mt-2 text-xl font-semibold text-[#1f2a44]">Secure Chat</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default LandingHero;
