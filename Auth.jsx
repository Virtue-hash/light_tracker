import React, { useState, useRef } from 'react';
import './Auth.css';

const API_BASE = 'http://localhost:4000/api';

function BulbIcon() {
  return (
    <svg viewBox="0 0 52 52" fill="none">
      <path
        d="M26 12c-7 0-11 5.5-11 11 0 4.6 2.6 7 4.4 9.3.9 1.1 1.3 2 1.3 3.2h10.6c0-1.2.4-2.1 1.3-3.2 1.8-2.3 4.4-4.7 4.4-9.3 0-5.5-4-11-11-11Z"
        fill="#F2A93B"
      />
    </svg>
  );
}

/**
 * Auth
 *
 * Note on fields: your `users` table needs full_name + email + password
 * (see schema.sql), but the original mockup only had a single "Username"
 * field on each form. I split that into "Full name" / "Email" on sign-up,
 * and changed the login field to "Email" (since /api/login checks email,
 * not a username) -- everything else about the mockup's look is unchanged.
 *
 * Props:
 * - compact: renders as a card (no brand panel, no full-viewport height) --
 *   use this when embedding inside another shell, e.g. the phone-frame mockup.
 * - onLoginSuccess(user): called with the user object the server returns
 *   ({ id, full_name, email }) after a successful /api/login call.
 * - onSignupSuccess(user, elecType): called with the user object after a
 *   successful /api/register call, plus the electricity type picked in
 *   the form (kept client-side for now -- see note near handleSignup).
 */
export default function Auth({ compact = false, onLoginSuccess, onSignupSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [elecType, setElecType] = useState('Prepaid');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPw, setSignupPw] = useState('');

  const [loginPwVisible, setLoginPwVisible] = useState(false);
  const [signupPwVisible, setSignupPwVisible] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }

  function strengthClass(v) {
    if (!v) return 'strength';
    if (v.length < 6) return 'strength weak';
    if (v.length < 10) return 'strength medium';
    return 'strength strong';
  }

  async function handleLogin() {
    if (!loginEmail || !loginPassword) {
      showToast('Enter your email and password');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Login failed');
        return;
      }

      showToast('Logged in \u2713');
      if (onLoginSuccess) onLoginSuccess(data);
      else window.location.href = 'dashboard.html';
    } catch (err) {
      showToast('Could not reach the server \u2014 is it running?');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignup() {
    if (!signupFullName || !signupEmail || !signupPw) {
      showToast('Fill in your name, email, and password');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: signupFullName,
          email: signupEmail,
          password: signupPw
        })
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Sign up failed');
        return;
      }

      showToast('Account created \u2713');
      // Note: electricity type / location aren't sent anywhere yet --
      // /api/register only creates the `users` row. Saving them to
      // `electricity_profiles` would need its own POST call, but that
      // route is admin-token-protected in the current server.js, not
      // something a freshly-registered user can call. For now elecType
      // is just handed up to App.jsx to show on the Settings screen.
      if (onSignupSuccess) onSignupSuccess(data, elecType);
      else window.location.href = 'dashboard.html';
    } catch (err) {
      showToast('Could not reach the server \u2014 is it running?');
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoogle() {
    showToast('Google sign-in would open here');
  }

  return (
    <div className={`auth-layout ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="auth-brand-panel">
          <div className="auth-brand-top">
            <BulbIcon />
            Light Tracker
          </div>
          <div className="auth-brand-mid">
            <h1>
              Know when the lights go out.
              <br />
              Know when they'll come back.
            </h1>
            <p>
              Real-time outage alerts, restoration predictions, and unit tracking \u2014 built
              for the way electricity actually works where you live.
            </p>
          </div>
          <div className="auth-brand-stats">
            <div>
              <b>83%</b>
              <span>WANT RESTORATION ETAS</span>
            </div>
            <div>
              <b>15</b>
              <span>ALERTS REQUESTED MOST</span>
            </div>
            <div>
              <b>50%</b>
              <span>JOINED WAITLIST</span>
            </div>
          </div>
        </div>
      )}

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={tab === 'login' ? 'active' : ''}
              onClick={() => setTab('login')}
            >
              Log in
            </button>
            <button
              type="button"
              className={tab === 'signup' ? 'active' : ''}
              onClick={() => setTab('signup')}
            >
              Sign up
            </button>
          </div>

          <div className={`auth-form-view ${tab === 'login' ? 'active' : ''}`}>
            <h2>Welcome back</h2>
            <p>Log in to see your live power status.</p>
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                type="email"
                placeholder="ade@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <div className="input-wrap">
                <input
                  className="input"
                  type={loginPwVisible ? 'text' : 'password'}
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="toggle-pw"
                  onClick={() => setLoginPwVisible((v) => !v)}
                >
                  {loginPwVisible ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>
            <div className="row-inline">
              <label>
                <input type="checkbox" defaultChecked /> Remember me
              </label>
              <a className="link" href="#!">
                Forgot password?
              </a>
            </div>
            <button className="btn" type="button" onClick={handleLogin} disabled={submitting}>
              {submitting ? 'Logging in\u2026' : 'Log in'}
            </button>
            <div className="switch-line">
              New here?{' '}
              <a
                className="link"
                href="#!"
                onClick={(e) => {
                  e.preventDefault();
                  setTab('signup');
                }}
              >
                Create an account
              </a>
            </div>
          </div>

          <div className={`auth-form-view ${tab === 'signup' ? 'active' : ''}`}>
            <h2>Create your account</h2>
            <p>Takes about a minute \u2014 no card required.</p>
            <div className="field">
              <label>Electricity type</label>
              <div className="segmented">
                {['Prepaid', 'Grid', 'Generator', 'Solar'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={elecType === t ? 'active' : ''}
                    onClick={() => setElecType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Location</label>
              <input className="input" placeholder="e.g. Lagos, Nigeria" />
            </div>
            <div className="field">
              <label>Full name</label>
              <input
                className="input"
                placeholder="Ade Johnson"
                value={signupFullName}
                onChange={(e) => setSignupFullName(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                type="email"
                placeholder="ade@example.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <div className="input-wrap">
                <input
                  className="input"
                  type={signupPwVisible ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={signupPw}
                  onChange={(e) => setSignupPw(e.target.value)}
                />
                <button
                  type="button"
                  className="toggle-pw"
                  onClick={() => setSignupPwVisible((v) => !v)}
                >
                  {signupPwVisible ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              <div className={strengthClass(signupPw)}>
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>
            <button
              className="btn"
              type="button"
              style={{ marginTop: 6 }}
              onClick={handleSignup}
              disabled={submitting}
            >
              {submitting ? 'Creating account\u2026' : 'Create account'}
            </button>
            <div className="switch-line">
              Already have an account?{' '}
              <a
                className="link"
                href="#!"
                onClick={(e) => {
                  e.preventDefault();
                  setTab('login');
                }}
              >
                Log in
              </a>
            </div>
          </div>

          <div className="divider">or continue with</div>
          <button
            className="btn"
            type="button"
            style={{
              background: '#fff',
              border: '1.5px solid var(--line)',
              color: 'var(--ink)',
              boxShadow: 'none'
            }}
            onClick={handleGoogle}
          >
            Continue with Google
          </button>
        </div>
      </div>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}
