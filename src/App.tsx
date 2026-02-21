import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/Layout'
import TimelinePage from './pages/TimelinePage'
import FamilyTreePage from './pages/FamilyTreePage'
import MapPage from './pages/MapPage'

function App() {
  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<TimelinePage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/family-tree" element={<FamilyTreePage />} />
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  )
}

export default App
