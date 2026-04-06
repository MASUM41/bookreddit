import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          <span className="navbar__logo-icon">📚</span>
          <span className="navbar__logo-text">
            book<strong>reddit</strong>
          </span>
        </Link>

        <nav className="navbar__actions">
          <a href="#recommendations" className="navbar__link">For You</a>
          <a href="#discussions" className="navbar__link">Discussions</a>
        </nav>
      </div>
    </header>
  )
}
