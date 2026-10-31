const yearNode = document.getElementById('year');
if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

async function loadPlans() {
  const pricingGrid = document.getElementById('pricing-grid');
  if (!pricingGrid) return;

  try {
    const response = await fetch('/api/plans');
    const data = await response.json();

    pricingGrid.innerHTML = (data.plans || []).map((plan) => `
      <article class="card pricing-card ${plan.popular ? 'featured' : ''}">
        <div class="pricing-top">
          <span class="plan-badge">${plan.popular ? 'Most Popular' : 'Standard'}</span>
          <h3>${plan.name}</h3>
          <div class="price-row">
            <span class="price">${plan.price}</span>
            <span class="duration">/${plan.duration}</span>
          </div>
        </div>

        <p>${plan.description}</p>

        <ul>
          ${(plan.features || []).map((feature) => `<li>✓ ${feature}</li>`).join('')}
        </ul>

        <button class="btn ${plan.popular ? 'btn-primary' : 'btn-secondary'} full-width" type="button">
          Choose ${plan.name}
        </button>
      </article>
    `).join('');
  } catch (error) {
    pricingGrid.innerHTML = `
      <div class="card error-card">
        <p>Unable to load plans right now.</p>
      </div>
    `;
  }
}

async function handlePairingSubmit(event) {
  event.preventDefault();
  const numberInput = document.getElementById('numberInput');
  const codeInput = document.getElementById('codeInput');
  const resultBox = document.getElementById('pairingResult');

  if (!numberInput || !resultBox) return;

  const payload = {
    number: numberInput.value.trim(),
    customCode: codeInput.value.trim()
  };

  resultBox.innerHTML = '<p>Starting pairing flow...</p>';

  try {
    const response = await fetch('/api/pair', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      resultBox.innerHTML = `<p class="error">${data.message || 'Something went wrong.'}</p>`;
      return;
    }

    resultBox.innerHTML = `
      <div class="pair-code-box">
        <span class="pair-label">Pairing Code</span>
        <strong>${data.code}</strong>
        <p>${data.message}</p>
      </div>
    `;
  } catch (error) {
    resultBox.innerHTML = '<p class="error">Failed to begin pairing workflow.</p>';
  }
}

function initPairingForm() {
  const form = document.getElementById('pairing-form');
  if (form) {
    form.addEventListener('submit', handlePairingSubmit);
  }
}

loadPlans();
initPairingForm();
