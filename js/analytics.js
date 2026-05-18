/* ========================================
   Analytics Module
   ======================================== */
const Analytics = {

  async getCategoryBreakdown() {
    const items = await Wardrobe.getAllItems();
    const counts = {};
    items.forEach(i => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return counts;
  },

  async getColorBreakdown() {
    const items = await Wardrobe.getAllItems();
    const counts = {};
    items.forEach(i => {
      const c = i.color || 'Unspecified';
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  },

  async getSeasonBreakdown() {
    const items = await Wardrobe.getAllItems();
    const counts = {};
    items.forEach(i => {
      counts[i.season] = (counts[i.season] || 0) + 1;
    });
    return counts;
  },

  async getMostWorn(limit = 5) {
    const items = await Wardrobe.getAllItems();
    return items
      .filter(i => i.wearCount > 0)
      .sort((a, b) => b.wearCount - a.wearCount)
      .slice(0, limit);
  },

  async getLeastWorn(limit = 5) {
    const items = await Wardrobe.getAllItems();
    return items
      .sort((a, b) => (a.wearCount || 0) - (b.wearCount || 0))
      .slice(0, limit);
  },

  async getUsageTrends() {
    const logs = await DB.getAllByIndex('usageLogs', 'userId', Auth.getUserId());
    const monthly = {};

    logs.forEach(log => {
      const date = new Date(log.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = (monthly[key] || 0) + 1;
    });

    // Get last 6 months
    const result = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
      result.push({ month: label, count: monthly[key] || 0 });
    }

    return result;
  },

  async getStats() {
    const items = await Wardrobe.getAllItems();
    const outfits = await Outfits.getAll();
    const totalWears = items.reduce((sum, i) => sum + (i.wearCount || 0), 0);
    const favorites = items.filter(i => i.favorite).length;

    return {
      totalItems: items.length,
      totalOutfits: outfits.length,
      totalWears,
      favorites
    };
  },

  renderPage() {
    return `
      <div class="page-header">
        <h1>Analytics</h1>
      </div>

      <div class="stats-grid" id="analytics-stats"></div>

      <div class="analytics-grid" id="analytics-charts"></div>
    `;
  },

  async render() {
    // Stats
    const statsEl = document.getElementById('analytics-stats');
    const chartsEl = document.getElementById('analytics-charts');
    if (!statsEl || !chartsEl) return;

    const stats = await this.getStats();

    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon" style="background:rgba(108,92,231,0.12);color:var(--accent-primary);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46L16.01 2H8L3.62 3.46A2 2 0 0 0 2 5.34V21a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5.34a2 2 0 0 0-1.62-1.88z"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
        </div>
        <div class="stat-card-value">${stats.totalItems}</div>
        <div class="stat-card-label">Total Items</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:rgba(0,206,201,0.12);color:var(--accent-secondary);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/></svg>
        </div>
        <div class="stat-card-value">${stats.totalOutfits}</div>
        <div class="stat-card-label">Saved Outfits</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:rgba(253,121,168,0.12);color:var(--accent-pink);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        </div>
        <div class="stat-card-value">${stats.totalWears}</div>
        <div class="stat-card-label">Total Wears</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:rgba(253,203,110,0.15);color:var(--accent-orange);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </div>
        <div class="stat-card-value">${stats.favorites}</div>
        <div class="stat-card-label">Favorites</div>
      </div>
    `;

    // Charts
    const [categories, colors, seasons, mostWorn, leastWorn, trends] = await Promise.all([
      this.getCategoryBreakdown(),
      this.getColorBreakdown(),
      this.getSeasonBreakdown(),
      this.getMostWorn(),
      this.getLeastWorn(),
      this.getUsageTrends()
    ]);

    chartsEl.innerHTML = `
      <!-- Category Breakdown -->
      <div class="chart-container">
        <h3>Category Breakdown</h3>
        <div class="bar-chart">
          ${this._renderBarChart(categories)}
        </div>
      </div>

      <!-- Color Distribution -->
      <div class="chart-container">
        <h3>Color Distribution</h3>
        <div class="bar-chart">
          ${this._renderBarChart(colors)}
        </div>
      </div>

      <!-- Season Distribution -->
      <div class="chart-container">
        <h3>Season Distribution</h3>
        <div class="bar-chart">
          ${this._renderBarChart(seasons)}
        </div>
      </div>

      <!-- Usage Trends -->
      <div class="chart-container">
        <h3>Usage Trends (Last 6 Months)</h3>
        <div class="bar-chart">
          ${trends.map(t => {
            const maxCount = Math.max(...trends.map(x => x.count), 1);
            const pct = (t.count / maxCount) * 100;
            return `
              <div class="bar-row">
                <div class="bar-label">${t.month}</div>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${Math.max(pct, 2)}%;background:var(--gradient-warm);">${t.count}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Most Worn -->
      <div class="chart-container">
        <h3>Most Worn Items</h3>
        ${mostWorn.length === 0
          ? '<p style="color:var(--text-muted);font-size:0.85rem;">No wear data yet. Log wears to see trends!</p>'
          : `<div class="most-worn-list">
              ${mostWorn.map(item => `
                <div class="most-worn-item">
                  ${item.image
                    ? `<img src="${item.image}" alt="${item.name}">`
                    : `<div class="most-worn-item-placeholder">${Wardrobe.categoryEmoji[item.category] || '👕'}</div>`
                  }
                  <div class="most-worn-info">
                    <div class="most-worn-name">${Wardrobe._escapeHtml(item.name)}</div>
                    <div class="most-worn-count">${item.wearCount} wears</div>
                  </div>
                </div>
              `).join('')}
            </div>`
        }
      </div>

      <!-- Least Worn -->
      <div class="chart-container">
        <h3>Least Worn Items</h3>
        ${leastWorn.length === 0
          ? '<p style="color:var(--text-muted);font-size:0.85rem;">No items in wardrobe yet.</p>'
          : `<div class="most-worn-list">
              ${leastWorn.map(item => `
                <div class="most-worn-item">
                  ${item.image
                    ? `<img src="${item.image}" alt="${item.name}">`
                    : `<div class="most-worn-item-placeholder">${Wardrobe.categoryEmoji[item.category] || '👕'}</div>`
                  }
                  <div class="most-worn-info">
                    <div class="most-worn-name">${Wardrobe._escapeHtml(item.name)}</div>
                    <div class="most-worn-count">${item.wearCount || 0} wears${item.lastWorn ? ' • Last: ' + new Date(item.lastWorn).toLocaleDateString() : ' • Never worn'}</div>
                  </div>
                </div>
              `).join('')}
            </div>`
        }
      </div>
    `;
  },

  _renderBarChart(data) {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return '<p style="color:var(--text-muted);font-size:0.85rem;">No data yet</p>';

    const max = Math.max(...entries.map(e => e[1]), 1);
    const gradients = [
      'var(--gradient-primary)',
      'linear-gradient(135deg, #00CEC9, #55EFC4)',
      'linear-gradient(135deg, #FD79A8, #FDCB6E)',
      'linear-gradient(135deg, #6C5CE7, #FD79A8)',
      'linear-gradient(135deg, #FDCB6E, #FF6B6B)'
    ];

    return entries.map(([label, count], idx) => {
      const pct = (count / max) * 100;
      return `
        <div class="bar-row">
          <div class="bar-label">${label}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${Math.max(pct, 4)}%;background:${gradients[idx % gradients.length]};">${count}</div>
          </div>
        </div>
      `;
    }).join('');
  }
};
