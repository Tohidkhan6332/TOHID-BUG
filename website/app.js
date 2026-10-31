(() => {
  const $ = (selector) => document.querySelector(selector);

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || `Request failed (${response.status})`);
    return payload;
  }

  function showResult(element, message, isError = false) {
    if (!element) return;
    element.classList.toggle('error', isError);
    element.innerHTML = `<p>${String(message).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char])}</p>`;
  }

  function renderPlans(plans) {
    const container = $('#pricing-grid');
    if (!container) return;
    container.innerHTML = plans.map((plan) => `
      <article class="card pricing-card ${plan.popular ? 'popular' : ''}">
        ${plan.popular ? '<span class="popular-badge">Most Popular</span>' : ''}
        <h3>${plan.name}</h3>
        <div class="price">${plan.price}<small> / ${plan.duration}</small></div>
        <p>${plan.description}</p>
        <ul>${(plan.features || []).map((feature) => `<li>${feature}</li>`).join('')}</ul>
        <a class="btn btn-primary full-width" href="#pairing">Choose ${plan.name}</a>
      </article>
    `).join('');
  }

  function renderApprovedUsers(users) {
    const container = $('#approvedUsers');
    if (!container) return;
    if (!users.length) {
      container.innerHTML = '<p>No approved users yet.</p>';
      return;
    }
    container.innerHTML = users.map((user) => `
      <div class="list-row"><strong>${user.number}</strong><span>${user.plan} · ${user.status}</span></div>
    `).join('');
  }

  async function loadDashboard() {
    try {
      const [plans, approved] = await Promise.all([
        requestJson('/api/plans'),
        requestJson('/api/approved-users')
      ]);
      renderPlans(plans.plans || []);
      renderApprovedUsers(approved.users || []);
      const users = $('#hero-users');
      if (users) users.textContent = String((approved.users || []).length);
    } catch (error) {
      console.error('[WEBSITE] Dashboard load failed:', error);
      const pricing = $('#pricing-grid');
      if (pricing) pricing.innerHTML = '<p>Plans are temporarily unavailable. Please refresh.</p>';
    }
  }

  $('#pairing-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const result = $('#pairingResult');
    const number = $('#numberInput')?.value.trim();
    const customCode = $('#codeInput')?.value.trim();
    showResult(result, 'Starting pairing request...');
    try {
      const payload = await requestJson('/api/pair', {
        method: 'POST',
        body: JSON.stringify({ number, customCode })
      });
      showResult(result, `Pairing status: ${payload.status || 'started'}${payload.code ? ` · Code: ${payload.code}` : ''}`);
    } catch (error) {
      showResult(result, error.message, true);
    }
  });

  $('#approval-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const result = $('#approvalResult');
    showResult(result, 'Saving approval...');
    try {
      const payload = await requestJson('/api/manual-approve', {
        method: 'POST',
        body: JSON.stringify({
          number: $('#approveNumber')?.value.trim(),
          plan: $('#approvePlan')?.value,
          note: $('#approveNote')?.value.trim()
        })
      });
      showResult(result, payload.message || 'User approved successfully.');
      await loadDashboard();
    } catch (error) {
      showResult(result, error.message, true);
    }
  });

  $('#year') && ($('#year').textContent = new Date().getFullYear());
  loadDashboard();
})();
