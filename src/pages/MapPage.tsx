import { motion } from 'framer-motion'

export default function MapPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: 24 }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-primary)' }}>
        Map View
      </h1>
      <p style={{ color: 'var(--color-secondary)', marginTop: 8 }}>
        Coming soon – events plotted on a world map.
      </p>
    </motion.div>
  )
}
