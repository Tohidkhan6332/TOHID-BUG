const view = document.getElementById("view");
const toast = document.getElementById("toast");

const pages = {
  overview: ["Overview", "Manage your bot workspace from one place.", `
    <div class="hero"><div><span class="eyebrow">TOHID PREMIUM</span><h1>Your bot workspace, simplified.</h1><p>Monitor your automation workspace, plans and connection status from one clean dashboard.</p><div class="hero-actions"><button class="primary" data-page="pair">Connect WhatsApp</button><button class="secondary" data-page="plans">View Plans</button></div></div><div class="hero-status"><span class="dot"></span><b>Web panel ready</b><small>Public access • No login</small></div></div>
    <div class="stats-grid"><div class="stat-card"><span>Plan</span><strong>Free</strong><small>Upgrade when needed</small></div><div class="stat-card"><span>Connections</span><strong>0</strong><small>No active workspace</small></div><div class="stat-card"><span>Payments</span><strong>0</strong><small>No transactions</small></div><div class="stat-card"><span>Status</span><strong>Ready</strong><small>Panel is online</small></div></div>
    <div class="section-head"><div><h2>Quick actions</h2><p>Start with the task you need.</p></div></div>
    <div class="action-grid"><button class="action-card" data-page="pair"><b>Connect WhatsApp</b><span>Connect an account you own or are authorized to manage.</span></button><button class="action-card" data-page="plans"><b>Plans & Billing</b><span>Review available workspace plans.</span></button><button class="action-card" data-page="bots"><b>My Bots</b><span>See connected sessions and status.</span></button></div>`],
  pair: ["Connect WhatsApp", "Connect an account you own or are authorized to manage.", `
    <div class="panel-card"><div class="panel-icon">⌁</div><div><h2>WhatsApp connection</h2><p>Use the connection flow for your own account. A separate website login is not required.</p></div></div>
    <div class="form-card"><label>WhatsApp number</label><input id="number" inputmode="numeric" placeholder="Country code + number"><button class="primary" id="pairBtn">Continue</button><div class="notice">Only connect accounts you own or have explicit permission to manage.</div></div>`],
  plans: ["Plans & Billing", "Choose the workspace plan that fits your usage.", `
    <div class="plans-grid"><div class="plan-card"><span>Starter</span><strong>Free</strong><p>Basic dashboard access and workspace status.</p><button class="secondary" data-plan="Starter">Current plan</button></div><div class="plan-card featured"><span>Premium</span><strong>$5</strong><small>/ 30 days</small><p>Expanded legitimate automation workspace features.</p><button class="primary" data-plan="Premium">Select plan</button></div><div class="plan-card"><span>Long Term</span><strong>$10</strong><small>/ 90 days</small><p>Longer workspace access for regular usage.</p><button class="secondary" data-plan="Long Term">Select plan</button></div></div>
    <div class="notice">Billing can be connected later to a compliant payment provider.</div>`],
  bots: ["My Bots", "Your connected automation sessions.", `<div class="empty-state"><div class="empty-icon">◌</div><h2>No connected bots</h2><p>Connect your own WhatsApp account to create a legitimate automation session.</p><button class="primary" data-page="pair">Connect WhatsApp</button></div>`],
  payments: ["Payments", "Subscription and transaction history.", `<div class="empty-state"><div class="empty-icon">₹</div><h2>No payments yet</h2><p>Your payment history will appear here after compliant billing is connected.</p><button class="secondary" data-page="plans">View Plans</button></div>`],
  stats: ["Statistics", "Workspace health and usage overview.", `
    <div class="stats-grid"><div class="stat-card"><span>Active sessions</span><strong>0</strong><small>Currently connected</small></div><div class="stat-card"><span>Messages</span><strong>0</strong><small>Workspace activity</small></div><div class="stat-card"><span>Uptime</span><strong>—</strong><small>Awaiting connection</small></div><div class="stat-card"><span>Errors</span><strong>0</strong><small>Recorded by panel</small></div></div>`]
};

function notify(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

function render(page = "overview") {
  const data = pages[page] || pages.overview;
  document.querySelectorAll(".nav").forEach(el => el.classList.toggle("active", el.dataset.page === page));
  document.getElementById("title")?.replaceChildren(document.createTextNode(data[0]));
  view.innerHTML = `<div class="page-heading"><div><h1>${data[0]}</h1><p>${data[1]}</p></div></div>${data[2]}`;
  history.replaceState(null, "", "#" + page);
}

document.addEventListener("click", event => {
  const nav = event.target.closest("[data-page]");
  if (nav) return render(nav.dataset.page);
  const plan = event.target.closest("[data-plan]");
  if (plan) notify(plan.dataset.plan + " selected — billing integration can be added later.");
  if (event.target.id === "pairBtn") {
    const number = document.getElementById("number")?.value.trim();
    notify(number ? "Connection flow is ready for a compliant backend." : "Enter a WhatsApp number first.");
  }
});

window.addEventListener("hashchange", () => render(location.hash.slice(1) || "overview"));
render(location.hash.slice(1) || "overview");