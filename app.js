/* ================================================================
   DiskSense AI — app.js
   DataEngine · UIRenderer · AIAssistant · NavigationController
   ================================================================ */

'use strict';

// ═══════════════════════════════════════════════════════════════
//  DATA ENGINE  — Generates realistic simulated disk data
// ═══════════════════════════════════════════════════════════════
const DataEngine = (() => {

  const DRIVE_MODELS = {
    HDD: [
      { model: 'WDC WD10EZEX-08WN4A0', brand: 'Western Digital', interface: 'SATA III', rpm: 7200 },
      { model: 'Seagate ST2000DM008',  brand: 'Seagate',         interface: 'SATA III', rpm: 7200 },
      { model: 'Toshiba DT01ACA200',   brand: 'Toshiba',         interface: 'SATA III', rpm: 7200 },
    ],
    SSD: [
      { model: 'Samsung 870 EVO',      brand: 'Samsung',  interface: 'SATA III', rpm: null },
      { model: 'Crucial MX500',        brand: 'Crucial',  interface: 'SATA III', rpm: null },
      { model: 'Kingston A400',        brand: 'Kingston', interface: 'SATA III', rpm: null },
    ],
    NVMe: [
      { model: 'Samsung 980 PRO',      brand: 'Samsung',  interface: 'PCIe 4.0 NVMe', rpm: null },
      { model: 'WDC WDS100T3X0C',      brand: 'Western Digital', interface: 'PCIe 3.0 NVMe', rpm: null },
      { model: 'SK Hynix PC711',       brand: 'SK Hynix', interface: 'PCIe 3.0 NVMe', rpm: null },
    ],
  };

  const PARTITION_COLORS = ['#00d4ff','#a855f7','#10b981','#f59e0b','#ef4444','#8b5cf6'];

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randFloat(min, max, dp = 1) { return parseFloat((Math.random() * (max - min) + min).toFixed(dp)); }
  function pick(arr) { return arr[rand(0, arr.length - 1)]; }
  function serial() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    return Array.from({length: 12}, () => chars[rand(0, chars.length - 1)]).join('');
  }

  function generateTempHistory(baseTemp, days = 30) {
    const history = [];
    let t = baseTemp;
    for (let i = 0; i < days; i++) {
      t = Math.max(25, Math.min(62, t + randFloat(-2, 2)));
      history.push(parseFloat(t.toFixed(1)));
    }
    return history;
  }

  function generateSMART(type, healthScore) {
    const isBad = healthScore < 50;
    const isWorn = healthScore < 75;

    const base = [
      { id: '01', hex: '0x01', name: 'Read Error Rate',        value: isBad ? rand(60,85) : rand(95,100), worst: isBad ? rand(55,80) : rand(90,100), threshold: 51, raw: isBad ? rand(50,200) : rand(0,10),        critical: true  },
      { id: '03', hex: '0x03', name: 'Spin-Up Time',           value: rand(90,100),                      worst: rand(85,100),                        threshold: 21, raw: rand(150,300),                            critical: false },
      { id: '04', hex: '0x04', name: 'Start/Stop Count',       value: rand(90,100),                      worst: rand(90,100),                        threshold: 0,  raw: rand(500, 3000),                          critical: false },
      { id: '05', hex: '0x05', name: 'Reallocated Sectors',    value: isBad ? rand(40,70) : rand(95,100),worst: isBad ? rand(35,65) : rand(90,100),  threshold: 36, raw: isBad ? rand(5,50) : rand(0,2),          critical: true  },
      { id: '07', hex: '0x07', name: 'Seek Error Rate',        value: isWorn ? rand(70,90) : rand(92,100),worst: isWorn ? rand(65,88) : rand(88,100),threshold: 30, raw: isWorn ? rand(100,500) : rand(0,30),     critical: false },
      { id: '09', hex: '0x09', name: 'Power-On Hours',         value: rand(60,100),                      worst: rand(60,100),                        threshold: 0,  raw: rand(1000, 35000),                        critical: false },
      { id: '0A', hex: '0x0A', name: 'Spin Retry Count',       value: isBad ? rand(65,88) : rand(95,100),worst: isBad ? rand(60,85) : rand(90,100),  threshold: 97, raw: isBad ? rand(2,15) : 0,                  critical: true  },
      { id: '0C', hex: '0x0C', name: 'Power Cycle Count',      value: rand(90,100),                      worst: rand(90,100),                        threshold: 0,  raw: rand(200, 2500),                          critical: false },
      { id: 'B8', hex: '0xB8', name: 'End-to-End Error',       value: isBad ? rand(70,90) : rand(95,100),worst: isBad ? rand(65,88) : rand(90,100),  threshold: 0,  raw: isBad ? rand(1,10) : 0,                  critical: true  },
      { id: 'BB', hex: '0xBB', name: 'Uncorrectable Sectors',  value: isBad ? rand(50,80) : rand(95,100),worst: isBad ? rand(45,75) : rand(90,100),  threshold: 0,  raw: isBad ? rand(1,20) : 0,                  critical: true  },
      { id: 'BC', hex: '0xBC', name: 'Command Timeout',        value: isWorn ? rand(75,95) : rand(95,100),worst: isWorn ? rand(70,90) : rand(90,100), threshold: 0, raw: isWorn ? rand(5,50) : rand(0,3),         critical: false },
      { id: 'BE', hex: '0xBE', name: 'Airflow Temperature',    value: rand(45,80),                       worst: rand(35,65),                         threshold: 45, raw: rand(25,55),                              critical: false },
      { id: 'C0', hex: '0xC0', name: 'Unsafe Shutdown Count',  value: rand(85,100),                      worst: rand(85,100),                        threshold: 0,  raw: rand(10,200),                             critical: false },
      { id: 'C1', hex: '0xC1', name: 'Load Cycle Count',       value: isWorn ? rand(60,85) : rand(90,100),worst: isWorn ? rand(55,80) : rand(85,100), threshold: 0, raw: rand(5000, 300000),                      critical: false },
      { id: 'C5', hex: '0xC5', name: 'Current Pending Sectors',value: isBad ? rand(60,85) : rand(95,100),worst: isBad ? rand(55,80) : rand(90,100),  threshold: 0,  raw: isBad ? rand(2,30) : 0,                  critical: true  },
      { id: 'C6', hex: '0xC6', name: 'Offline Uncorrectable',  value: isBad ? rand(55,80) : rand(95,100),worst: isBad ? rand(50,75) : rand(90,100),  threshold: 0,  raw: isBad ? rand(1,15) : 0,                  critical: true  },
      { id: 'C7', hex: '0xC7', name: 'UltraDMA CRC Error',     value: rand(88,100),                      worst: rand(85,100),                        threshold: 0,  raw: rand(0, 20),                              critical: false },
      { id: 'C8', hex: '0xC8', name: 'Write Error Rate',       value: isBad ? rand(65,88) : rand(95,100),worst: isBad ? rand(60,85) : rand(90,100),  threshold: 0,  raw: isBad ? rand(10,100) : rand(0,5),        critical: false },
    ];

    // SSD / NVMe extras
    if (type === 'SSD' || type === 'NVMe') {
      base.push(
        { id: 'A9', hex: '0xA9', name: 'Remaining Life',        value: healthScore,                      worst: rand(50, healthScore), threshold: 10, raw: `${healthScore}%`,    critical: true  },
        { id: 'F1', hex: '0xF1', name: 'Total LBAs Written',    value: rand(60,100),                     worst: rand(55,95),           threshold: 0,  raw: `${rand(1,200)} TB`,  critical: false },
        { id: 'E1', hex: '0xE1', name: 'SATA Downshift Count',  value: rand(90,100),                     worst: rand(85,100),          threshold: 0,  raw: rand(0,5),            critical: false }
      );
      // remove HDD-only attrs
      return base.filter(a => !['03','07','0A','C1'].includes(a.id));
    }

    return base;
  }

  function generatePartitions(totalGB, type) {
    const partitions = [];
    let remaining = totalGB;
    const letters = ['C','D','E','F'];
    const fsMap = { HDD: 'NTFS', SSD: 'NTFS', NVMe: 'NTFS' };

    // System partition
    const sysSize = rand(80, 200);
    const sysUsed = rand(40, sysSize - 10);
    partitions.push({
      letter: 'C', label: 'System (OS)', filesystem: fsMap[type],
      total: sysSize, used: sysUsed, color: PARTITION_COLORS[0],
      type: 'System'
    });
    remaining -= sysSize;

    // Extra partitions
    const extras = rand(1, 3);
    for (let i = 0; i < extras && remaining > 30; i++) {
      const size = i === extras - 1 ? remaining - rand(5,10) : rand(30, Math.min(remaining - 30, 500));
      const used = rand(5, size - 5);
      partitions.push({
        letter: letters[i + 1], label: ['Data', 'Backup', 'Media', 'Work'][i] || 'Data',
        filesystem: pick(['NTFS','exFAT','FAT32']),
        total: size, used, color: PARTITION_COLORS[i + 1], type: 'Data'
      });
      remaining -= size;
    }

    return partitions;
  }

  function buildDisk(typeOverride = null) {
    const type = typeOverride || pick(['HDD','HDD','SSD','SSD','NVMe']);
    const profile = pick(DRIVE_MODELS[type]);
    const capacityGB = pick([256, 500, 512, 1000, 1024, 2000, 2048, 4000]);
    const healthScore = rand(35, 99);
    const baseTemp = type === 'NVMe' ? rand(38, 58) : rand(28, 52);
    const tempHistory = generateTempHistory(baseTemp);
    const currentTemp = tempHistory[tempHistory.length - 1];
    const powerOnHours = rand(500, 35000);

    const usedGB = rand(Math.floor(capacityGB * 0.15), Math.floor(capacityGB * 0.92));

    return {
      id: serial().substring(0, 6),
      type,
      model: profile.model,
      brand: profile.brand,
      interface: profile.interface,
      rpm: profile.rpm,
      firmware: `FW${rand(10,99)}.${rand(0,9)}`,
      serial: serial(),
      capacityGB,
      usedGB,
      freeGB: capacityGB - usedGB,
      healthScore,
      currentTemp,
      tempHistory,
      powerOnHours,
      powerCycleCount: rand(200, 2500),
      smartAttributes: generateSMART(type, healthScore),
      partitions: generatePartitions(capacityGB, type),
      lastScan: new Date(Date.now() - rand(0, 86400000 * 3)).toISOString(),
    };
  }

  // Multi-drive setup
  const _drives = [
    buildDisk('SSD'),
    buildDisk('HDD'),
    buildDisk('NVMe'),
  ];

  // Give them friendly drive names
  _drives[0].name = 'Primary SSD';
  _drives[1].name = 'Data HDD';
  _drives[2].name = 'NVMe System';

  let _active = 0;

  return {
    drives: _drives,
    get activeDrive() { return _drives[_active]; },
    get activeIndex() { return _active; },
    setActive(i) { _active = i; },
    refresh() {
      // Refresh active drive with slight data variation
      const d = _drives[_active];
      d.currentTemp = parseFloat((d.currentTemp + randFloat(-1.5, 1.5)).toFixed(1));
      d.tempHistory.push(d.currentTemp);
      d.tempHistory.shift();
    }
  };
})();


