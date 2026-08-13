import React, { useEffect, useState } from 'react';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

:root {
  --paper: #FBF7EF;
  --paper-2: #F1EBDC;
  --ink: #16213F;
  --ink-soft: #5A6486;
  --amber: #F2A93B;
  --amber-deep: #C9821E;
  --rust: #D8572A;
  --teal: #2E8F79;
  --line: rgba(22,33,63,0.14);
}

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html,
body,
#root {
  margin: 0;
  padding: 0;
  height: 100%;
}

body {
  font-family: 'Inter', sans-serif;
  background:
    radial-gradient(
      circle at 12% 8%,
      rgba(242,169,59,0.10),
      transparent 42%
    ),
    radial-gradient(
      circle at 88% 92%,
      rgba(46,143,121,0.12),
      transparent 46%
    ),
    var(--ink);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 48px 20px;
  color: var(--paper);
}

button,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

.intro {
  text-align: center;
  max-width: 420px;
  margin-bottom: 30px;
}

.intro .eyebrow {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11.5px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 10px;
}

.intro h1 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 28px;
  margin: 0 0 8px;
}

.intro p {
  font-size: 13.5px;
  color: rgba(251,247,239,.65);
  line-height: 1.55;
  margin: 0;
}

#diag {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: rgba(251,247,239,.5);
  margin-top: 10px;
  min-height: 14px;
}

.phone {
  width: 300px;
  height: 640px;
  background: linear-gradient(160deg,#1c2a4d,#0f1730);
  border-radius: 42px;
  padding: 10px;
  box-shadow:
    0 40px 70px -22px rgba(0,0,0,.6),
    0 0 0 1px rgba(255,255,255,.05) inset;
  position: relative;
  flex-shrink: 0;
}

.notch {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 92px;
  height: 20px;
  background: #0f1730;
  border-radius: 0 0 14px 14px;
  z-index: 20;
}

.screen {
  width: 100%;
  height: 100%;
  background: var(--paper);
  border-radius: 32px;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.statusbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px 2px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: var(--ink);
  flex-shrink: 0;
}

.stack {
  position: relative;
  flex: 1;
  min-height: 0;
}

.scr,
.page {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--paper);
  opacity: 0;
  pointer-events: none;
  transform: translateX(14px);
  transition:
    opacity .28s ease,
    transform .28s ease;
  overflow-y: auto;
}

.scr.active,
.page.active {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.center-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 30px;
  text-align: center;
}

.dial {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background:
    conic-gradient(
      var(--amber) 0turn,
      var(--amber) .72turn,
      var(--paper-2) .72turn
    );
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  box-shadow: 0 0 0 6px rgba(242,169,59,.10);
}

.dial-inner {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
}

.center-body h1 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 22px;
  margin: 0 0 8px;
  color: var(--ink);
}

.center-body p {
  font-size: 13px;
  color: var(--ink-soft);
  line-height: 1.55;
  margin: 0 0 24px;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  background: var(--amber);
  color: var(--ink);
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  font-size: 14px;
  padding: 13px;
  border-radius: 13px;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 18px -8px rgba(242,169,59,.65);
  transition:
    transform .12s ease,
    box-shadow .12s ease;
}

.btn:active {
  transform: scale(.97);
  box-shadow: 0 4px 10px -6px rgba(242,169,59,.55);
}

.btn.ghost {
  background: transparent;
  box-shadow: none;
  border: 1px solid var(--line);
  color: var(--ink);
}

.btn.small {
  padding: 9px;
  font-size: 12.5px;
  border-radius: 10px;
}

.link {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--ink);
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

.link-row {
  text-align: center;
  margin-top: 14px;
  font-size: 12px;
  color: var(--ink-soft);
}

.scr-header {
  padding: 8px 22px 2px;
  flex-shrink: 0;
}

.scr-header h2 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 20px;
  font-weight: 700;
  margin: 6px 0 2px;
  color: var(--ink);
}

