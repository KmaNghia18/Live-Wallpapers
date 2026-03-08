function TitleBar(): JSX.Element {
  return (
    <div className="titlebar">
      <div className="titlebar__logo">
        <div className="titlebar__logo-icon">🎬</div>
        Live Wallpaper
      </div>
      <div className="titlebar__controls">
        <button
          className="titlebar__btn"
          onClick={() => window.api.minimizeWindow()}
          title="Minimize"
        >
          ─
        </button>
        <button
          className="titlebar__btn"
          onClick={() => window.api.maximizeWindow()}
          title="Maximize"
        >
          □
        </button>
        <button
          className="titlebar__btn titlebar__btn--close"
          onClick={() => window.api.closeWindow()}
          title="Close"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default TitleBar
