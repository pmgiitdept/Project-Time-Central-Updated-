import { motion } from "framer-motion";

export default function UsageSummary() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <p style={{ opacity: 0.7 }}>
        Aggregated totals of all verified DTRs will appear here.
      </p>
    </motion.div>
  );
}