.scr-header span {
  font-size: 12px;
  color: var(--ink-soft);
}

.field {
  padding: 0 22px;
  margin-top: 12px;
}

.field label {
  display: block;
  font-size: 10.5px;
  font-family: 'IBM Plex Mono', monospace;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: var(--ink-soft);
  margin-bottom: 5px;
}

.input {
  width: 100%;
  border: 1px solid var(--line);
  background: #fff;
  border-radius: 11px;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--ink);
  font-family: 'Inter', sans-serif;
}

.input:focus {
  outline: 2px solid var(--amber);
  outline-offset: 1px;
}

.segmented {
  display: flex;
  margin: 0 22px;
  background: var(--paper-2);
  border-radius: 11px;
  padding: 3px;
}

.segmented button {
  flex: 1;
  text-align: center;
  font-size: 11px;
  padding: 7px 4px;
  font-family: 'IBM Plex Mono', monospace;
  color: var(--ink-soft);
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
}

.segmented button.active {
  background: var(--ink);
  color: var(--paper);
}

.actions {
  padding: 16px 22px 20px;
  margin-top: auto;
  flex-shrink: 0;
}

.actions .btn + .btn {
  margin-top: 10px;
}

.app-shell {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  opacity: 0;
  pointer-events: none;
  transition: opacity .3s ease;
}

.app-shell.active {
  opacity: 1;
  pointer-events: auto;
}

.pages {
  position: relative;
  flex: 1;
  min-height: 0;
}

.dash-top {
  background: var(--ink);
  color: var(--paper);
  padding: 18px 22px 20px;
  border-radius: 0 0 22px 22px;
  flex-shrink: 0;
}

.dash-top .greet {
  font-size: 11.5px;
  color: rgba(251,247,239,.6);
  font-family: 'IBM Plex Mono', monospace;
}

.dash-top h2 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  margin: 2px 0 14px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 13px;
  cursor: pointer;
  user-select: none;
}

.status-ring {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    background .3s ease,
    box-shadow .3s ease;
}

.status-ring div {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
}

.status-text b {
  display: block;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14.5px;
}

.status-text span {
  font-size: 11px;
  color: rgba(251,247,239,.65);
}

.tap-hint {
  font-size: 9.5px;
  color: rgba(251,247,239,.4);
  margin-top: 8px;
  font-family: 'IBM Plex Mono', monospace;
}

