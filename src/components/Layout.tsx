import { Outlet, NavLink, useLocation } from 'react-router-dom'

/** The family tree is a dark, immersive page; match the header to it. */
const DARK_CHROME = {
  '--color-card': '#0A0C18',
  '--color-border': 'rgba(255, 255, 255, 0.1)',
  '--color-primary': '#F6F1E4',
  '--color-secondary': '#9AA1BD',
  background: '#05060D',
} as React.CSSProperties

export default function Layout({ children }: { children?: React.ReactNode }) {
  const dark = useLocation().pathname.startsWith('/family-tree')
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        ...(dark ? DARK_CHROME : null),
      }}
    >
      <header
        style={{
          height: 64,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-card)',
        }}
      >
        <NavLink
          to="/"
          style={{
            color: 'var(--color-primary)',
            fontSize: 20,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          History Map
        </NavLink>
        <nav style={{ display: 'flex', gap: 32 }}>
          <NavLink
            to="/timeline"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-primary)' : 'var(--color-secondary)',
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
            })}
          >
            Timeline
          </NavLink>
          <NavLink
            to="/family-tree"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-primary)' : 'var(--color-secondary)',
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
            })}
          >
            Family Tree
          </NavLink>
          <NavLink
            to="/map"
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-primary)' : 'var(--color-secondary)',
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
            })}
          >
            Map
          </NavLink>
        </nav>
      </header>
      <main style={{ flex: 1 }}>
        {children ?? <Outlet />}
      </main>
    </div>
  )
}
