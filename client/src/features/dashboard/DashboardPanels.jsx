import { motion } from "framer-motion";

function DashboardPanels({ stats, activity }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.62fr_0.38fr]">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              whileHover={{ y: -4, boxShadow: "0 18px 35px rgba(26, 35, 62, 0.13)" }}
              className="rounded-3xl border border-[#e9ddd1] bg-white/85 p-6"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-[#967155]">{item.label}</p>
              <p className="mt-4 font-display text-4xl font-semibold text-[#1f2a44]">
                {item.value}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#227a4b]">{item.trend} this week</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
          className="rounded-[2rem] border border-[#eadccf] bg-gradient-to-r from-[#1f2a44] to-[#314165] p-7 text-white"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-[#d4dcf5]">Daily Focus</p>
          <h3 className="mt-3 font-display text-3xl font-semibold">
            Profile Completion: 92%
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#d7def3]">
            Add one more family value preference and a short intro video to unlock stronger compatibility ranking.
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
        className="rounded-[2rem] border border-[#e8dbce] bg-white/85 p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#966e4f]">
          Live Activity
        </p>
        <h3 className="mt-2 font-display text-3xl font-semibold text-[#1f2a44]">
          Pulse Feed
        </h3>

        <div className="mt-6 space-y-3">
          {activity.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.2 + index * 0.08 }}
              className="rounded-2xl border border-[#ede2d8] bg-[#fff9f4] px-4 py-3"
            >
              <p className="text-sm font-medium text-[#1f2a44]">{item.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#96745d]">
                {item.time}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

export default DashboardPanels;