.cards {
  padding: 14px 18px 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card {
  background: var(--paper-2);
  border-radius: 14px;
  padding: 12px 14px;
  border: 1px solid var(--line);
}

.card .row1 {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.card .row1 span {
  font-size: 10.5px;
  font-family: 'IBM Plex Mono', monospace;
  color: var(--ink-soft);
  text-transform: uppercase;
  letter-spacing: .04em;
}

.card .big {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 19px;
  color: var(--ink);
  margin-top: 4px;
}

.card .sub {
  font-size: 11px;
  color: var(--ink-soft);
  margin-top: 2px;
}

.bar {
  height: 6px;
  border-radius: 4px;
  background: #e4dfd0;
  margin-top: 8px;
  overflow: hidden;
}

.bar div {
  height: 100%;
  background: var(--teal);
  width: 38%;
  border-radius: 4px;
}

.confidence {
  display: inline-block;
  margin-top: 6px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9.5px;
  background: rgba(46,143,121,.14);
  color: var(--teal);
  padding: 2px 8px;
  border-radius: 20px;
}

.quick {
  display: flex;
  gap: 8px;
  padding: 10px 18px 4px;
}

.qbtn {
  flex: 1;
  text-align: center;
  padding: 10px 4px;
  background: var(--ink);
  color: var(--paper);
  border-radius: 11px;
  font-size: 10px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.qbtn:active {
  transform: scale(.96);
}

.navbar {
  display: flex;
  justify-content: space-around;
  padding: 10px 8px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line);
  background: #fff;
  flex-shrink: 0;
}

.navbar button {
  background: none;
  border: none;
  font-size: 9px;
  font-family: 'IBM Plex Mono', monospace;
  color: var(--ink-soft);
  text-align: center;
  cursor: pointer;
  padding: 2px 6px;
}

.navbar button.active {
  color: var(--amber-deep);
  font-weight: 600;
}

.navdot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  margin: 0 auto 4px;
}

.toggle2 {
  display: flex;
  gap: 10px;
  padding: 0 22px;
  margin-top: 14px;
}

.toggle2 button {
  flex: 1;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  text-align: center;
  padding: 14px 6px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  font-size: 13px;
  color: var(--ink-soft);
  background: #fff;
  cursor: pointer;
  transition: all .15s ease;
}

.toggle2 button.sel-off {
  border-color: var(--rust);
  background: rgba(216,87,42,.08);
  color: var(--rust);
}

.toggle2 button.sel-on {
  border-color: var(--amber-deep);
  background: rgba(242,169,59,.12);
  color: var(--amber-deep);
}

.info-strip {
  margin: 16px 22px 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(242,169,59,.12);
  border: 1px solid rgba(242,169,59,.4);
  font-size: 12px;
  color: var(--ink);
}

.info-strip b {
  display: block;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 15px;
  margin-bottom: 2px;
}

.chat-body {
  flex: 1;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  overflow-y: auto;
}

.bubble {
  max-width: 82%;
  padding: 10px 13px;
  border-radius: 14px;
  font-size: 12.5px;
  line-height: 1.5;
  animation: pop .22s ease;
}

@keyframes pop {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bubble.user {
  align-self: flex-end;
  background: var(--amber);
  color: var(--ink);
  border-bottom-right-radius: 4px;
  font-weight: 500;
}

.bubble.ai {
  align-self: flex-start;
  background: var(--paper-2);
  color: var(--ink);
  border-bottom-left-radius: 4px;
  border: 1px solid var(--line);
}

.bubble.ai .tag {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  color: var(--teal);
  margin-bottom: 4px;
  letter-spacing: .05em;
}

.typing {
  display: flex;
  gap: 4px;
  align-self: flex-start;
  background: var(--paper-2);
  border: 1px solid var(--line);
  padding: 10px 13px;
  border-radius: 14px;
  border-bottom-left-radius: 4px;
}

.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ink-soft);
  animation: blink 1.1s infinite ease-in-out;
}

.typing span:nth-child(2) {
  animation-delay: .15s;
}

.typing span:nth-child(3) {
  animation-delay: .3s;
}

@keyframes blink {
  0%,80%,100% {
    opacity: .25;
  }
  40% {
    opacity: 1;
  }
}

.chat-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 14px calc(12px + env(safe-area-inset-bottom));
  padding: 6px 6px 6px 14px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 20px;
  flex-shrink: 0;
}

.chat-input input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 12.5px;
  font-family: 'Inter', sans-serif;
  color: var(--ink);
  background: none;
}

.send {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--ink);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}

.chips {
  display: flex;
  gap: 6px;
  padding: 0 16px 8px;
  flex-wrap: wrap;
}

.chip {
  font-size: 10.5px;
  font-family: 'IBM Plex Mono', monospace;
  padding: 5px 10px;
  border-radius: 20px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink-soft);
  cursor: pointer;
}

.chip:hover {
  background: var(--paper-2);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 22px;
  border-bottom: 1px solid var(--line);
}

.setting-row span {
  font-size: 13px;
  color: var(--ink);
}

.switch {
  width: 38px;
  height: 22px;
  border-radius: 20px;
  background: var(--paper-2);
  position: relative;
  cursor: pointer;
  border: 1px solid var(--line);
  flex-shrink: 0;
}

.switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.25);
  transition: transform .2s ease;
}

.switch.on {
  background: var(--teal);
}

.switch.on::after {
  transform: translateX(16px);
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 22px 12px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--amber);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  color: var(--ink);
  flex-shrink: 0;
}

