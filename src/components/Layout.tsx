import { Outlet, NavLink } from 'react-router-dom'

export default function Layout({ children }: { children?: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
