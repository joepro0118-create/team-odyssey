const NAV_ITEMS = [
  { label: 'Home' },
  { label: 'Tracker' },
  { label: 'Calendar', hero: true },
  { label: 'Tasks' },
  { label: 'Recovery' },
];

function NavIcon({ label }) {
  switch (label) {
    case 'Home':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M3 11l9-7 9 7" />
          <path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" />
        </svg>
      );
    case 'Tracker':
      return (
        <svg viewBox="0 0 24 24">
          <path d="M3 17l5-6 4 4 5-8 4 5" />
        </svg>
      );
    case 'Calendar':
      return (
        <svg viewBox="0 0 24 24" className="hero-calendar-svg">
          <rect x="3" y="4" width="18" height="17" rx="2.5" />
          <path d="M8 2v4M16 2v4M3 9h18" />
        </svg>
      );
    case 'Tasks':
      return (
        <svg viewBox="0 0 24 24">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8 10h8M8 14h5" />
        </svg>
      );
    case 'Recovery':
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
    <nav className="bottom-nav" role="tablist" aria-label="Main navigation">
      {NAV_ITEMS.map((item, i) => {
        const isActive = activeIndex === i;
        const isHero = item.hero;

        return (
          <button
            key={item.label}
            role="tab"
            aria-selected={isActive}
            className={`bottom-nav-btn${isHero ? ' bottom-nav-btn--hero' : ''}${isActive ? ' active' : ''}`}
            onClick={() => onNavigate(i)}
          >
            {isHero ? (
              <div className="hero-circle">
                <NavIcon label={item.label} />
                <span className="hero-calendar-day">
                  {new Date().getDate()}
                </span>
              </div>
            ) : (
              <div className="bottom-nav-btn-inner">
                <NavIcon label={item.label} />
                <span className="bottom-nav-label">{item.label}</span>
                {isActive && <span className="active-dot" />}
              </div>
            )}
          </button>
        );
      })}
    </nav>
  );
}