// ═══════════════════════════════════════════════════════════════
//  UI RENDERER — Populates DOM with disk data
// ═══════════════════════════════════════════════════════════════
const UIRenderer = (() => {

  function formatGB(gb) {
    if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
    return `${gb} GB`;
  }

  function healthClass(score) {
    if (score >= 80) return 'good';
    if (score >= 50) return 'warning';
    return 'danger';
  }

  function healthLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 65) return 'Fair';
    if (score >= 50) return 'Degraded';
    if (score >= 35) return 'Poor';
    return 'Critical';
  }

  function smartStatus(attr) {
    if (attr.value <= attr.threshold + 5) return 'critical';
    if (attr.value < 80 && attr.critical) return 'warning';
    if (attr.raw > 0 && attr.critical) return 'warning';
    return 'ok';
  }

  function tempColorVar(t) {
    if (t >= 55) return 'var(--danger)';
    if (t >= 45) return 'var(--warning)';
    return 'var(--accent)';
  }

  // ── Drive Selector Chips ──────────────────────────────────────
  function renderDriveSelector() {
    const el = document.getElementById('driveSelector');
    const colors = ['var(--accent)','var(--warning)','var(--purple)'];
    el.innerHTML = DataEngine.drives.map((d, i) => `
      <button class="drive-chip ${i === DataEngine.activeIndex ? 'active' : ''}"
              data-drive-index="${i}" aria-pressed="${i === DataEngine.activeIndex}">
        <span class="drive-chip-dot" style="background:${colors[i]}"></span>
        ${d.name}
      </button>
    `).join('');

    el.querySelectorAll('.drive-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        DataEngine.setActive(parseInt(btn.dataset.driveIndex));
        renderAll();
      });
    });
  }

  // ── Sidebar ───────────────────────────────────────────────────
  function renderSidebar() {
    const d = DataEngine.activeDrive;
    const pct = Math.round((d.usedGB / d.capacityGB) * 100);
    const hpct = d.healthScore;
    const scolor = pct > 90 ? 'var(--danger)' : pct > 75 ? 'var(--warning)' : 'var(--success)';
    const hcolor = hpct >= 80 ? 'var(--success)' : hpct >= 50 ? 'var(--warning)' : 'var(--danger)';

    document.getElementById('sidebarStorageBar').style.cssText = `width:${pct}%; background:${scolor}`;
    document.getElementById('sidebarHealthBar').style.cssText  = `width:${hpct}%; background:${hcolor}`;
    document.getElementById('sidebarStorageVal').textContent   = `${pct}%`;
    document.getElementById('sidebarHealthVal').textContent    = `${hpct}%`;
    document.getElementById('sidebarDiskLabel').textContent    = `${d.name} · ${d.type}`;

    // Nav badge
    const badge = document.getElementById('navHealthBadge');
    if (d.healthScore >= 80) {
      badge.textContent = 'OK';
      badge.setAttribute('class', 'nav-badge ok');
      badge.style.background = '';
    } else if (d.healthScore >= 50) {
      badge.textContent = 'WARN';
      badge.setAttribute('class', 'nav-badge');
      badge.style.background = 'var(--warning)';
    } else {
      badge.textContent = 'CRIT';
      badge.setAttribute('class', 'nav-badge');
      badge.style.background = 'var(--danger)';
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────
  function renderDashboard() {
    const d = DataEngine.activeDrive;
    const usedPct = Math.round((d.usedGB / d.capacityGB) * 100);
    const hc = healthClass(d.healthScore);
    const hl = healthLabel(d.healthScore);
    const lastScan = new Date(d.lastScan).toLocaleString();

    document.getElementById('dashSubtitle').textContent =
      `${d.brand} ${d.model} · ${d.type} · Last scan: ${lastScan}`;

    // Stats
    document.getElementById('statCapacity').textContent  = formatGB(d.capacityGB);
    document.getElementById('statFree').textContent      = `${formatGB(d.freeGB)} free (${100-usedPct}%)`;
    document.getElementById('statHealth').textContent    = `${d.healthScore}%`;
    document.getElementById('statHealthStatus').textContent = hl;

    const tempEl = document.getElementById('statTemp');
    tempEl.textContent = `${d.currentTemp}°C`;
    const tColor = d.currentTemp >= 55 ? 'danger' : d.currentTemp >= 45 ? 'warning' : 'accent';
    tempEl.className = `stat-value ${tColor}`;
    document.getElementById('statTempCard').className = `stat-card ${tColor}`;
    document.getElementById('statTempStatus').textContent = d.currentTemp >= 55 ? 'High — Check airflow' : d.currentTemp >= 45 ? 'Elevated' : 'Normal';

    const pohYears = (d.powerOnHours / 8760).toFixed(1);
    document.getElementById('statPOH').textContent   = d.powerOnHours.toLocaleString() + 'h';
    document.getElementById('statPOHSub').textContent = `≈ ${pohYears} years runtime`;

    // Health ring
    const ring = document.getElementById('healthRingFill');
    const circumference = 2 * Math.PI * 60; // 377
    const offset = circumference * (1 - d.healthScore / 100);
    ring.setAttribute('class', `ring-fill ${hc}`);
    setTimeout(() => { ring.style.strokeDashoffset = offset; }, 100);
    document.getElementById('ringScore').textContent = `${d.healthScore}%`;
    document.getElementById('ringScore').style.color =
      hc === 'good' ? 'var(--success)' : hc === 'warning' ? 'var(--warning)' : 'var(--danger)';

    // Info grid
    document.getElementById('infoDriveType').textContent  = d.type;
    document.getElementById('infoInterface').textContent  = d.interface;
    document.getElementById('infoModel').textContent      = d.model;
    document.getElementById('infoFirmware').textContent   = d.firmware;
    document.getElementById('infoSerial').textContent     = d.serial;
    const smartOk = d.smartAttributes.every(a => smartStatus(a) !== 'critical');
    document.getElementById('infoSmartStatus').innerHTML = smartOk
      ? `<span style="color:var(--success)">✅ PASSED</span>`
      : `<span style="color:var(--danger)">❌ FAILED</span>`;

    // Storage breakdown (partitions mini-view)
    const sb = document.getElementById('storageBreakdown');
    sb.innerHTML = d.partitions.map(p => {
      const pct = Math.round((p.used / p.total) * 100);
      const pColor = pct > 90 ? 'var(--danger)' : pct > 75 ? 'var(--warning)' : p.color;
      return `
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:13px;font-weight:600;">${p.letter}: ${p.label}</span>
            <span style="font-size:12px;color:var(--text-secondary);font-family:'JetBrains Mono',monospace;">${formatGB(p.used)} / ${formatGB(p.total)}</span>
          </div>
          <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${pColor};border-radius:4px;transition:width 1s ease;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px;">
            <span style="font-size:10px;color:var(--text-muted);">${p.filesystem} · ${p.type}</span>
            <span style="font-size:10px;color:${pColor};font-weight:700;">${pct}% used</span>
          </div>
        </div>
      `;
    }).join('');

    // Alerts
    renderDashAlerts(d);

    // Events log
    renderRecentEvents(d);
  }

  function renderDashAlerts(d) {
    const el = document.getElementById('dashAlert');
    const alerts = [];
    if (d.currentTemp >= 55) alerts.push({ type:'danger', icon:'🔥', title:'Critical Temperature', msg:`Disk running at ${d.currentTemp}°C — sustained high temps can cause hardware failure. Improve airflow immediately.` });
    else if (d.currentTemp >= 45) alerts.push({ type:'warning', icon:'🌡️', title:'Elevated Temperature', msg:`Disk at ${d.currentTemp}°C. Consider improving case ventilation.` });
    const usedPct = Math.round((d.usedGB / d.capacityGB) * 100);
    if (usedPct >= 90) alerts.push({ type:'danger', icon:'💾', title:'Storage Critical', msg:`Disk is ${usedPct}% full. System performance may degrade. Free up space immediately.` });
    else if (usedPct >= 80) alerts.push({ type:'warning', icon:'📊', title:'Low Storage Space', msg:`${usedPct}% storage used. Consider moving files or expanding storage.` });
    if (d.healthScore < 50) alerts.push({ type:'danger', icon:'❤️', title:'Critical Disk Health', msg:`Health score ${d.healthScore}% — backup your data NOW and plan for disk replacement.` });
    else if (d.healthScore < 70) alerts.push({ type:'warning', icon:'⚠️', title:'Degraded Disk Health', msg:`Health score ${d.healthScore}% — schedule a backup and monitor closely.` });

    if (alerts.length === 0) {
      el.style.display = 'none';
    } else {
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.gap = '8px';
      el.innerHTML = alerts.map(a => `
        <div class="alert-banner ${a.type}" role="alert">
          <span class="alert-banner-icon">${a.icon}</span>
          <div class="alert-banner-body">
            <div class="alert-banner-title">${a.title}</div>
            <div>${a.msg}</div>
          </div>
        </div>
      `).join('');
    }
  }

  function renderRecentEvents(d) {
    const events = [
      { time: 'Just now',   icon: '🔍', text: `SMART scan completed — ${d.smartAttributes.filter(a => smartStatus(a) !== 'ok').length} attribute(s) flagged` },
      { time: '2 hrs ago',  icon: '🌡️', text: `Peak temperature recorded: ${Math.max(...d.tempHistory.slice(-7)).toFixed(1)}°C` },
      { time: '6 hrs ago',  icon: '💾', text: `Drive accessed — ${Math.round(Math.random() * 50 + 10)} GB read/write operations` },
      { time: '1 day ago',  icon: '⚡', text: `System started — Power cycle count: ${d.powerCycleCount}` },
      { time: '2 days ago', icon: '📋', text: `Full diagnostic completed — Health: ${healthLabel(d.healthScore)}` },
    ];
    document.getElementById('recentEvents').innerHTML = events.map(e => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:18px;">${e.icon}</span>
        <div style="flex:1;font-size:13px;color:var(--text-secondary);">${e.text}</div>
        <span style="font-size:11px;color:var(--text-muted);white-space:nowrap;">${e.time}</span>
      </div>
    `).join('');
  }

  // ── SMART Page ────────────────────────────────────────────────
  function renderSmart() {
    const d = DataEngine.activeDrive;
    const tbody = document.getElementById('smartTableBody');

    tbody.innerHTML = d.smartAttributes.map(a => {
      const st = smartStatus(a);
      const trendPct = Math.round((a.value / 100) * 100);
      const badgeLabel = st === 'ok' ? '✓ OK' : st === 'warning' ? '⚠ Warning' : '✗ Critical';
      return `
        <tr>
          <td><span class="smart-id">${a.hex}</span></td>
          <td>
            <span class="smart-name">${a.name}</span>
            ${a.critical ? '<span style="font-size:10px;color:var(--danger);margin-left:6px;" title="Critical attribute">⚠</span>' : ''}
          </td>
          <td><span class="smart-val" style="color:${st === 'ok' ? 'var(--text-primary)' : st === 'warning' ? 'var(--warning)' : 'var(--danger)'}">${a.value}</span></td>
          <td><span class="smart-val" style="color:var(--text-muted)">${a.worst}</span></td>
          <td><span class="smart-val" style="color:var(--text-muted)">${a.threshold}</span></td>
          <td><span class="smart-raw">${a.raw}</span></td>
          <td>
            <div class="trend-bar"><div class="trend-bar-fill ${st}" style="width:${trendPct}%"></div></div>
          </td>
          <td><span class="smart-status-badge ${st}">${badgeLabel}</span></td>
        </tr>
      `;
    }).join('');

    // Glossary
    document.getElementById('smartGlossary').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div><strong style="color:var(--accent)">Value</strong> — Normalized 0–100 score (higher = better). Below threshold = failure.</div>
        <div><strong style="color:var(--accent)">Worst</strong> — Lowest value ever recorded for this attribute.</div>
        <div><strong style="color:var(--accent)">Threshold</strong> — Minimum acceptable value. Value ≤ threshold = prefailure.</div>
        <div><strong style="color:var(--accent)">Raw Value</strong> — Actual measured count or reading from drive hardware.</div>
        <div><strong style="color:var(--danger)">⚠ Critical</strong> — Attributes that directly predict imminent drive failure.</div>
      </div>
    `;

    // Key flags
    const flags = d.smartAttributes.filter(a => a.critical);
    document.getElementById('smartFlags').innerHTML = flags.map(a => {
      const st = smartStatus(a);
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
          <span class="smart-status-badge ${st}" style="flex-shrink:0;">${a.name}</span>
          <span style="color:var(--text-secondary);font-size:12px;">Raw: <strong>${a.raw}</strong></span>
          <span style="margin-left:auto;font-size:11px;color:${st === 'ok' ? 'var(--success)' : st === 'warning' ? 'var(--warning)' : 'var(--danger)'}">
            ${st === 'ok' ? 'Healthy' : st === 'warning' ? 'Monitor closely' : 'ATTENTION NEEDED'}
          </span>
        </div>
      `;
    }).join('');
  }

  // ── Partitions Page ───────────────────────────────────────────
  function renderPartitions() {
    const d = DataEngine.activeDrive;
    const total = d.partitions.reduce((s, p) => s + p.total, 0);

    // Partition bar
    document.getElementById('partitionBar').innerHTML = d.partitions.map(p => {
      const w = ((p.total / total) * 100).toFixed(1);
      const pct = Math.round((p.used / p.total) * 100);
      return `
        <div class="partition-segment" style="width:${w}%;background:${p.color};"
             title="${p.letter}: ${p.label} — ${formatGB(p.used)} / ${formatGB(p.total)} (${pct}%)" role="presentation">
          ${w > 10 ? p.letter + ':' : ''}
        </div>
      `;
    }).join('');

    // Partition list
    document.getElementById('partitionsList').innerHTML = d.partitions.map((p, i) => {
      const pct = Math.round((p.used / p.total) * 100);
      const pColor = pct > 90 ? 'var(--danger)' : pct > 75 ? 'var(--warning)' : p.color;
      const freePct = 100 - pct;
      return `
        <div class="partition-item">
          <div class="partition-drive-letter" style="background:${p.color}22;color:${p.color};">${p.letter}</div>
          <div class="partition-info">
            <div class="partition-name">${p.letter}: ${p.label}</div>
            <div class="partition-meta">${p.filesystem} · ${formatGB(p.total)} total · ${formatGB(p.total - p.used)} free (${freePct}%)</div>
          </div>
          <div class="partition-usage">
            <div class="partition-usage-val" style="color:${pColor}">${pct}%</div>
            <div class="partition-usage-bar">
              <div class="partition-usage-bar-fill" style="width:${pct}%;background:${pColor};"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Safe Practices
    const practices = d.type === 'HDD'
      ? ['Keep at least 15% free space for optimal performance','Avoid moving/resizing system partition while Windows is running','Use Disk Management for partition operations — not third-party tools','Back up data before any partition resize operation','Keep the MBR/GPT partition table intact — avoid dual-boot without planning','Run a chkdsk scan if you resize partitions on NTFS volumes']
      : ['Keep at least 10% free for write leveling and garbage collection','Do NOT defragment SSD/NVMe partitions — it wears NAND cells unnecessarily','NTFS is recommended for Windows system drives','Enable TRIM to allow the OS to notify the SSD of deleted blocks','Prefer GPT partition table over MBR for drives > 2 TB','Align partitions to 4KB boundaries for optimal SSD performance'];

    document.getElementById('partitionSafePractices').innerHTML =
      practices.map(p => `<div style="display:flex;gap:10px;margin-bottom:8px;"><span style="color:var(--accent);flex-shrink:0;">✓</span><span>${p}</span></div>`).join('');

    // Defrag / TRIM guide
    renderDefragTrimGuide(d.type);
  }

  function renderDefragTrimGuide(type) {
    const el = document.getElementById('defragTrimGuide');
    if (type === 'HDD') {
      el.innerHTML = `
        <div style="margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:20px;">🔧</span>
            <strong style="color:var(--accent);font-size:14px;">Defragmentation Recommended</strong>
          </div>
          <p style="margin-bottom:10px;">This is a <strong>Hard Disk Drive (HDD)</strong>. Files are physically scattered across spinning magnetic platters. Defragmentation rearranges fragmented files so the read head travels less distance.</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;gap:10px;"><span style="color:var(--success);">✓</span> Run monthly defragmentation for best performance</div>
          <div style="display:flex;gap:10px;"><span style="color:var(--success);">✓</span> Use Windows "Optimize Drives" (defragui.exe) built-in tool</div>
          <div style="display:flex;gap:10px;"><span style="color:var(--success);">✓</span> Run when disk usage is below 90%</div>
          <div style="display:flex;gap:10px;"><span style="color:var(--danger);">✗</span> Do NOT defragment during heavy I/O operations</div>
          <div style="display:flex;gap:10px;"><span style="color:var(--danger);">✗</span> Avoid defragging a degraded drive — risk of data loss</div>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div style="margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:20px;">⚡</span>
            <strong style="color:var(--purple);font-size:14px;">TRIM is Your Tool</strong>
          </div>
          <p style="margin-bottom:10px;">This is a <strong>${type}</strong>. SSDs have no moving parts — fragmentation is not a performance issue. Instead, use <strong>TRIM</strong> to help the controller manage deleted blocks efficiently.</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;gap:10px;"><span style="color:var(--success);">✓</span> TRIM runs automatically on Windows 7+ with AHCI/NVMe</div>
          <div style="display:flex;gap:10px;"><span style="color:var(--success);">✓</span> Verify with: <code style="background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:4px;font-size:11px;">fsutil behavior query DisableDeleteNotify</code></div>
          <div style="display:flex;gap:10px;"><span style="color:var(--success);">✓</span> "Optimize Drives" runs TRIM retrim on SSDs — safe to use</div>
          <div style="display:flex;gap:10px;"><span style="color:var(--danger);">✗</span> NEVER manually defragment an SSD — accelerates NAND wear</div>
          <div style="display:flex;gap:10px;"><span style="color:var(--danger);">✗</span> Do not use third-party defrag tools on SSDs</div>
        </div>
      `;
    }
  }

  // ── Temperature Page ──────────────────────────────────────────
  function renderTemperature() {
    const d = DataEngine.activeDrive;
    const temps = d.tempHistory;
    const minT = Math.min(...temps);
    const maxT = Math.max(...temps);

    document.getElementById('tempCurrent').textContent = `${d.currentTemp}°C`;
    document.getElementById('tempMin').textContent = `${minT.toFixed(1)}°C`;
    document.getElementById('tempMax').textContent = `${maxT.toFixed(1)}°C`;

    renderTempChart(temps, d.type);

    const status = d.currentTemp >= 55 ? 'critical' : d.currentTemp >= 45 ? 'elevated' : 'normal';
    const typeRange = d.type === 'NVMe' ? '0–70°C (optimal: 30–60°C)' : '0–60°C (optimal: 20–45°C)';
    document.getElementById('tempGuidance').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
        <div style="padding:10px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Safe Range (${d.type})</div>
          <div style="font-size:14px;font-weight:700;color:var(--accent)">${typeRange}</div>
        </div>
        <div style="padding:10px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Current Status</div>
          <div style="font-size:14px;font-weight:700;color:${status === 'critical' ? 'var(--danger)' : status === 'elevated' ? 'var(--warning)' : 'var(--success)'}">${status === 'critical' ? '🔥 Critical' : status === 'elevated' ? '⚠ Elevated' : '✅ Normal'}</div>
        </div>
      </div>
      ${[
        { icon:'💨', tip:'Ensure adequate case airflow with positive pressure fan configuration' },
        { icon:'🧹', tip:'Clean dust from heatsinks, fans, and drive bays every 6 months' },
        { icon:'🌡️', tip:'Ambient room temp above 30°C significantly raises drive temps' },
        { icon:'📌', tip:d.type === 'NVMe' ? 'NVMe M.2 drives may benefit from heatsink pads on the controller chip' : 'HDDs in hot environments benefit from active cooling' },
      ].map(t => `<div style="display:flex;gap:10px;margin-bottom:8px;"><span>${t.icon}</span><span>${t.tip}</span></div>`).join('')}
    `;
  }

  function renderTempChart(temps, type) {
    const canvas = document.getElementById('tempChart');
    const ctx = canvas.getContext('2d');
    const W = canvas.parentElement.clientWidth || 600;
    const H = 120;
    canvas.width = W;
    canvas.height = H;

    const pad = { l: 36, r: 10, t: 10, b: 24 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;
    const minY = Math.max(0, Math.min(...temps) - 5);
    const maxY = Math.max(...temps) + 8;

    const xScale = (i) => pad.l + (i / (temps.length - 1)) * chartW;
    const yScale = (v) => pad.t + chartH - ((v - minY) / (maxY - minY)) * chartH;

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (i / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      const val = (maxY - i * (maxY - minY) / 4).toFixed(0);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '10px Inter';
      ctx.fillText(`${val}°`, 0, y + 4);
    }

    // Safe limit line (55°C)
    const limitY = yScale(55);
    ctx.strokeStyle = 'rgba(239,68,68,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pad.l, limitY); ctx.lineTo(W - pad.r, limitY); ctx.stroke();
    ctx.setLineDash([]);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.t, 0, H);
    grad.addColorStop(0, 'rgba(0,212,255,0.3)');
    grad.addColorStop(1, 'rgba(0,212,255,0.02)');

    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(temps[0]));
    temps.forEach((t, i) => i > 0 && ctx.lineTo(xScale(i), yScale(t)));
    ctx.lineTo(xScale(temps.length - 1), H - pad.b);
    ctx.lineTo(xScale(0), H - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(temps[0]));
    temps.forEach((t, i) => i > 0 && ctx.lineTo(xScale(i), yScale(t)));
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Current dot
    ctx.beginPath();
    ctx.arc(xScale(temps.length - 1), yScale(temps[temps.length - 1]), 5, 0, Math.PI * 2);
    ctx.fillStyle = '#00d4ff';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // X-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '10px Inter';
    ['30d ago', '15d ago', 'Today'].forEach((label, i) => {
      ctx.fillText(label, xScale(Math.round(i * (temps.length - 1) / 2)) - 15, H - 4);
    });
  }

  // ── Health Page ───────────────────────────────────────────────
  function renderHealth() {
    const d = DataEngine.activeDrive;
    const hc = healthClass(d.healthScore);
    const hl = healthLabel(d.healthScore);
    const critAttrs = d.smartAttributes.filter(a => smartStatus(a) === 'critical');
    const warnAttrs = d.smartAttributes.filter(a => smartStatus(a) === 'warning');
    const usedPct = Math.round((d.usedGB / d.capacityGB) * 100);

    // Risk tier
    let riskTier, riskColor, riskIcon;
    if (d.healthScore < 40 || critAttrs.length >= 2) {
      riskTier = 'CRITICAL'; riskColor = 'var(--danger)'; riskIcon = '🔴';
    } else if (d.healthScore < 65 || critAttrs.length >= 1 || d.currentTemp >= 55) {
      riskTier = 'HIGH'; riskColor = 'var(--danger)'; riskIcon = '🟠';
    } else if (d.healthScore < 80 || warnAttrs.length >= 2 || d.currentTemp >= 45) {
      riskTier = 'MEDIUM'; riskColor = 'var(--warning)'; riskIcon = '🟡';
    } else {
      riskTier = 'LOW'; riskColor = 'var(--success)'; riskIcon = '🟢';
    }

    // Health alerts
    const alertsEl = document.getElementById('healthAlerts');
    alertsEl.innerHTML = '';
    if (riskTier === 'CRITICAL') {
      alertsEl.innerHTML = `<div class="alert-banner danger" role="alert"><span class="alert-banner-icon">🚨</span><div class="alert-banner-body"><div class="alert-banner-title">Immediate Action Required</div>Back up all critical data immediately. ${critAttrs.length} critical SMART attribute(s) are beyond threshold. Plan for drive replacement.</div></div>`;
    }

    // Risk assessment
    document.getElementById('riskAssessment').innerHTML = `
      <div style="text-align:center;padding:16px 0 20px;">
        <div style="font-size:48px;margin-bottom:8px;">${riskIcon}</div>
        <div style="font-size:24px;font-weight:800;color:${riskColor};margin-bottom:4px;">${riskTier} RISK</div>
        <div style="font-size:13px;color:var(--text-secondary);">Health: ${hl} (${d.healthScore}%)</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;">
        <div class="metric-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">
          <span style="color:var(--text-secondary)">Critical SMART flags</span>
          <span style="font-weight:700;color:${critAttrs.length > 0 ? 'var(--danger)' : 'var(--success)'}">${critAttrs.length}</span>
        </div>
        <div class="metric-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">
          <span style="color:var(--text-secondary)">Warning SMART flags</span>
          <span style="font-weight:700;color:${warnAttrs.length > 0 ? 'var(--warning)' : 'var(--success)'}">${warnAttrs.length}</span>
        </div>
        <div class="metric-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">
          <span style="color:var(--text-secondary)">Temperature</span>
          <span style="font-weight:700;color:${d.currentTemp >= 55 ? 'var(--danger)' : d.currentTemp >= 45 ? 'var(--warning)' : 'var(--success)'}">${d.currentTemp}°C</span>
        </div>
        <div class="metric-row" style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">
          <span style="color:var(--text-secondary)">Storage used</span>
          <span style="font-weight:700;color:${usedPct >= 90 ? 'var(--danger)' : usedPct >= 80 ? 'var(--warning)' : 'var(--text-primary)'}">${usedPct}%</span>
        </div>
        <div class="metric-row" style="display:flex;justify-content:space-between;padding:6px 0;">
          <span style="color:var(--text-secondary)">Power-on hours</span>
          <span style="font-weight:700;">${d.powerOnHours.toLocaleString()}h</span>
        </div>
      </div>
    `;

    // AI Recommendations
    document.getElementById('aiRecommendations').innerHTML =
      AIAssistant.buildHealthRecommendationHTML(d);

    // Metrics grid
    const metrics = [
      { label:'Health Score',   val:`${d.healthScore}%`,                    color: hc === 'good' ? 'var(--success)' : hc === 'warning' ? 'var(--warning)' : 'var(--danger)' },
      { label:'Temperature',    val:`${d.currentTemp}°C`,                   color: d.currentTemp >= 55 ? 'var(--danger)' : d.currentTemp >= 45 ? 'var(--warning)' : 'var(--accent)' },
      { label:'Storage Used',   val:`${usedPct}%`,                          color: usedPct >= 90 ? 'var(--danger)' : usedPct >= 80 ? 'var(--warning)' : 'var(--text-primary)' },
      { label:'Capacity',       val: formatGB(d.capacityGB),                color:'var(--accent)' },
      { label:'Free Space',     val: formatGB(d.freeGB),                    color:'var(--success)' },
      { label:'Power-On Hours', val: d.powerOnHours.toLocaleString() + 'h', color:'var(--purple)' },
      { label:'Drive Type',     val: d.type,                                color:'var(--accent)' },
      { label:'Interface',      val: d.interface,                           color:'var(--text-primary)' },
      { label:'SMART Passed',   val: critAttrs.length === 0 ? 'YES' : 'NO', color: critAttrs.length === 0 ? 'var(--success)' : 'var(--danger)' },
    ];

    document.getElementById('healthMetricsGrid').innerHTML = metrics.map(m => `
      <div style="padding:14px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">${m.label}</div>
        <div style="font-size:18px;font-weight:800;font-family:'JetBrains Mono',monospace;color:${m.color}">${m.val}</div>
      </div>
    `).join('');
  }

  // ── Optimizer Page ────────────────────────────────────────────
  function renderOptimizer() {
    const d = DataEngine.activeDrive;
    const usedPct = Math.round((d.usedGB / d.capacityGB) * 100);

    const tasks = [
      {
        icon: d.type === 'HDD' ? '🔧' : '⚡',
        title: d.type === 'HDD' ? 'Defragmentation' : 'TRIM Optimization',
        status: d.type === 'HDD' ? (d.healthScore > 60 ? 'Recommended' : 'Unsafe — Skip') : 'Optimal',
        color: d.type === 'HDD' ? (d.healthScore > 60 ? 'var(--warning)' : 'var(--danger)') : 'var(--success)',
        desc: d.type === 'HDD' ? 'Consolidates fragmented files for faster access' : 'TRIM keeps SSD cells clean for peak write performance',
      },
      {
        icon: '🧹', title: 'Disk Cleanup',
        status: usedPct > 75 ? 'Needed' : 'Optional',
        color: usedPct > 75 ? 'var(--warning)' : 'var(--text-muted)',
        desc: `${usedPct}% storage used. Removing temp files, recycle bin contents, and system logs can reclaim space.`,
      },
      {
        icon: '🛡️', title: 'CHKDSK Scan',
        status: d.healthScore < 70 ? 'Recommended' : 'Not Required',
        color: d.healthScore < 70 ? 'var(--warning)' : 'var(--success)',
        desc: 'Checks filesystem integrity and attempts to repair bad sectors.',
      },
      {
        icon: '💾', title: 'Backup',
        status: d.healthScore < 65 ? 'URGENT' : d.healthScore < 80 ? 'Recommended' : 'Up to date',
        color: d.healthScore < 65 ? 'var(--danger)' : d.healthScore < 80 ? 'var(--warning)' : 'var(--success)',
        desc: AIAssistant.getBackupFrequency(d),
      },
      {
        icon: '🔄', title: 'Firmware Update',
        status: 'Check Available',
        color: 'var(--accent)',
        desc: `Current firmware: ${d.firmware}. Manufacturer updates can fix bugs and improve performance.`,
      },
    ];

    document.getElementById('optimizerContent').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${tasks.map(t => `
          <div style="display:flex;align-items:center;gap:16px;padding:18px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);transition:var(--transition);"
               onmouseenter="this.style.background='var(--bg-card-hover)'" onmouseleave="this.style.background='var(--bg-card)'">
            <span style="font-size:28px;">${t.icon}</span>
            <div style="flex:1;">
              <div style="font-size:15px;font-weight:700;margin-bottom:4px;">${t.title}</div>
              <div style="font-size:12px;color:var(--text-secondary);">${t.desc}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <span style="font-size:12px;font-weight:700;color:${t.color};background:${t.color}22;padding:4px 12px;border-radius:20px;">${t.status}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ── Full render ───────────────────────────────────────────────
  function renderAll() {
    renderDriveSelector();
    renderSidebar();
    renderDashboard();
    renderSmart();
    renderPartitions();
    renderTemperature();
    renderHealth();
    renderOptimizer();
  }

  return { renderAll, renderTemperature, formatGB };
})();


// ═══════════════════════════════════════════════════════════════
//  AI ASSISTANT  — Context-aware disk health intelligence
// ═══════════════════════════════════════════════════════════════
const AIAssistant = (() => {

  // ── Context builder ───────────────────────────────────────────
  function getContext(drive) {
    const d = drive || DataEngine.activeDrive;
    const usedPct = Math.round((d.usedGB / d.capacityGB) * 100);
    const critAttrs  = d.smartAttributes.filter(a => {
      const v = a.value; const t = a.threshold;
      return a.critical && (v <= t + 5 || (typeof a.raw === 'number' && a.raw > 0 && v < 80));
    });
    const warnAttrs = d.smartAttributes.filter(a => {
      return !critAttrs.includes(a) && a.critical && a.value < 90;
    });
    let riskTier;
    if (d.healthScore < 40 || critAttrs.length >= 2) riskTier = 'CRITICAL';
    else if (d.healthScore < 65 || critAttrs.length >= 1 || d.currentTemp >= 55) riskTier = 'HIGH';
    else if (d.healthScore < 80 || warnAttrs.length >= 2 || d.currentTemp >= 45) riskTier = 'MEDIUM';
    else riskTier = 'LOW';
    return { d, usedPct, critAttrs, warnAttrs, riskTier };
  }

  // ── Health explanation ────────────────────────────────────────
  function explainHealth(ctx) {
    const { d, usedPct, critAttrs, warnAttrs, riskTier } = ctx;
    const hl = { 'CRITICAL':'critical concern', 'HIGH':'significant concern', 'MEDIUM':'moderate concern', 'LOW':'good condition' }[riskTier];

    let body = `Your <strong>${d.brand} ${d.type}</strong> (${d.model}) is currently in <strong>${hl}</strong> with a health score of <strong>${d.healthScore}%</strong>.\n\n`;

    body += `<h4>🔍 What This Means</h4>`;

    if (d.healthScore >= 90) {
      body += `This drive is operating excellently. SMART diagnostics show minimal wear and strong reliability metrics across all monitored attributes.`;
    } else if (d.healthScore >= 75) {
      body += `The drive is in good shape but shows minor signs of aging. This is normal for drives with ${d.powerOnHours.toLocaleString()} power-on hours. Continue regular monitoring.`;
    } else if (d.healthScore >= 60) {
      body += `The drive has experienced notable wear. ${critAttrs.length > 0 ? `${critAttrs.length} critical SMART attribute(s) are flagged: <strong>${critAttrs.map(a => a.name).join(', ')}</strong>.` : 'Some non-critical attributes show degradation.'} Begin planning for replacement.`;
    } else {
      body += `⚠️ This drive is significantly degraded. <strong>${critAttrs.length} critical SMART attribute(s) are beyond threshold</strong>: ${critAttrs.map(a => a.name).join(', ')}. Data loss risk is real. Immediate backup and replacement planning is essential.`;
    }

    body += `<h4>📊 Key Metrics</h4>`;
    body += `<div class="metric-row"><span class="metric-label">Temperature</span><span class="metric-val">${d.currentTemp}°C ${d.currentTemp >= 55 ? '🔥' : d.currentTemp >= 45 ? '⚠️' : '✅'}</span></div>`;
    body += `<div class="metric-row"><span class="metric-label">Storage Used</span><span class="metric-val">${usedPct}% (${UIRenderer.formatGB(d.usedGB)} / ${UIRenderer.formatGB(d.capacityGB)})</span></div>`;
    body += `<div class="metric-row"><span class="metric-label">Power-On Hours</span><span class="metric-val">${d.powerOnHours.toLocaleString()}h ≈ ${(d.powerOnHours/8760).toFixed(1)} yrs</span></div>`;
    body += `<div class="metric-row"><span class="metric-label">SMART Critical Flags</span><span class="metric-val">${critAttrs.length}</span></div>`;

    body += `<div class="disclaimer">ℹ️ SMART data provides predictive indicators only. A drive can fail without prior SMART warnings, or report warnings and continue operating. Always maintain backups regardless of health score.</div>`;
    return body;
  }

  // ── Risk prediction ───────────────────────────────────────────
  function predictRisks(ctx) {
    const { d, critAttrs, warnAttrs, riskTier } = ctx;

    const riskColors = { 'CRITICAL':'critical', 'HIGH':'critical', 'MEDIUM':'warn', 'LOW':'ok' };
    const riskDesc = {
      'CRITICAL': 'Failure is likely in the near term. Immediate action required.',
      'HIGH':     'Elevated failure probability. Schedule urgent backup and plan replacement.',
      'MEDIUM':   'Moderate risk. Monitor closely and back up data regularly.',
      'LOW':      'Low risk detected. Continue standard monitoring routines.',
    };

    let body = `<div style="margin-bottom:10px;">Risk assessment for your <strong>${d.type}</strong> drive:</div>`;
    body += `<div style="text-align:center;padding:12px;background:var(--bg-base);border-radius:8px;margin-bottom:12px;">`;
    body += `<span class="tag ${riskColors[riskTier]}" style="font-size:14px;padding:4px 14px;">⚡ ${riskTier} RISK</span>`;
    body += `<div style="font-size:12px;color:var(--text-secondary);margin-top:8px;">${riskDesc[riskTier]}</div>`;
    body += `</div>`;

    body += `<h4>⚠️ Risk Factors Detected</h4>`;
    const factors = [];

    if (critAttrs.length > 0) {
      factors.push({ level:'critical', text:`<strong>${critAttrs.length} critical SMART attribute(s)</strong> beyond threshold: ${critAttrs.map(a => a.name).join(', ')}` });
    }
    if (warnAttrs.length > 0) {
      factors.push({ level:'warn', text:`${warnAttrs.length} SMART attribute(s) showing degradation: ${warnAttrs.map(a => a.name).join(', ')}` });
    }
    if (d.currentTemp >= 55) {
      factors.push({ level:'critical', text:`Sustained high temperature (${d.currentTemp}°C) accelerates platters and NAND wear` });
    } else if (d.currentTemp >= 45) {
      factors.push({ level:'warn', text:`Elevated temperature (${d.currentTemp}°C) — above optimal range` });
    }
    if (d.powerOnHours > 25000) {
      factors.push({ level:'warn', text:`High runtime: ${d.powerOnHours.toLocaleString()} hours (${(d.powerOnHours/8760).toFixed(1)} years)` });
    }
    if (d.type === 'HDD') {
      const rs = d.smartAttributes.find(a => a.id === '05');
      if (rs && typeof rs.raw === 'number' && rs.raw > 0) {
        factors.push({ level:'critical', text:`Reallocated sectors: ${rs.raw} — physical platter damage detected` });
      }
    }

    if (factors.length === 0) {
      factors.push({ level:'ok', text:'No significant risk factors detected in current SMART data' });
    }

    body += factors.map(f => `<div style="display:flex;gap:8px;margin-bottom:8px;padding:8px;background:var(--bg-base);border-radius:6px;"><span class="tag ${f.level}" style="flex-shrink:0;margin-top:2px;">${f.level.toUpperCase()}</span><span style="font-size:12px;">${f.text}</span></div>`).join('');

    body += `<div class="disclaimer">⚡ Advisory only — SMART risk prediction has limitations. Drives can fail without warning, or continue operating despite warnings. This is not a guarantee of failure timing.</div>`;
    return body;
  }

  // ── Backup recommendations ────────────────────────────────────
  function backupFrequency(ctx) {
    const { d, riskTier } = ctx;
    const freq = getBackupFrequency(d);

    const strategies = {
      'CRITICAL': ['Immediately perform a full system backup', 'Use cloud backup (OneDrive, Google Drive, Backblaze) as a secondary layer', 'Clone the drive to a new drive using Macrium Reflect or Clonezilla NOW', 'Set up real-time sync for critical documents'],
      'HIGH':     ['Perform a full backup within 24 hours', 'Schedule daily incremental backups (Windows Backup or Veeam)', 'Keep 3 backup copies: local external drive, NAS, and cloud', 'Test backup restoration before assuming it works'],
      'MEDIUM':   ['Weekly full backups are recommended', 'Daily incremental backups for active work files', 'Maintain at least 2 backup copies (local + cloud)', 'Consider Windows File History for continuous document versioning'],
      'LOW':      ['Monthly full system image backup is sufficient', 'Weekly backup of personal files (documents, photos, etc.)', 'Cloud sync for active projects provides good daily protection', 'Review and test backup integrity quarterly'],
    };

    let body = `Based on your drive\'s health (<strong>${riskTier} risk</strong>), here is your recommended backup strategy:\n\n`;
    body += `<div style="text-align:center;margin-bottom:14px;">`;
    body += `<div style="font-size:28px;">💾</div>`;
    body += `<div style="font-size:16px;font-weight:700;color:var(--accent);margin:6px 0;">${freq}</div>`;
    body += `<div style="font-size:12px;color:var(--text-secondary);">Recommended backup frequency</div>`;
    body += `</div>`;

    body += `<h4>📋 Backup Strategy</h4>`;
    body += `<ul>` + (strategies[riskTier] || strategies['LOW']).map(s => `<li>${s}</li>`).join('') + `</ul>`;

    body += `<h4>🛠️ Recommended Tools</h4>`;
    const tools = d.type === 'HDD'
      ? ['<strong>Macrium Reflect Free</strong> — Full disk imaging', '<strong>Windows Backup</strong> — Built-in file history', '<strong>Backblaze</strong> — Cloud continuous backup', '<strong>Veeam Agent Free</strong> — System-level backup']
      : ['<strong>Macrium Reflect Free</strong> — Clone SSD to SSD', '<strong>Acronis True Image</strong> — Full system backup', '<strong>OneDrive / Google Drive</strong> — Real-time sync', '<strong>Veeam Agent Free</strong> — Incremental backups'];

    body += `<ul>` + tools.map(t => `<li>${t}</li>`).join('') + `</ul>`;
    return body;
  }

  function getBackupFrequency(d) {
    if (d.healthScore < 40)  return 'IMMEDIATELY — Do Not Wait';
    if (d.healthScore < 60)  return 'Daily backups critical';
    if (d.healthScore < 75)  return 'Every 2–3 days';
    if (d.healthScore < 85)  return 'Weekly recommended';
    return 'Monthly full + weekly incremental';
  }

  // ── Partition advice ──────────────────────────────────────────
  function partitionAdvice(ctx) {
    const { d } = ctx;
    const critParts = d.partitions.filter(p => (p.used / p.total) > 0.9);
    const warnParts = d.partitions.filter(p => (p.used / p.total) > 0.75 && (p.used / p.total) <= 0.9);

    let body = `Partition management guidance for your <strong>${d.type}</strong> drive:\n\n`;

    if (critParts.length > 0) {
      body += `<div class="alert-banner danger" style="margin-bottom:12px;border-radius:8px;"><span>⚠️</span><div><strong>Critical:</strong> Partition ${critParts.map(p => p.letter + ':').join(', ')} is nearly full (&gt;90%). This can cause system instability and write failures.</div></div>`;
    }

    body += `<h4>📂 Partition Summary</h4>`;
    body += d.partitions.map(p => {
      const pct = Math.round((p.used / p.total) * 100);
      const color = pct > 90 ? 'critical' : pct > 75 ? 'warn' : 'ok';
      return `<div class="metric-row"><span class="metric-label">${p.letter}: ${p.label}</span><span class="metric-val"><span class="tag ${color}">${pct}% used</span></span></div>`;
    }).join('');

    body += `<h4>🛡️ Safe Partition Practices</h4><ul>`;
    const tips = d.type === 'HDD'
      ? ['Maintain 15%+ free space on each partition for optimal HDD performance','Avoid resizing the active system (C:) partition while Windows is running','Always back up before partition resize operations','Use Windows Disk Management or a trusted tool like MiniTool Partition Wizard','Avoid having more than 4 primary partitions on MBR drives']
      : ['Keep 10%+ free on SSD partitions for wear leveling headroom','Do NOT defragment — TRIM handles block management automatically','Ensure TRIM is enabled: fsutil behavior query DisableDeleteNotify','NTFS with 4KB allocation units is optimal for Windows SSDs','Avoid frequent partition resize operations — each write cycle counts'];

    body += tips.map(t => `<li>${t}</li>`).join('') + `</ul>`;
    return body;
  }

  // ── Defrag / TRIM ─────────────────────────────────────────────
  function defragTrimGuide(ctx) {
    const { d } = ctx;
    const isHDD = d.type === 'HDD';

    let body = '';
    if (isHDD) {
      body = `Your drive is a <strong>Hard Disk Drive (HDD)</strong>. Here's everything you need to know about defragmentation:\n\n`;
      body += `<h4>🔧 What Is Defragmentation?</h4>`;
      body += `On a spinning HDD, files are stored in fragments scattered across magnetic platters. The read/write head must physically move to each fragment. <strong>Defragmentation rearranges these fragments</strong> so they are stored contiguously, reducing head travel time and improving performance.\n\n`;
      body += `<h4>✅ When To Defrag</h4><ul>`;
      body += `<li>Your drive is ${d.healthScore >= 70 ? '✅ healthy enough to defragment safely' : '⚠️ too degraded — defragging a failing drive can trigger further data loss'}</li>`;
      body += `<li>Defrag monthly as part of routine maintenance</li>`;
      body += `<li>Run when system is idle (overnight scheduling is ideal)</li>`;
      body += `<li>Only defrag if disk is &lt;90% full (you have ${100 - Math.round((d.usedGB / d.capacityGB) * 100)}% free)</li>`;
      body += `</ul>`;
      body += `<h4>🛑 Do NOT Defrag If</h4><ul>`;
      body += `<li>Health score is critically low (yours is ${d.healthScore}% — ${d.healthScore < 50 ? '⚠️ avoid defrag' : '✅ safe to proceed'})</li>`;
      body += `<li>SMART shows active reallocated or pending sectors</li>`;
      body += `<li>System is running low on battery (laptops)</li>`;
      body += `</ul>`;
      body += `<h4>🪟 How To Defrag on Windows</h4>`;
      body += `Search "Defragment and Optimize Drives" in Start Menu → Select drive → Click <strong>Optimize</strong>.`;
    } else {
      body = `Your drive is a <strong>${d.type}</strong>. Defragmentation is <strong>not just unnecessary — it's harmful</strong> for solid-state storage.\n\n`;
      body += `<h4>⚡ Why SSDs Don't Need Defrag</h4>`;
      body += `SSDs have no moving parts. All cells are accessed at equal speed regardless of physical location. Defragging only adds unnecessary write cycles, wearing out the NAND flash memory.\n\n`;
      body += `<h4>✅ Use TRIM Instead</h4>`;
      body += `<strong>TRIM</strong> tells the SSD controller which data blocks are no longer in use, allowing the drive to erase them in advance and maintain write performance.\n\n`;
      body += `<ul>`;
      body += `<li>TRIM runs automatically on Windows 7+ with AHCI/NVMe drivers</li>`;
      body += `<li>Verify: open Command Prompt as Admin → <code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;">fsutil behavior query DisableDeleteNotify</code></li>`;
      body += `<li>Result <strong>0</strong> = TRIM enabled ✅ | Result <strong>1</strong> = TRIM disabled ❌</li>`;
      body += `<li>Windows "Optimize Drives" runs a TRIM retrim on SSDs — this is safe and beneficial</li>`;
      body += `</ul>`;
      body += `<h4>📊 Your SSD Health</h4>`;
      const remaining = d.smartAttributes.find(a => a.id === 'A9');
      if (remaining) body += `Estimated remaining life: <strong style="color:var(--accent)">${remaining.raw}</strong>. `;
      body += `Drive has ${d.powerOnHours.toLocaleString()} power-on hours.`;
    }
    return body;
  }

  // ── Storage warnings ──────────────────────────────────────────
  function storageWarnings(ctx) {
    const { d, usedPct } = ctx;
    let body = '';

    if (usedPct < 75 && d.currentTemp < 45) {
      body = `✅ No storage warnings at this time. Drive is at <strong>${usedPct}% capacity</strong> and temperature is normal at <strong>${d.currentTemp}°C</strong>.\n\nKeep monitoring regularly and maintain good backup habits.`;
      return body;
    }

    body = `<h4>⚠️ Active Warnings</h4>`;
    if (usedPct >= 90) {
      body += `<div class="alert-banner danger" style="border-radius:8px;margin-bottom:10px;"><span>💾</span><div><strong>Storage Critical (${usedPct}% full):</strong> Immediate cleanup needed. System writes may fail when the disk becomes completely full, causing crashes or data corruption.</div></div>`;
    } else if (usedPct >= 80) {
      body += `<div class="alert-banner warning" style="border-radius:8px;margin-bottom:10px;"><span>📊</span><div><strong>Low Storage (${usedPct}% used):</strong> Performance may begin to degrade. ${d.type === 'SSD' ? 'SSDs need free space for wear leveling — performance drops significantly above 80%.' : 'HDDs need free space for defragmentation and temporary operations.'}</div></div>`;
    }
    if (d.currentTemp >= 55) {
      body += `<div class="alert-banner danger" style="border-radius:8px;margin-bottom:10px;"><span>🔥</span><div><strong>Temperature Critical (${d.currentTemp}°C):</strong> Sustained temps above 55°C degrade ${d.type === 'HDD' ? 'magnetic platters and bearings' : 'NAND cells and controller'}. Improve airflow immediately.</div></div>`;
    } else if (d.currentTemp >= 45) {
      body += `<div class="alert-banner warning" style="border-radius:8px;margin-bottom:10px;"><span>🌡️</span><div><strong>Elevated Temperature (${d.currentTemp}°C):</strong> Above recommended range. Clean dust, ensure adequate case airflow, and check fan operation.</div></div>`;
    }

    body += `<h4>💡 Recommended Actions</h4><ul>`;
    if (usedPct >= 80) {
      body += `<li>Run Disk Cleanup (cleanmgr.exe) to remove temporary files</li>`;
      body += `<li>Clear browser cache (can be several GB)</li>`;
      body += `<li>Move large files (videos, photos) to external storage</li>`;
      body += `<li>Uninstall unused applications via Settings → Apps</li>`;
    }
    if (d.currentTemp >= 45) {
      body += `<li>Clean dust from case fans and heatsinks</li>`;
      body += `<li>Ensure hot air exhausts properly from the case</li>`;
      body += `<li>Add additional case fans or reposition existing ones</li>`;
      if (d.type === 'NVMe') body += `<li>Install an M.2 heatsink on the NVMe drive</li>`;
    }
    body += `</ul>`;
    return body;
  }

  // ── Full health report ────────────────────────────────────────
  function generateReport(ctx) {
    const { d, usedPct, critAttrs, warnAttrs, riskTier } = ctx;
    const now = new Date().toLocaleString();
    const freq = getBackupFrequency(d);

    let body = `<strong style="font-size:14px;">📊 DiskSense AI — Health Report</strong>`;
    body += `<div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;">${now}</div>`;

    body += `<h4>📋 Drive Information</h4>`;
    body += `<div class="metric-row"><span class="metric-label">Model</span><span class="metric-val">${d.model}</span></div>`;
    body += `<div class="metric-row"><span class="metric-label">Type / Interface</span><span class="metric-val">${d.type} / ${d.interface}</span></div>`;
    body += `<div class="metric-row"><span class="metric-label">Serial</span><span class="metric-val">${d.serial}</span></div>`;
    body += `<div class="metric-row"><span class="metric-label">Capacity</span><span class="metric-val">${UIRenderer.formatGB(d.capacityGB)}</span></div>`;

    body += `<h4>❤️ Health Assessment</h4>`;
    const riskBadge = { 'CRITICAL':'critical','HIGH':'critical','MEDIUM':'warn','LOW':'ok' }[riskTier];
    body += `<div class="metric-row"><span class="metric-label">Health Score</span><span class="metric-val">${d.healthScore}%</span></div>`;
    body += `<div class="metric-row"><span class="metric-label">Risk Level</span><span class="metric-val"><span class="tag ${riskBadge}">${riskTier}</span></span></div>`;
    body += `<div class="metric-row"><span class="metric-label">SMART Status</span><span class="metric-val">${critAttrs.length === 0 ? '<span class="tag ok">PASSED</span>' : '<span class="tag critical">FAILED</span>'}</span></div>`;
    body += `<div class="metric-row"><span class="metric-label">Critical Flags</span><span class="metric-val">${critAttrs.length}</span></div>`;
    body += `<div class="metric-row"><span class="metric-label">Warning Flags</span><span class="metric-val">${warnAttrs.length}</span></div>`;

    body += `<h4>🌡️ Temperature & Storage</h4>`;
    body += `<div class="metric-row"><span class="metric-label">Current Temp</span><span class="metric-val">${d.currentTemp}°C ${d.currentTemp >= 55 ? '<span class="tag critical">HIGH</span>' : d.currentTemp >= 45 ? '<span class="tag warn">ELEVATED</span>' : '<span class="tag ok">NORMAL</span>'}</span></div>`;
    body += `<div class="metric-row"><span class="metric-label">Storage Used</span><span class="metric-val">${usedPct}% (${UIRenderer.formatGB(d.usedGB)} of ${UIRenderer.formatGB(d.capacityGB)})</span></div>`;
    body += `<div class="metric-row"><span class="metric-label">Free Space</span><span class="metric-val">${UIRenderer.formatGB(d.freeGB)}</span></div>`;
    body += `<div class="metric-row"><span class="metric-label">Power-On Hours</span><span class="metric-val">${d.powerOnHours.toLocaleString()}h</span></div>`;

    if (critAttrs.length > 0) {
      body += `<h4>🚨 Critical SMART Attributes</h4>`;
      body += `<ul>` + critAttrs.map(a => `<li><strong>${a.name}</strong> — Value: ${a.value}, Raw: ${a.raw}</li>`).join('') + `</ul>`;
    }

    body += `<h4>📌 Recommended Actions</h4><ul>`;
    if (riskTier === 'CRITICAL') body += `<li>⚡ <strong>Back up all data immediately</strong> — do not delay</li>`;
    if (riskTier === 'HIGH') body += `<li>Back up data within 24 hours</li>`;
    body += `<li>Backup frequency: <strong>${freq}</strong></li>`;
    body += `<li>${d.type === 'HDD' ? 'Run monthly defragmentation' : 'Ensure TRIM is enabled (fsutil behavior query DisableDeleteNotify = 0)'}</li>`;
    if (usedPct >= 80) body += `<li>Free up disk space — currently at ${usedPct}%</li>`;
    if (d.currentTemp >= 45) body += `<li>Improve system cooling — temperature is elevated</li>`;
    body += `<li>Rescan SMART data weekly to track trends</li>`;
    body += `</ul>`;

    body += `<div class="disclaimer">📋 Report generated by DiskSense AI at ${now}. This report is advisory only and should not replace professional data recovery advice for critical failures.</div>`;
    return body;
  }

  // ── Health recommendation HTML (for Health page) ──────────────
  function buildHealthRecommendationHTML(d) {
    const ctx = getContext(d);
    const { riskTier } = ctx;
    const recs = {
      'CRITICAL': ['🚨 Back up ALL data immediately — do not wait','Plan for immediate drive replacement','Do NOT run defragmentation on a failing drive','Contact data recovery professional if backup fails','Avoid powering the drive off and on repeatedly'],
      'HIGH':     ['💾 Perform full system backup within 24 hours','Monitor SMART attributes daily','Reduce drive temperature if above 50°C','Plan drive replacement within 1–3 months','Avoid writing large amounts of new data to the drive'],
      'MEDIUM':   ['📅 Schedule weekly backups','Monitor critical SMART attributes monthly','Ensure the drive is in a well-ventilated location','Consider cloning to a new drive within 6 months','Run CHKDSK to check for filesystem errors'],
      'LOW':      ['✅ Continue monthly full backup schedule','Run SMART diagnostics every 3 months','Keep firmware updated via manufacturer tool','Clean dust from case annually','Monitor temperature during summer months'],
    };

    return `<div style="display:flex;flex-direction:column;gap:8px;">` +
      (recs[riskTier] || recs['LOW']).map(r =>
        `<div style="display:flex;gap:10px;font-size:13px;"><span style="flex-shrink:0;">›</span><span>${r}</span></div>`
      ).join('') + `</div>`;
  }

  // ── Free-text keyword router ──────────────────────────────────
  function routeFreetextQuery(text) {
    const t = text.toLowerCase();
    const ctx = getContext();

    if (/health|status|condition|score|how.*(drive|disk|ssd|hdd)/.test(t)) return explainHealth(ctx);
    if (/risk|fail|predict|die|crash|danger|warn|bad sector|reallocat/.test(t)) return predictRisks(ctx);
    if (/backup|back.?up|restore|copy|protect|safe/.test(t)) return backupFrequency(ctx);
    if (/partition|volume|drive letter|filesystem|ntfs|fat|exfat|resize|shrink|extend/.test(t)) return partitionAdvice(ctx);
    if (/defrag|defragment|trim|fragm|optimize|ssd.*optim/.test(t)) return defragTrimGuide(ctx);
    if (/storage|space|full|capacity|free|disk.*space|low.*space/.test(t)) return storageWarnings(ctx);
    if (/report|summary|overview|diagnostic|full.*analysis|analyze/.test(t)) return generateReport(ctx);
    if (/temp|hot|cool|fan|airflow|thermal|heat/.test(t)) {
      const d = ctx.d;
      return `Your <strong>${d.type}</strong> is currently at <strong>${d.currentTemp}°C</strong>. ${d.currentTemp >= 55 ? '🔥 <strong>This is critically high.</strong> Improve airflow immediately.' : d.currentTemp >= 45 ? '⚠️ Temperature is elevated. Consider improving case ventilation.' : '✅ Temperature is within the normal operating range.'}\n\n<div class="metric-row"><span class="metric-label">30-day min</span><span class="metric-val">${Math.min(...d.tempHistory).toFixed(1)}°C</span></div><div class="metric-row"><span class="metric-label">30-day max</span><span class="metric-val">${Math.max(...d.tempHistory).toFixed(1)}°C</span></div><div class="metric-row"><span class="metric-label">Safe range (${d.type})</span><span class="metric-val">${d.type === 'NVMe' ? '0–70°C' : '0–55°C'}</span></div>`;
    }
    if (/smart|attribute|sector|error|pending|uncorrect/.test(t)) {
      const crit = ctx.critAttrs;
      return `Your drive has <strong>${ctx.d.smartAttributes.length} SMART attributes</strong> being monitored.\n\n<div class="metric-row"><span class="metric-label">Critical flags</span><span class="metric-val"><span class="tag ${crit.length > 0 ? 'critical' : 'ok'}">${crit.length}</span></span></div><div class="metric-row"><span class="metric-label">Warning flags</span><span class="metric-val"><span class="tag ${ctx.warnAttrs.length > 0 ? 'warn' : 'ok'}">${ctx.warnAttrs.length}</span></span></div>${crit.length > 0 ? '<h4>Critical Attributes</h4><ul>' + crit.map(a => `<li><strong>${a.name}</strong>: Value ${a.value}, Raw ${a.raw}</li>`).join('') + '</ul>' : '<div style="margin-top:8px;color:var(--success)">✅ No critical SMART attributes detected.</div>'}`;
    }

    // Fallback — general assistant response
    return `I can help you analyze your <strong>${ctx.d.type}</strong> disk. Try asking me:\n\n<ul><li>"Explain my disk health"</li><li>"What are the risks?"</li><li>"How often should I back up?"</li><li>"Should I defrag this drive?"</li><li>"Is my storage getting full?"</li><li>"Generate a full report"</li></ul>\n\nOr use the <strong>Quick Analysis</strong> buttons above for instant answers.`;
  }

  // ── Response dispatcher ───────────────────────────────────────
  function getResponse(promptKey, customText) {
    const ctx = getContext();
    switch (promptKey) {
      case 'explain-health':  return explainHealth(ctx);
      case 'predict-risks':   return predictRisks(ctx);
      case 'backup-freq':     return backupFrequency(ctx);
      case 'partition-mgmt':  return partitionAdvice(ctx);
      case 'defrag-trim':     return defragTrimGuide(ctx);
      case 'full-report':     return generateReport(ctx);
      case 'freetext':        return routeFreetextQuery(customText || '');
      default:                return `I didn\'t understand that query. Try one of the quick prompts above or rephrase your question.`;
    }
  }

  // ── Plain text report for download ───────────────────────────
  function generatePlainTextReport() {
    const ctx = getContext();
    const { d, usedPct, critAttrs, warnAttrs, riskTier } = ctx;
    const now = new Date().toLocaleString();
    const freq = getBackupFrequency(d);

    return [
      '═══════════════════════════════════════════',
      '  DiskSense AI — Hard Disk Health Report',
      `  Generated: ${now}`,
      '═══════════════════════════════════════════',
      '',
      '[ DRIVE INFORMATION ]',
      `  Model     : ${d.model}`,
      `  Type      : ${d.type}`,
      `  Interface : ${d.interface}`,
      `  Serial    : ${d.serial}`,
      `  Firmware  : ${d.firmware}`,
      `  Capacity  : ${UIRenderer.formatGB(d.capacityGB)}`,
      '',
      '[ HEALTH ASSESSMENT ]',
      `  Health Score  : ${d.healthScore}%`,
      `  Risk Level    : ${riskTier}`,
      `  SMART Status  : ${critAttrs.length === 0 ? 'PASSED' : 'FAILED'}`,
      `  Critical Flags: ${critAttrs.length}`,
      `  Warning Flags : ${warnAttrs.length}`,
      '',
      '[ TEMPERATURE & STORAGE ]',
      `  Current Temp  : ${d.currentTemp}°C`,
      `  Temp 30d Min  : ${Math.min(...d.tempHistory).toFixed(1)}°C`,
      `  Temp 30d Max  : ${Math.max(...d.tempHistory).toFixed(1)}°C`,
      `  Storage Used  : ${usedPct}% (${UIRenderer.formatGB(d.usedGB)} / ${UIRenderer.formatGB(d.capacityGB)})`,
      `  Free Space    : ${UIRenderer.formatGB(d.freeGB)}`,
      `  Power-On Hrs  : ${d.powerOnHours.toLocaleString()}h`,
      '',
      '[ SMART ATTRIBUTES ]',
      ...d.smartAttributes.map(a => {
        const st = a.value <= a.threshold + 5 ? 'CRITICAL' : (a.critical && a.value < 80) ? 'WARNING' : 'OK';
        return `  [${st.padEnd(8)}] ${a.name.padEnd(28)} Val:${String(a.value).padStart(4)} Raw:${String(a.raw).padStart(8)}`;
      }),
      '',
      '[ PARTITIONS ]',
      ...d.partitions.map(p => {
        const pct = Math.round((p.used / p.total) * 100);
        return `  ${p.letter}: ${p.label.padEnd(20)} ${UIRenderer.formatGB(p.used).padStart(8)} / ${UIRenderer.formatGB(p.total).padEnd(8)} (${pct}%)`;
      }),
      '',
      '[ RECOMMENDATIONS ]',
      `  Backup Frequency : ${freq}`,
      `  Optimization     : ${d.type === 'HDD' ? 'Defragmentation monthly' : 'TRIM (auto) — do NOT defragment'}`,
      critAttrs.length > 0 ? `  ⚠ CRITICAL: ${critAttrs.map(a => a.name).join(', ')}` : '  SMART: All critical attributes within range',
      '',
      '[ DISCLAIMER ]',
      '  This report is advisory only. SMART data provides predictive',
      '  indicators but cannot guarantee failure timing. Always maintain',
      '  regular backups regardless of drive health status.',
      '',
      '═══════════════════════════════════════════',
      '  DiskSense AI · disksense.ai',
      '═══════════════════════════════════════════',
    ].join('\n');
  }

  return {
    getResponse,
    generatePlainTextReport,
    buildHealthRecommendationHTML,
    getBackupFrequency,
  };
})();


// ═══════════════════════════════════════════════════════════════
//  NAVIGATION CONTROLLER
// ═══════════════════════════════════════════════════════════════
const NavigationController = (() => {
  const pages = ['dashboard','health','smart','partitions','temperature','optimizer'];

  function switchTo(pageId) {
    pages.forEach(id => {
      document.getElementById(`page-${id}`)?.classList.remove('active');
      document.getElementById(`nav-${id}`)?.classList.remove('active');
    });
    document.getElementById(`page-${pageId}`)?.classList.add('active');
    document.getElementById(`nav-${pageId}`)?.classList.add('active');
    // Re-render temp chart on resize when switching
    if (pageId === 'temperature') {
      setTimeout(() => UIRenderer.renderTemperature(), 50);
    }
  }

  function init() {
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        switchTo(el.dataset.page);
      });
    });
  }

  return { init, switchTo };
})();


