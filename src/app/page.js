import Link from "next/link";
import "./landing.css";

function BrandMark() {
  return (
    <svg className="landing-brandmark" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M8 19 25 4h26L36 19H8Z" fill="#ff9f1c" />
      <path d="M3 33 18 20h25L30 33H3Z" fill="#ffb52e" />
      <path d="M10 47 25 34h19L31 47H10Z" fill="#0f1f3a" />
      <path d="M39 20h16L38 47H22l8-9h7l8-13h-9Z" fill="#0f1f3a" />
    </svg>
  );
}

function RouteMap() {
  return (
    <svg className="landing-map" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path id="landing-route-one" className="landing-dash" d="M110 470 C250 250 420 520 690 140" fill="none" stroke="#f59e0b" strokeWidth="3" />
      <path id="landing-route-two" className="landing-dash" d="M90 140 C300 90 470 320 710 490" fill="none" stroke="#2f80ed" strokeWidth="3" />
      <g fill="#e8890c"><circle cx="110" cy="470" r="7" /><circle cx="690" cy="140" r="7" /></g>
      <g fill="#2f80ed"><circle cx="90" cy="140" r="7" /><circle cx="710" cy="490" r="7" /></g>
      <g fill="none" stroke="#e8890c" strokeWidth="2">
        <circle cx="110" cy="470" r="7"><animate attributeName="r" values="7;26" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values="1;0" dur="2s" repeatCount="indefinite" /></circle>
        <circle cx="690" cy="140" r="7"><animate attributeName="r" values="7;26" dur="2s" begin=".7s" repeatCount="indefinite" /><animate attributeName="opacity" values="1;0" dur="2s" begin=".7s" repeatCount="indefinite" /></circle>
      </g>
      <circle r="9" fill="#f59e0b" stroke="#fff" strokeWidth="3"><animateMotion dur="7s" repeatCount="indefinite"><mpath href="#landing-route-one" /></animateMotion></circle>
      <circle r="9" fill="#2f80ed" stroke="#fff" strokeWidth="3"><animateMotion dur="9s" repeatCount="indefinite"><mpath href="#landing-route-two" /></animateMotion></circle>
    </svg>
  );
}

export default function LandingPage() {
  return (
    <main className="landing-page" id="home">
      <header className="landing-topbar">
        <a className="landing-brand" href="#home" aria-label="Jaya Group Of Companies home">
          <BrandMark />
          <span className="landing-brandname">JAYA<small>GROUP OF COMPANIES</small></span>
        </a>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#home">Home</a>
          <Link className="landing-sign-top" href="/signin">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg>
            Sign In
          </Link>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <RouteMap />
        <div className="landing-card">
          <h1 id="landing-title">Welcome to <span>Jaya Group Of Companies</span></h1>
          <p>Manage your sales, purchases, inventory, and logistics operations from one centralized, modern ERP platform.</p>
          <Link className="landing-cta" href="/signin">Sign In</Link>
        </div>
      </section>

      <footer className="landing-foot">
        <span>ONE CENTRALIZED, MODERN ERP PLATFORM</span>
        <span>© {new Date().getFullYear()} Jaya Group. All rights reserved.</span>
      </footer>
    </main>
  );
}
