import { motion } from "framer-motion";

const pageMotion = {
  initial: {
    opacity: 0,
    y: 22,
    filter: "blur(6px)"
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.42,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -14,
    filter: "blur(6px)",
    transition: {
      duration: 0.24,
      ease: [0.4, 0, 1, 1]
    }
  }
};

function PageTransition({ children }) {
  return (
    <motion.div
      variants={pageMotion}
      initial="initial"
      animate="animate"
      exit="exit"
      className="relative"
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
