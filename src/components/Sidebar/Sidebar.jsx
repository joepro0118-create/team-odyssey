const NAV_ITEMS = [
  { label: 'Home' },
  { label: 'Tasks' },
  { label: 'Tracker' },
  { label: 'Recovery' },
];

function NavIcon({ index }) {
  switch (index) {
    case 0: // Home
      return (
        <svg viewBox="0 0 24 24">
          <path d="M3 11l9-7 9 7" />
          <path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" />
        </svg>
      );
    case 1: // Tasks
      return (
        <svg viewBox="0 0 24 24">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8 10h8M8 14h5" />
        </svg>
      );
    case 2: // Tracker
      return (
        <svg viewBox="0 0 24 24">
          <path d="M3 17l5-6 4 4 5-8 4 5" />
        </svg>
      );
    case 3: // Recovery
      return (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M21 12h-3M6 12H3" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Sidebar({ activeIndex, onNavigate }) {
  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <svg className="logo-wave" viewBox="0 0 48 48" fill="none">
          <path
            d="M4 30c4-6 10-6 14 0s10 6 14 0 10-6 14 0"
            stroke="#CFEEE1"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M4 20c4-6 10-6 14 0s10 6 14 0 10-6 14 0"
            stroke="#7FCFB6"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>

        <nav className="nav-icons">
          {NAV_ITEMS.map((item, i) => (
            <button
              key={item.label}
              className={`nav-btn ${activeIndex === i ? 'active' : ''}`}
              onClick={() => onNavigate(i)}
            >
              <div className="nav-btn-inner">
                <NavIcon index={i} />
                <span className="label">{item.label}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      <div className="profile-pic">JM</div>
    </div>
  );
}