import React, { useState, useEffect, useRef } from 'react';
import Auth from './Auth';

const API_BASE = 'http://localhost:4000/api';

/* ---------------- AI reply data (still local -- see note near sendChat) ---------------- */
const AI_TOPICS = [
  {
    keywords: ['back', 'restor', 'return', 'when'],
    replies: [
      'Based on your outage history, here\u2019s the current estimate for this area.',
      "Check the Home screen for the latest restoration estimate \u2014 it updates as new outages are logged."
    ]
  },
  {
    keywords: ['fast', 'finish', 'unit', 'usage', 'consum'],
    replies: [
      "Your recent top-ups are on the Home screen \u2014 ask me again once more usage history is logged for a sharper answer.",
      'I can break usage down further once there\u2019s more purchase history to compare against.'
    ]
  },
  {
    keywords: ['cost', 'spend', 'budget', 'bill', 'price', 'money'],
    replies: [
      "Check your electricity profile's monthly budget on Settings \u2014 I'll compare it against real spend once more purchases are logged.",
      "I don't have enough purchase history yet to estimate this month's total spend precisely."
    ]
  },
  {
    keywords: ['outage', 'off', 'light', 'power'],
    replies: [
      "Your recent outages are listed on the Home screen, pulled straight from your logged history.",
      'I can tell you more about outage patterns once a few more are logged for this area.'
    ]
  },
  {
    keywords: ['hi', 'hello', 'hey'],
    replies: [
      'Hey! Ask me about your usage, spend, or outage history whenever you like.',
      'Hi there \u2014 happy to dig into your electricity data, just ask.'
    ]
  }
];
const FALLBACK_REPLIES = [
  "I don't have enough logged data yet to answer that precisely \u2014 the more you log, the sharper my answers get.",
  "That's a good question \u2014 I can answer it more accurately once there's a bit more usage history to go on.",
  'I can look into that once I have more logs to compare against \u2014 try asking about your units, cost, or outage history for now.'
];

function pickReply(text, topicCounters, fallbackCounter) {
  const lower = text.toLowerCase();
  for (let i = 0; i < AI_TOPICS.length; i++) {
    const topic = AI_TOPICS[i];
    if (topic.keywords.some((k) => lower.includes(k))) {
      const count = topicCounters.current[i] || 0;
      topicCounters.current[i] = count + 1;
      return topic.replies[count % topic.replies.length];
    }
  }
  const count = fallbackCounter.current;
  fallbackCounter.current = count + 1;
  return FALLBACK_REPLIES[count % FALLBACK_REPLIES.length];
}

/* ---------------- small shared bits ---------------- */
function BulbIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      <path
        d="M26 12c-7 0-11 5.5-11 11 0 4.6 2.6 7 4.4 9.3.9 1.1 1.3 2 1.3 3.2h10.6c0-1.2.4-2.1 1.3-3.2 1.8-2.3 4.4-4.7 4.4-9.3 0-5.5-4-11-11-11Z"
        fill="#F2A93B"
      />
    </svg>
  );
}

function useClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    function tick() {
      const d = new Date();
      let h = d.getHours() % 12;
      if (h === 0) h = 12;
      const m = d.getMinutes().toString().padStart(2, '0');
      setTime(`${h}:${m}`);
    }
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function firstName(fullName) {
  const name = (fullName || '').trim();
  if (!name) return 'there';
  const first = name.split(' ')[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ---------------- main app ---------------- */
export default function App() {
  const clock = useClock();

  // auth flow state -- `user` is whatever /api/login or /api/register returned
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null); // { id, full_name, email }
  const [elecType, setElecType] = useState('Prepaid'); // picked at signup, not yet persisted server-side (see Auth.jsx)

  // app navigation
  const [activePage, setActivePage] = useState('home'); // home | report | ai | settings

  // ---------------- server-backed dashboard data ----------------
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);
  const [profile, setProfile] = useState(null); // row from electricity_profiles
  const [powerEvents, setPowerEvents] = useState([]); // rows from power_status_events, this user only
  const [purchases, setPurchases] = useState([]); // rows from unit_purchases, this user only

  // power status is *derived* from powerEvents (see computeCurrentPower below),
  // but toggling it here only updates local UI -- writing it back requires
  // POST /api/power_status_events, which is admin-token-protected in the
  // current server.js, so a regular logged-in user can't persist this yet.
  const [powerOn, setPowerOn] = useState(false);

  // settings switches -- preloaded from user_settings if a row exists,
  // otherwise these defaults. Toggling them is local-only for the same
  // admin-token reason as above.
  const [switches, setSwitches] = useState({
    alerts: true,
    reminders: true,
    community: false,
    dataSaver: false
  });

  // chat -- history is loaded from chat_messages; new messages sent in the
  // UI are appended locally only, since POST /api/chat_messages is also
  // admin-protected right now.
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [typing, setTyping] = useState(false);
  const topicCounters = useRef({});
  const fallbackCounter = useRef(0);
  const chatBodyRef = useRef(null);

  // toast
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }

  function completeAuth(msg, userObj, signupElecType) {
    setUser(userObj);
    if (signupElecType) setElecType(signupElecType);
    setLoggedIn(true);
    showToast(msg + ' \u2713');
  }

  function logOut() {
    setLoggedIn(false);
    setUser(null);
    setActivePage('home');
    setProfile(null);
    setPowerEvents([]);
    setPurchases([]);
    setMessages([]);
  }

  /* ---------------- fetch everything once logged in ---------------- */
  useEffect(() => {
    if (!loggedIn || !user) return;

    let cancelled = false;
    async function loadDashboard() {
      setDashLoading(true);
      setDashError(null);
      try {
        const [profilesRes, eventsRes, purchasesRes, settingsRes] = await Promise.all([
          fetch(`${API_BASE}/electricity_profiles`),
          fetch(`${API_BASE}/power_status_events`),
          fetch(`${API_BASE}/unit_purchases`),
          fetch(`${API_BASE}/user_settings`)
        ]);

        if (!profilesRes.ok || !eventsRes.ok || !purchasesRes.ok || !settingsRes.ok) {
          throw new Error('One or more requests failed');
        }

        const [allProfiles, allEvents, allPurchases, allSettings] = await Promise.all([
          profilesRes.json(),
          eventsRes.json(),
          purchasesRes.json(),
          settingsRes.json()
        ]);

        if (cancelled) return;

        // The server's GET routes return every row for every user --
        // there's no ?user_id filter built in yet, so we filter here.
        const myProfile = allProfiles.find((p) => p.user_id === user.id) || null;
        const myEvents = allEvents
          .filter((e) => e.user_id === user.id)
          .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
        const myPurchases = allPurchases
          .filter((p) => p.user_id === user.id)
          .sort((a, b) => new Date(b.purchased_at) - new Date(a.purchased_at));
        const mySettings = allSettings.find((s) => s.user_id === user.id);

        setProfile(myProfile);
        setPowerEvents(myEvents);
        setPurchases(myPurchases);

        // current status = most recent event; if it's been closed
        // (ended_at set) that means power came back on
        const latest = myEvents[0];
        setPowerOn(latest ? Boolean(latest.ended_at) || latest.status === 'ON' : true);

        if (mySettings) {
          setSwitches({
            alerts: Boolean(mySettings.outage_alerts),
            reminders: Boolean(mySettings.low_unit_reminders),
            community: Boolean(mySettings.community_map),
            dataSaver: Boolean(mySettings.data_saver_mode)
          });
        }
      } catch (err) {
        if (!cancelled) setDashError(err.message);
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    }

    async function loadChat() {
      setChatLoading(true);
      try {
        const res = await fetch(`${API_BASE}/chat_messages`);
        if (!res.ok) throw new Error('Failed to load chat history');
        const all = await res.json();
        if (cancelled) return;
        const mine = all
          .filter((m) => m.user_id === user.id)
          .map((m) => ({ who: m.sender, text: m.message }));
        setMessages(
          mine.length > 0
            ? mine
            : [{ who: 'ai', text: `Hi ${firstName(user.full_name)} \u2014 ask me anything about your usage, costs, or outages.` }]
        );
      } catch (err) {
        if (!cancelled) {
          setMessages([
            { who: 'ai', text: 'Could not load your chat history \u2014 is the server running?' }
          ]);
        }
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    }

    loadDashboard();
    loadChat();

    return () => {
      cancelled = true;
    };
  }, [loggedIn, user]);

  function togglePower() {
    setPowerOn((prev) => {
      const next = !prev;
      showToast(next ? 'Power back on \u26A1 (not saved \u2014 see note in code)' : 'Power outage detected (not saved \u2014 see note in code)');
      return next;
    });
  }

  function saveReport() {
    showToast('Outage report saved locally (server write needs a non-admin route)');
  }

  function resetReport() {
    setPowerOn(false);
    showToast('Report reset');
  }

  function sendChat(text) {
    const value = (text || chatInput).trim();
    if (!value) return;
    setMessages((prev) => [...prev, { who: 'user', text: value }]);
    setChatInput('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const reply = pickReply(value, topicCounters, fallbackCounter);
      setMessages((prev) => [...prev, { who: 'ai', text: reply }]);
    }, 850);
  }

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, typing]);

  /* ---------------- derived display values ---------------- */
  const closedOutages = powerEvents.filter((e) => e.status === 'OFF' && e.ended_at);
  const avgDurationMinutes = closedOutages.length
    ? closedOutages.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / closedOutages.length
    : null;
  const restorationHrs = avgDurationMinutes ? (avgDurationMinutes / 60).toFixed(1) : null;
  const confidenceLabel =
    closedOutages.length >= 5 ? 'high confidence' : closedOutages.length > 0 ? 'low confidence' : null;

  const latestPurchase = purchases[0] || null;
  const displayName = user ? firstName(user.full_name) : 'there';
  const restoreVisible = !powerOn;

  return (
    <div className="app-page">
      <div className="intro">
        <div className="eyebrow">Light Tracker \u00b7 React build</div>
        <h1>\u26A1 Try the actual flow</h1>
        <p>
          Tap through onboarding, toggle the power status, log an outage, and chat with the AI
          assistant. Dashboard data now comes from your server at{' '}
          <code>{API_BASE}</code>.
        </p>
        <div className="diag">ready \u2014 tap anything below</div>
      </div>

      <div className="phone">
        <div className="notch" />
        <div className="screen">
          <div className="statusbar">
            <span>{clock}</span>
            <span>\u25CF\u25CF\u25CF \u25C8 100%</span>
          </div>

          {!loggedIn && (
            <div className="stack">
              <section className="scr active" style={{ padding: 0 }}>
                <Auth
                  compact
                  onLoginSuccess={(userObj) => completeAuth('Welcome back', userObj)}
                  onSignupSuccess={(userObj, signupElecType) =>
                    completeAuth('Account created', userObj, signupElecType)
                  }
                />
              </section>
            </div>
          )}

          {loggedIn && (
            <div className="app-shell active">
              <div className="pages">
                {activePage === 'home' && (
                  <section className="page active">
                    <div className="dash-top">
                      <div className="greet">HELLO</div>
                      <h2>{displayName} \uD83D\uDC4B</h2>
                      <div className="status-row" onClick={togglePower}>
                        <div
                          className="status-ring"
                          style={{
                            background: powerOn
                              ? 'conic-gradient(#F2A93B 0turn 1turn)'
                              : 'conic-gradient(#D8572A 0turn 1turn)',
                            boxShadow: powerOn
                              ? '0 0 0 5px rgba(242,169,59,0.22)'
                              : '0 0 0 5px rgba(216,87,42,0.18)'
                          }}
                        >
                          <div>{powerOn ? 'ON' : 'OFF'}</div>
                        </div>
                        <div className="status-text">
                          <b>{powerOn ? 'Power is on' : 'Power is off'}</b>
                          <span>
                            {profile ? profile.location : dashLoading ? 'Loading\u2026' : 'No profile on file'}
                          </span>
                        </div>
                      </div>
                      <div className="tap-hint">tap the status ring to simulate a change \u2191</div>
                    </div>

                    {dashError && (
                      <div className="cards">
                        <div className="card">
                          <div className="sub">Couldn't load your data: {dashError}. Is server.js running?</div>
                        </div>
                      </div>
                    )}

                    {!dashError && (
                      <div className="cards">
                        {restoreVisible && (
                          <div className="card">
                            <div className="row1">
                              <span>Est. restoration</span>
                            </div>
                            <div className="big">
                              {dashLoading ? '\u2026' : restorationHrs ? `~${restorationHrs} hrs` : 'Not enough data yet'}
                            </div>
                            <div className="sub">Based on outage history for this area</div>
                            {confidenceLabel && (
                              <div className="confidence">
                                {closedOutages.length} past outages \u00b7 {confidenceLabel}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="card">
                          <div className="row1">
                            <span>Last top-up</span>
                            <span>
                              {dashLoading ? '\u2026' : latestPurchase ? `${latestPurchase.units} units` : 'None yet'}
                            </span>
                          </div>
                          <div className="bar">
                            <div />
                          </div>
                          <div className="sub">
                            {latestPurchase
                              ? `\u20a6${latestPurchase.amount_naira} \u00b7 topped up ${formatDate(latestPurchase.purchased_at)}`
                              : 'Log a purchase to see it here'}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="quick">
                      <button className="qbtn" onClick={() => showToast('Redirecting to top-up\u2026')}>
                        Top up
                      </button>
                      <button className="qbtn" onClick={() => setActivePage('report')}>
                        Report outage
                      </button>
                      <button className="qbtn" onClick={() => setActivePage('ai')}>
                        Ask AI
                      </button>
                    </div>
                  </section>
                )}

                {activePage === 'report' && (
                  <section className="page active">
                    <div className="scr-header">
                      <h2>Report outage</h2>
                      <span>Logs the time so we can learn your area's pattern</span>
                    </div>
                    <div className="toggle2">
                      <button
                        className={!powerOn ? 'sel-off' : ''}
                        onClick={() => setPowerOn(false)}
                      >
                        Power OFF
                      </button>
                      <button className={powerOn ? 'sel-on' : ''} onClick={() => setPowerOn(true)}>
                        Power ON
                      </button>
                    </div>
                    <div className="field">
                      <label>Started at</label>
                      <input className="input" readOnly value={new Date().toLocaleString()} />
                    </div>
                    <div className="info-strip">
                      <b>
                        Average restoration:{' '}
                        {restorationHrs ? `~${restorationHrs} hrs` : 'not enough data yet'}
                      </b>
                      Estimated from past outages logged for this area and time of day.
                    </div>
                    <div className="actions">
                      <button className="btn" onClick={saveReport}>
                        Save report
                      </button>
                      <button className="btn ghost small" onClick={resetReport}>
                        Reset
                      </button>
                    </div>
                  </section>
                )}

                {activePage === 'ai' && (
                  <section className="page active">
                    <div className="scr-header" style={{ paddingBottom: 0 }}>
                      <h2>Ask Light Tracker</h2>
                      <span>Ask anything about your electricity</span>
                    </div>
                    <div className="chips">
                      <button
                        className="chip"
                        onClick={() => sendChat('Why did my units finish so fast this month?')}
                      >
                        Why so fast this month?
                      </button>
                      <button className="chip" onClick={() => sendChat('When will power likely come back?')}>
                        When's power back?
                      </button>
                    </div>
                    <div className="chat-body" ref={chatBodyRef}>
                      {chatLoading && <div className="bubble ai">Loading your chat history\u2026</div>}
                      {!chatLoading &&
                        messages.map((m, i) => (
                          <div key={i} className={`bubble ${m.who}`}>
                            {m.who === 'ai' && <span className="tag">LIGHT TRACKER AI</span>}
                            {m.text}
                          </div>
                        ))}
                      {typing && (
                        <div className="typing">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      )}
                    </div>
                    <div className="chat-input">
                      <input
                        placeholder="Ask a question\u2026"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') sendChat();
                        }}
                      />
                      <button className="send" onClick={() => sendChat()}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M4 12h16M13 5l7 7-7 7"
                            stroke="#FBF7EF"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </section>
                )}

                {activePage === 'settings' && (
                  <section className="page active">
                    <div className="scr-header">
                      <h2>Settings</h2>
                      <span>Profile and preferences</span>
                    </div>
                    <div className="profile-head">
                      <div className="avatar">{displayName.charAt(0).toUpperCase()}</div>
                      <div>
                        <b>{user ? user.full_name : displayName}</b>
                        <span>
                          {profile ? `${profile.location} \u00b7 ${profile.electricity_type}` : elecType}
                        </span>
                      </div>
                    </div>
                    {[
                      ['alerts', 'Outage alerts'],
                      ['reminders', 'Low-unit reminders'],
                      ['community', 'Community map'],
                      ['dataSaver', 'Data-saver mode']
                    ].map(([key, label]) => (
                      <div className="setting-row" key={key}>
                        <span>{label}</span>
                        <div
                          className={`switch ${switches[key] ? 'on' : ''}`}
                          onClick={() =>
                            setSwitches((prev) => ({ ...prev, [key]: !prev[key] }))
                          }
                        />
                      </div>
                    ))}
                    <div className="actions">
                      <button className="btn ghost small" onClick={logOut}>
                        Log out
                      </button>
                    </div>
                  </section>
                )}
              </div>

              <nav className="navbar">
                {[
                  ['home', 'Home'],
                  ['report', 'Report'],
                  ['ai', 'Ask AI'],
                  ['settings', 'Settings']
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={activePage === key ? 'active' : ''}
                    onClick={() => setActivePage(key)}
                  >
                    <div className="navdot" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>
      </div>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}
