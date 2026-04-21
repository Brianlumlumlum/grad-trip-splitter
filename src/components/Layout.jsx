export default function Layout({ title, subtitle, onBack, actions, children }) {
  return (
    <div className="layout">
      <header className="top-bar">
        <div className="top-bar-left">
          {onBack ? (
            <button type="button" className="btn btn-ghost" onClick={onBack}>
              ← Back
            </button>
          ) : (
            <span className="layout-brand" aria-hidden="true">
              <span className="brand-mark">✦</span>
              <span className="brand-text">Grad Trip</span>
            </span>
          )}
        </div>
        <div className="top-bar-center">
          {title ? (
            <h1 className="page-title" id="page-heading">
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p className="page-subtitle muted" id={title ? 'page-desc' : undefined}>
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="top-bar-right">{actions}</div>
      </header>
      <main className="main-content" aria-labelledby={title ? 'page-heading' : undefined}>
        {children}
      </main>
    </div>
  )
}
