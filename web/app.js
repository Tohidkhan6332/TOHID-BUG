const view = document.getElementById("view");
const toast = document.getElementById("toast");
const sidebar = document.querySelector(".sidebar");

const pages = {
  overview: ["Overview","Your complete premium workspace.",`
    <div class="hero"><div><span class="eyebrow">TOHID PREMIUM</span><h1>Everything in one control center.</h1><p>Connect an account you own, manage your subscription, view sessions and keep your workspace in one place.</p><div class="hero-actions"><button class="primary" data-page="pair">Connect Account</button><button class="secondary" data-page="plans">View Plans</button></div></div><div class="hero-status"><span class="dot"></span><b>Website online</b><small>Public access • No login</small></div></div>
    <div class="stats-grid"><div class="stat-card"><span>Plan</span><strong>Free</strong><small>Upgrade when needed</small></div><div class="stat-card"><span>Connections</span><strong>0</strong><small>No active session</small></div><div class="stat-card"><span>Payments</span><strong>0</strong><small>No transactions</small></div><div class="stat-card"><span>Status</span><strong>Ready</strong><small>Panel is online</small></div></div>
    <div class="section-head"><div><h2>Quick actions</h2><p>Everything important is one click away.</p></div></div>
    <div class="action-grid"><button class="action-card" data-page="pair"><b>Connect Account</b><span>Start the authorized account connection flow.</span></button><button class="action-card" data-page="tutorial"><b>Setup Tutorial</b><span>See the complete setup process before connecting.</span></button><button class="action-card" data-page="plans"><b>Plans & Billing</b><span>Compare plans and subscription access.</span></button><button class="action-card" data-page="bots"><b>My Bots</b><span>View connected sessions and health.</span></button><button class="action-card" data-page="stats"><b>Statistics</b><span>Review workspace activity and health.</span></button><button class="action-card" data-page="community"><b>Community</b><span>Open the official channel, group and developer links.</span></button></div>`],
  pair: ["Connect Account","Connect an account you own or are explicitly authorized to manage.",`
    <div class="panel-card"><div class="panel-icon">⌁</div><div><h2>Account connection</h2><p>The website is ready for an authorized connection backend. Credentials and sessions must stay server-side.</p></div></div>
    <div class="form-card"><label>Account number</label><input id="number" inputmode="numeric" autocomplete="tel" placeholder="Country code + number"><button class="primary" id="pairBtn">Start Connection</button><div class="notice">This panel intentionally does not expose credentials or abuse/disruption controls. A production connection endpoint must be supplied by the compliant backend.</div></div>`],
  tutorial: ["Tutorial","Simple setup from purchase to connected workspace.",`
    <div class="tutorial-grid"><div class="panel-card"><div class="panel-icon">1</div><div><h2>Choose a plan</h2><p>Select the subscription that matches your legitimate automation needs.</p></div></div><div class="panel-card"><div class="panel-icon">2</div><div><h2>Complete payment</h2><p>Checkout is verified server-side before premium access is activated.</p></div></div><div class="panel-card"><div class="panel-icon">3</div><div><h2>Connect your account</h2><p>Use the authorized account connection flow and keep the session under your control.</p></div></div><div class="panel-card"><div class="panel-icon">4</div><div><h2>Manage from My Bots</h2><p>Monitor status, reconnect and review workspace health from the dashboard.</p></div></div></div>
    <div class="notice">For live checkout and connection, the website needs the owner's payment-gateway account and a persistent, compliant backend service.</div>`],
  plans: ["Plans & Billing","Choose the workspace plan that fits your usage.",`
    <div class="plans-grid"><div class="plan-card"><span>Starter</span><strong>Free</strong><p>Basic dashboard access and workspace status.</p><button class="secondary" data-plan="Starter">Selected</button></div><div class="plan-card featured"><span>Premium</span><strong>$5</strong><small>/ 30 days</small><p>Expanded legitimate automation workspace features.</p><button class="primary" data-plan="Premium">Choose Premium</button></div><div class="plan-card"><span>Long Term</span><strong>$10</strong><small>/ 90 days</small><p>Longer workspace access for regular usage.</p><button class="secondary" data-plan="Long Term">Choose Long Term</button></div></div>
    <div class="notice">Prices shown here are the current website UI values. Real checkout requires your payment provider credentials and server-side verification.</div>`],
  bots: ["My Bots","Connected automation sessions and health.",`
    <div class="empty-state"><div class="empty-icon">◌</div><h2>No connected bots</h2><p>Once the authorized backend connection is configured, connected sessions will appear here with status and controls.</p><button class="primary" data-page="pair">Connect Account</button></div>`],
  payments: ["Payments","Subscription and transaction history.",`
    <div class="empty-state"><div class="empty-icon">₹</div><h2>No payments yet</h2><p>Verified orders will appear here after a payment gateway is connected.</p><button class="secondary" data-page="plans">View Plans</button></div>`],
  stats: ["Statistics","Workspace health and usage overview.",`
    <div class="stats-grid"><div class="stat-card"><span>Active sessions</span><strong>0</strong><small>Currently connected</small></div><div class="stat-card"><span>Messages</span><strong>0</strong><small>Workspace activity</small></div><div class="stat-card"><span>Uptime</span><strong>—</strong><small>Awaiting backend</small></div><div class="stat-card"><span>Errors</span><strong>0</strong><small>Recorded by panel</small></div></div>`],
  community: ["Community","Official links and support.",`
    <div class="action-grid"><a class="action-card link-card" href="https://t.me/TohidAi_bot" target="_blank" rel="noopener"><b>Telegram Bot ↗</b><span>Open the official Telegram bot.</span></a><a class="action-card link-card" href="https://t.me/Tohidkhan6332" target="_blank" rel="noopener"><b>Developer ↗</b><span>Contact the developer.</span></a><a class="action-card link-card" href="https://whatsapp.com/channel/0029VaGyP933bbVC7G0x0i2T" target="_blank" rel="noopener"><b>WhatsApp Channel ↗</b><span>Open the official channel.</span></a><a class="action-card link-card" href="https://chat.whatsapp.com/ITblBs2YNMqBYh9klfDLud" target="_blank" rel="noopener"><b>WhatsApp Group ↗</b><span>Open the community group.</span></a></div>`]
};

function notify(message){if(!toast)return;toast.textContent=message;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2400)}
function closeMobileMenu(){sidebar?.classList.remove("open")}
function render(page="overview"){
  const data=pages[page]||pages.overview;
  document.querySelectorAll(".nav").forEach(el=>el.classList.toggle("active",el.dataset.page===page));
  document.getElementById("title")?.replaceChildren(document.createTextNode(data[0]));
  view.innerHTML=`<div class="page-heading"><div><h1>${data[0]}</h1><p>${data[1]}</p></div></div>${data[2]}`;
  history.replaceState(null,"","#"+page);closeMobileMenu();
}
document.addEventListener("click",event=>{
  if(event.target.closest("#menuBtn")){sidebar?.classList.toggle("open");return}
  const nav=event.target.closest("[data-page]");if(nav){render(nav.dataset.page);return}
  const plan=event.target.closest("[data-plan]");if(plan){notify(plan.dataset.plan+" selected — live checkout needs payment-gateway configuration.");return}
  if(event.target.id==="pairBtn"){const number=document.getElementById("number")?.value.trim();notify(number?"Connection backend is not configured yet.":"Enter an account number first.")}
});
window.addEventListener("hashchange",()=>render(location.hash.slice(1)||"overview"));
render(location.hash.slice(1)||"overview");