// ═══════════════════════════════════════════════════════════════
//  CHAT CONTROLLER
// ═══════════════════════════════════════════════════════════════
const ChatController = (() => {
  let _busy = false;

  function formatTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function appendMsg(role, html) {
    const container = document.getElementById('aiChatMessages');

    // Remove welcome placeholder if present
    const welcome = container.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerHTML = html;

    const meta = document.createElement('div');
    meta.className = 'chat-meta';
    meta.innerHTML = `<span>${formatTime()}</span>`;

    if (role === 'ai') {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'chat-copy-btn';
      copyBtn.innerHTML = '📋';
      copyBtn.title = 'Copy to clipboard';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(bubble.innerText).then(() => {
          copyBtn.innerHTML = '✅';
          setTimeout(() => { copyBtn.innerHTML = '📋'; }, 1500);
        });
      });
      meta.appendChild(copyBtn);
    }

    div.appendChild(bubble);
    div.appendChild(meta);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return bubble;
  }

  function showTyping() {
    const container = document.getElementById('aiChatMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg ai';
    div.id = 'typingIndicator';
    div.innerHTML = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function hideTyping() {
    document.getElementById('typingIndicator')?.remove();
  }

  async function sendPrompt(promptKey, userText) {
    if (_busy) return;
    _busy = true;
    document.getElementById('chatSendBtn').disabled = true;

    const displayText = userText || {
      'explain-health': '🔍 Explain my disk health',
      'predict-risks':  '⚠️ Predict potential risks',
      'backup-freq':    '💾 Backup recommendations',
      'partition-mgmt': '🗂️ Partition management tips',
      'defrag-trim':    '🔧 Defrag vs TRIM guide',
      'full-report':    '📊 Generate full health report',
    }[promptKey] || userText;

    appendMsg('user', displayText);
    showTyping();

    // Simulate AI processing delay (0.6–1.4s)
    const delay = 600 + Math.random() * 800;
    await new Promise(r => setTimeout(r, delay));

    hideTyping();
    const response = AIAssistant.getResponse(promptKey, userText);
    appendMsg('ai', response);

    _busy = false;
    document.getElementById('chatSendBtn').disabled = false;
  }

  function init() {
    // Quick prompt buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => sendPrompt(btn.dataset.prompt));
    });

    // Send button
    document.getElementById('chatSendBtn').addEventListener('click', handleSend);

    // Enter key
    document.getElementById('chatInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // Auto-resize textarea
    document.getElementById('chatInput').addEventListener('input', (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
    });

    // Dashboard "Ask AI" button
    document.getElementById('dashAiBtn')?.addEventListener('click', () => {
      sendPrompt('explain-health');
      document.getElementById('aiChatMessages').scrollIntoView({ behavior: 'smooth' });
    });

    // Health page report button
    document.getElementById('healthReportBtn')?.addEventListener('click', () => {
      NavigationController.switchTo('dashboard');
      setTimeout(() => sendPrompt('full-report'), 100);
    });

    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
      DataEngine.refresh();
      UIRenderer.renderAll();
      appendMsg('ai', `🔄 Data refreshed for <strong>${DataEngine.activeDrive.name}</strong>. All metrics updated.`);
    });

    // Download report button
    document.getElementById('reportBtn')?.addEventListener('click', downloadReport);

    // Smart refresh
    document.getElementById('smartRefreshBtn')?.addEventListener('click', () => {
      DataEngine.refresh();
      UIRenderer.renderAll();
    });

    // Welcome message
    showWelcome();
  }

  function handleSend() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || _busy) return;
    input.value = '';
    input.style.height = 'auto';
    sendPrompt('freetext', text);
  }

  function showWelcome() {
    const d = DataEngine.activeDrive;
    const el = document.getElementById('aiChatMessages');
    el.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'chat-msg ai chat-welcome';
    div.innerHTML = `
      <div class="chat-bubble">
        👋 Hi! I'm <strong>DiskSense AI</strong>, your intelligent disk health assistant.
        <br><br>
        I've scanned your <strong>${d.name}</strong> (${d.type}) and found a health score of
        <strong style="color:${d.healthScore >= 80 ? 'var(--success)' : d.healthScore >= 60 ? 'var(--warning)' : 'var(--danger)'}">${d.healthScore}%</strong>.
        <br><br>
        Use the <strong>Quick Analysis</strong> buttons above for instant insights, or type your question below!
      </div>
      <div class="chat-meta"><span>${formatTime()}</span></div>
    `;
    el.appendChild(div);
  }

  function downloadReport() {
    const text = AIAssistant.generatePlainTextReport();
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `disksense-report-${DataEngine.activeDrive.name.replace(/\s+/g,'-').toLowerCase()}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return { init, sendPrompt, showWelcome };
})();


// ═══════════════════════════════════════════════════════════════
//  BOOT — Initialize everything
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  NavigationController.init();
  UIRenderer.renderAll();
  ChatController.init();

  // Update header time
  const headerStatus = document.getElementById('headerStatusText');
  function updateStatus() {
    const now = new Date();
    headerStatus.textContent = `Monitoring Active · ${now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  // Auto-refresh temperature chart on window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => UIRenderer.renderTemperature(), 200);
  });
});
