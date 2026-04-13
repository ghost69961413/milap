import { motion } from "framer-motion";

function LoadingPanel({ lines = 3, className = "" }) {
  return (
    <div className={`rounded-3xl border border-white/70 bg-white/70 p-6 ${className}`}>
      <motion.div
        className="mb-4 h-4 w-32 rounded-full bg-slate-200"
        animate={{ opacity: [0.45, 1, 0.45] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <motion.div
            key={index}
            className="h-3 rounded-full bg-slate-200"
            style={{ width: `${92 - index * 14}%` }}
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.08
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default LoadingPanel;
