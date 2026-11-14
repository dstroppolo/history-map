import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/Layout'
import TimelinePage from './pages/TimelinePage'
import MapPage from './pages/MapPage'

// The family tree pulls in three.js; load it only when that page is opened.
const FamilyTreePage = lazy(() => import('./pages/FamilyTreePage'))

function App() {
  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<TimelinePage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route
            path="/family-tree"
            element={
              <Suspense
                fallback={<div style={{ height: 'calc(100dvh - 64px)', background: '#05060D' }} />}
              >
                <FamilyTreePage />
              </Suspense>
            }
          />
          <Route path="/map" element={<MapPage />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  )
}

export default App
