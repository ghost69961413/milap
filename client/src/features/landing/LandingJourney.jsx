import { motion } from "framer-motion";
import { landingJourney } from "../../data/mockUiData";

function LandingJourney() {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8a2918]">
          Product Journey
        </p>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#1f2a44] md:text-5xl">
          One flow from profile setup to meaningful conversation.
        </h2>
        <p className="mt-4 text-base leading-7 text-[#555e79]">
          Designed for clarity and intent, every step helps users move from discovery to genuine connection without unnecessary friction.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {landingJourney.map((item, index) => (
          <motion.article
            key={item.id}
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.45, delay: index * 0.08 }}
            whileHover={{ y: -6, boxShadow: "0 22px 40px rgba(93, 66, 47, 0.12)" }}
            className="rounded-[1.75rem] border border-[#e8d9cb] bg-white/85 p-7"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9d6d47]">
              Step {index + 1}
            </p>
            <h3 className="mt-4 font-display text-2xl font-semibold text-[#1f2a44]">
              {item.title}
            </h3>
            <p className="mt-4 text-base leading-7 text-[#505a75]">{item.description}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

export default LandingJourney;