.profile-head b {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 15px;
  display: block;
  color: var(--ink);
}

.profile-head span {
  font-size: 11.5px;
  color: var(--ink-soft);
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%) translateY(20px);
  background: var(--ink);
  color: var(--paper);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 13px;
  padding: 11px 20px;
  border-radius: 30px;
  opacity: 0;
  pointer-events: none;
  transition: all .25s ease;
  z-index: 999;
  box-shadow: 0 10px 24px -8px rgba(0,0,0,.5);
  display: flex;
  align-items: center;
  gap: 8px;
}

.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@media (max-width:560px) {
  body {
    padding: 0;
    align-items: stretch;
  }

  .intro {
    display: none;
  }

  .phone {
    width: 100vw;
    height: 100dvh;
    border-radius: 0;
    padding: 0;
    box-shadow: none;
    background: var(--paper);
  }

  .notch {
    display: none;
  }

  .screen {
    border-radius: 0;
    height: 100%;
  }
}
`;

function App() {
  const [authScreen, setAuthScreen] = useState('welcome');
  const [loggedIn, setLoggedIn] = useState(false);

  const [username, setUsername] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [loginUsername, setLoginUsername] = useState('');

  const [electricityType, setElectricityType] = useState('Prepaid');
  const [location, setLocation] = useState('Lagos, Nigeria');
  const [budget, setBudget] = useState('15,000');

  const [currentPage, setCurrentPage] = useState('home');

  const [powerOn, setPowerOn] = useState(false);

  const [reportStatus, setReportStatus] = useState('off');
  const [reportTime, setReportTime] = useState('Today, 2:15 PM');

  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      type: 'ai',
      text: 'Hi Ade — ask me anything about your usage, costs, or outages.'
    }
  ]);

  const [typing, setTyping] = useState(false);

  const [settings, setSettings] = useState({
    outageAlerts: true,
    lowUnits: true,
    communityMap: false,
    dataSaver: false
  });

  const [topicCounters, setTopicCounters] = useState({});
  const [fallbackCounter, setFallbackCounter] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date());
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  const [clock, setClock] = useState(new Date());

  const displayName = (() => {
    const raw = username || signupUsername || loginUsername || 'Ade';

    const cleaned = raw
      .trim()
      .replace(/[_\.]+/g, ' ')
      .split(' ')[0];

    if (!cleaned) return 'Ade';

    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  })();

  const clockText = (() => {
    let h = clock.getHours() % 12;

    if (h === 0) h = 12;

    const m = clock.getMinutes().toString().padStart(2, '0');

    return `${h}:${m}`;
  })();

  const showToast = (message) => {
    setToast(message);
    setToastVisible(true);

    setTimeout(() => {
      setToastVisible(false);
    }, 2200);
  };

  const goToAuth = (screen) => {
    setAuthScreen(screen);
  };

  const completeAuth = (message, name) => {
    setUsername(name || 'Ade');
    setLoggedIn(true);
    showToast(`${message} ✓`);
  };

  const logout = () => {
    setLoggedIn(false);
    setAuthScreen('welcome');
    setCurrentPage('home');
    showToast('Logged out');
  };

  const togglePower = () => {
    const newStatus = !powerOn;

    setPowerOn(newStatus);
    setReportStatus(newStatus ? 'on' : 'off');

    showToast(
      newStatus
        ? 'Power back on ⚡'
        : 'Power outage detected'
    );
  };

  const saveReport = () => {
    setPowerOn(reportStatus === 'on');
    showToast('Outage report saved ✓');
  };

  const resetReport = () => {
    setReportTime('Today, 2:15 PM');
    setReportStatus('off');
    setPowerOn(false);
    showToast('Report reset');
  };

  const aiTopics = [
    {
      keywords: ['back', 'restor', 'return', 'when'],
      replies: [
        'Based on 12 past outages in this area around this time of day, power is likely back within 3.5 hours.',
        "Outages here usually last 2–4 hours around this time — you're about 90 minutes in, so it should clear soon."
      ]
    },
    {
      keywords: ['fast', 'finish', 'unit', 'usage', 'consum'],
      replies: [
        "Your fridge used more units than usual this month — about 18% above your average. That's the main driver.",
        'You used units about 22% faster than last month, mostly during the two longer outages when the fridge and inverter drew extra load.'
      ]
    },
    {
      keywords: ['cost', 'spend', 'budget', 'bill', 'price', 'money'],
      replies: [
        "You've spent ₦8,400 so far this month — about 56% of your ₦15,000 budget, with 9 days left.",
        "At your current pace you'll land close to ₦14,200 this month, just under budget."
      ]
    },
    {
      keywords: ['outage', 'off', 'light', 'power'],
      replies: [
        "You've had 4 outages this week, totaling about 9 hours — a bit above your usual weekly average.",
        "This area has had more outages than usual this week. I'll flag it if the pattern continues."
      ]
    },
    {
      keywords: ['hi', 'hello', 'hey'],
      replies: [
        'Hey! Ask me about your usage, spend, or outage history whenever you like.',
        'Hi there — happy to dig into your electricity data, just ask.'
      ]
    }
  ];

  const fallbackReplies = [
    "I don't have enough logged data yet to answer that precisely — the more you log, the sharper my answers get.",
    "That's a good question — I can answer it more accurately once there's a bit more usage history to go on.",
    "I can look into that once I have more logs to compare against — try asking about your units, cost, or outage history for now."
  ];

  const replyFor = (text) => {
    const lower = text.toLowerCase();

    for (let i = 0; i < aiTopics.length; i++) {
      const topic = aiTopics[i];

      const matched = topic.keywords.some(
        (keyword) => lower.includes(keyword)
      );

      if (matched) {
        const count = topicCounters[i] || 0;

        const reply =
          topic.replies[count % topic.replies.length];

        setTopicCounters((previous) => ({
          ...previous,
          [i]: count + 1
        }));

        return reply;
      }
    }

    const reply =
      fallbackReplies[
        fallbackCounter % fallbackReplies.length
      ];

    setFallbackCounter((previous) => previous + 1);

    return reply;
  };

  const sendChat = (textOverride) => {
    const text = (
      textOverride !== undefined
        ? textOverride
        : chatInput
    ).trim();

    if (!text) return;

    setChatMessages((messages) => [
      ...messages,
      {
        type: 'user',
        text
      }
    ]);

    setChatInput('');
    setTyping(true);

    setTimeout(() => {
      setTyping(false);

      setChatMessages((messages) => [
        ...messages,
        {
          type: 'ai',
          text: replyFor(text)
        }
      ]);
    }, 850);
  };

  const toggleSetting = (key) => {
    setSettings((previous) => ({
      ...previous,
      [key]: !previous[key]
    }));
  };

  const renderAuth = () => {
    if (authScreen === 'welcome') {
      return (
        <section className="scr active">
          <div className="center-body">

            <div className="dial">
              <div className="dial-inner">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 52 52"
                  fill="none"
                >
                  <path
                    d="M26 12c-7 0-11 5.5-11 11 0 4.6 2.6 7 4.4 9.3.9 1.1 1.3 2 1.3 3.2h10.6c0-1.2.4-2.1 1.3-3.2 1.8-2.3 4.4-4.7 4.4-9.3 0-5.5-4-11-11-11Z"
                    fill="#F2A93B"
                  />
                </svg>
              </div>
            </div>

            <h1>Welcome to Light Tracker</h1>

            <p>
              See how easy it is to stay ahead of every outage —
              let's get you set up.
            </p>

            <button
              className="btn"
              type="button"
              onClick={() => goToAuth('signup')}
            >
              Get started
            </button>

            <div className="link-row">
              Already have an account?{' '}
              <button
                className="link"
                type="button"
                onClick={() => goToAuth('login')}
              >
                Log in
              </button>
            </div>

          </div>
        </section>
      );
    }

    if (authScreen === 'signup') {
      return (
        <section className="scr active">

          <div className="scr-header">
            <h2>Create your account</h2>
            <span>Takes about a minute</span>
          </div>

          <div className="field">
            <label>Electricity type</label>

            <div className="segmented">
              {['Prepaid', 'Grid', 'Generator', 'Solar'].map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    className={
                      electricityType === type
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setElectricityType(type)
                    }
                  >
                    {type}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="field">
            <label>Location</label>

            <input
              className="input"
              value={location}
              onChange={(e) =>
                setLocation(e.target.value)
              }
              placeholder="e.g. Lagos, Nigeria"
            />
          </div>

          <div className="field">
            <label>Monthly budget (₦)</label>

            <input
              className="input"
              value={budget}
              onChange={(e) =>
                setBudget(e.target.value)
              }
              placeholder="15,000"
            />
          </div>

          <div className="field">
            <label>Username</label>

            <input
              className="input"
              value={signupUsername}
              onChange={(e) =>
                setSignupUsername(e.target.value)
              }
              placeholder="ade_j"
            />
          </div>

          <div className="field">
            <label>Password</label>

            <input
              className="input"
              type="password"
              placeholder="••••••••"
            />
          </div>

          <div className="actions">

            <button
              className="btn"
              type="button"
              onClick={() =>
                completeAuth(
                  'Account created',
                  signupUsername
                )
              }
            >
              Create account
            </button>

            <div className="link-row">
              Already have an account?{' '}
              <button
                className="link"
                type="button"
                onClick={() => goToAuth('login')}
              >
                Log in
              </button>
            </div>

          </div>

        </section>
      );
    }

    return (
      <section className="scr active">

        <div
          className="center-body"
          style={{
            justifyContent: 'flex-start',
            paddingTop: '56px'
          }}
        >

          <div
            className="dial"
            style={{
              width: '70px',
              height: '70px'
            }}
          >
            <div
              className="dial-inner"
              style={{
                width: '50px',
                height: '50px'
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 52 52"
                fill="none"
              >
                <path
                  d="M26 12c-7 0-11 5.5-11 11 0 4.6 2.6 7 4.4 9.3.9 1.1 1.3 2 1.3 3.2h10.6c0-1.2.4-2.1 1.3-3.2 1.8-2.3 4.4-4.7 4.4-9.3 0-5.5-4-11-11-11Z"
                  fill="#F2A93B"
                />
              </svg>
            </div>
          </div>

          <h1 style={{ fontSize: '19px' }}>
            Welcome back
          </h1>

          <p style={{ marginBottom: '4px' }}>
            Log in to see your live power status.
          </p>

        </div>

        <div className="field">
          <label>Username</label>

          <input
            className="input"
            value={loginUsername}
            onChange={(e) =>
              setLoginUsername(e.target.value)
            }
            placeholder="ade_j"
          />
        </div>

        <div className="field">
          <label>Password</label>

          <input
            className="input"
            type="password"
            placeholder="••••••••"
          />
        </div>

        <div className="actions">

          <button
            className="btn"
            type="button"
            onClick={() =>
              completeAuth(
                'Welcome back',
                loginUsername
              )
            }
          >
            Log in
          </button>

          <div className="link-row">
            New here?{' '}
            <button
              className="link"
              type="button"
              onClick={() => goToAuth('signup')}
            >
              Create an account
            </button>
          </div>

        </div>

      </section>
    );
  };

  const renderHome = () => (
    <section
      className={`page ${
        currentPage === 'home' ? 'active' : ''
      }`}
    >

      <div className="dash-top">

        <div className="greet">
          HELLO
        </div>

        <h2>
          {displayName} 👋
        </h2>

        <div
          className="status-row"
          onClick={togglePower}
        >

          <div
            className="status-ring"
            style={{
              background: powerOn
                ? 'conic-gradient(var(--amber) 0turn 1turn)'
                : 'conic-gradient(var(--rust) 0turn 1turn)',
              boxShadow: powerOn
                ? '0 0 0 5px rgba(242,169,59,0.22)'
                : '0 0 0 5px rgba(216,87,42,0.18)'
            }}
          >
            <div>
              {powerOn ? 'ON' : 'OFF'}
            </div>
          </div>

          <div className="status-text">

            <b>
              {powerOn
                ? 'Power is on'
                : 'Power is off'}
            </b>

            <span>
              {powerOn
                ? 'Steady for 3h 10m in Yaba'
                : 'Off for 1h 42m in Yaba'}
            </span>

          </div>

        </div>

        <div className="tap-hint">
          tap the status ring to simulate a change ↑
        </div>

      </div>

      <div className="cards">

        {!powerOn && (
          <div className="card">

            <div className="row1">
              <span>Est. restoration</span>
            </div>

            <div className="big">
              ~3.5 hrs
            </div>

            <div className="sub">
              Based on outage history for this area
            </div>

            <div className="confidence">
              12 past outages · high confidence
            </div>

          </div>
        )}

        <div className="card">

          <div className="row1">
            <span>Units remaining</span>
            <span>14 units</span>
          </div>

          <div className="bar">
            <div />
          </div>

          <div className="sub">
            ≈ 2 days left · last topped up Jul 21
          </div>

        </div>

      </div>

      <div className="quick">

        <button
          className="qbtn"
          type="button"
          onClick={() =>
            showToast('Redirecting to top-up…')
          }
        >
          Top up
        </button>

        <button
          className="qbtn"
          type="button"
          onClick={() => setCurrentPage('report')}
        >
          Report outage
        </button>

        <button
          className="qbtn"
          type="button"
          onClick={() => setCurrentPage('ai')}
        >
          Ask AI
        </button>

      </div>

    </section>
  );

  const renderReport = () => (
    <section
      className={`page ${
        currentPage === 'report' ? 'active' : ''
      }`}
    >

      <div className="scr-header">
        <h2>Report outage</h2>
        <span>
          Logs the time so we can learn your area's pattern
        </span>
      </div>

      <div className="toggle2">

        <button
          type="button"
          className={
            reportStatus === 'off'
              ? 'sel-off'
              : ''
          }
          onClick={() => {
            setReportStatus('off');
            setPowerOn(false);
          }}
        >
          Power OFF
        </button>

        <button
          type="button"
          className={
            reportStatus === 'on'
              ? 'sel-on'
              : ''
          }
          onClick={() => {
            setReportStatus('on');
            setPowerOn(true);
          }}
        >
          Power ON
        </button>

      </div>

      <div className="field">

        <label>Started at</label>

        <input
          className="input"
          value={reportTime}
          readOnly
        />

      </div>

      <div className="info-strip">

        <b>
          Average restoration: 3–4 hrs
        </b>

        Estimated from past outages logged for this area
        and time of day.

      </div>

      <div className="actions">

        <button
          className="btn"
          type="button"
          onClick={saveReport}
        >
          Save report
        </button>

        <button
          className="btn ghost small"
          type="button"
          onClick={resetReport}
        >
          Reset
        </button>

      </div>

    </section>
  );

  const renderAI = () => (
    <section
      className={`page ${
        currentPage === 'ai' ? 'active' : ''
      }`}
    >

      <div
        className="scr-header"
        style={{ paddingBottom: 0 }}
      >
        <h2>Ask Light Tracker</h2>
        <span>
          Ask anything about your electricity
        </span>
      </div>

      <div className="chips">

        <button
          className="chip"
          type="button"
          onClick={() =>
            sendChat(
              'Why did my units finish so fast this month?'
            )
          }
        >
          Why so fast this month?
        </button>

        <button
          className="chip"
          type="button"
          onClick={() =>
            sendChat(
              'When will power likely come back?'
            )
          }
        >
          When's power back?
        </button>

      </div>

      <div className="chat-body">

        {chatMessages.map((message, index) => (
          <div
            key={index}
            className={`bubble ${message.type}`}
          >

            {message.type === 'ai' && (
              <span className="tag">
                LIGHT TRACKER AI
              </span>
            )}

            {message.text}

          </div>
        ))}

        {typing && (
          <div className="typing">
            <span />
            <span />
            <span />
          </div>
        )}

      </div>

      <div className="chat-input">

        <input
          value={chatInput}
          onChange={(e) =>
            setChatInput(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              sendChat();
            }
          }}
          placeholder="Ask a question…"
        />

        <button
          className="send"
          type="button"
          onClick={() => sendChat()}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
          >
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
  );

  const renderSettings = () => (
    <section
      className={`page ${
        currentPage === 'settings' ? 'active' : ''
      }`}
    >

      <div className="scr-header">
        <h2>Settings</h2>
        <span>Profile and preferences</span>
      </div>

      <div className="profile-head">

        <div className="avatar">
          {displayName.charAt(0).toUpperCase()}
        </div>

        <div>
          <b>{displayName}</b>
          <span>
            Yaba, Lagos · {electricityType}
          </span>
        </div>

      </div>

      {[
        ['outageAlerts', 'Outage alerts'],
        ['lowUnits', 'Low-unit reminders'],
        ['communityMap', 'Community map'],
        ['dataSaver', 'Data-saver mode']
      ].map(([key, label]) => (
        <div
          className="setting-row"
          key={key}
        >

          <span>{label}</span>

          <div
            className={`switch ${
              settings[key] ? 'on' : ''
            }`}
            onClick={() => toggleSetting(key)}
          />

        </div>
      ))}

      <div className="actions">

        <button
          className="btn ghost small"
          type="button"
          onClick={logout}
        >
          Log out
        </button>

      </div>

    </section>
  );

  const renderApp = () => (
    <div
      className={`app-shell ${
        loggedIn ? 'active' : ''
      }`}
    >

      <div className="pages">

        {renderHome()}
        {renderReport()}
        {renderAI()}
        {renderSettings()}

      </div>

      <nav className="navbar">

        <button
          type="button"
          className={
            currentPage === 'home'
              ? 'active'
              : ''
          }
          onClick={() => setCurrentPage('home')}
        >
          <div className="navdot" />
          Home
        </button>

        <button
          type="button"
          className={
            currentPage === 'report'
              ? 'active'
              : ''
          }
          onClick={() => setCurrentPage('report')}
        >
          <div className="navdot" />
          Report
        </button>

        <button
          type="button"
          className={
            currentPage === 'ai'
              ? 'active'
              : ''
          }
          onClick={() => setCurrentPage('ai')}
        >
          <div className="navdot" />
          Ask AI
        </button>

        <button
          type="button"
          className={
            currentPage === 'settings'
              ? 'active'
              : ''
          }
          onClick={() =>
            setCurrentPage('settings')
          }
        >
          <div className="navdot" />
          Settings
        </button>

      </nav>

    </div>
  );

  return (
    <>
      <style>{styles}</style>

      <div className="intro">

        <div className="eyebrow">
          Light Tracker · interactive mockup
        </div>

        <h1>
          ⚡ Try the actual flow
        </h1>

        <p>
          Tap through onboarding, toggle the power status,
          log an outage, and chat with the AI assistant.
          Open this page on your phone for the full-screen
          app feel.
        </p>

        <div id="diag">
          ready — tap anything below
        </div>

      </div>

      <div className="phone">

        <div className="notch" />

        <div className="screen">

          <div className="statusbar">

            <span>
              {clockText}
            </span>

            <span>
              ●●● ᜀ 100%
            </span>

          </div>

          <div className="stack">

            {!loggedIn && renderAuth()}

            {loggedIn && renderApp()}

          </div>

        </div>

      </div>

      <div
        className={`toast ${
          toastVisible ? 'show' : ''
        }`}
      >
        {toast}
      </div>

    </>
  );
}

export default App;