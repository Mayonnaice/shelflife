// ── 保质岛 App ────────────────────────────────────────────
(function() {
  'use strict';

  var STATE = {
    tab: 'home',
    invFilter: 'all',
    invSearch: '',
    editingId: null
  };

  var GREETINGS = [
    '今天也要好好整理哦~',
    '检查一下库存吧！',
    '先进先出，不浪费~',
    '保质岛欢迎你回来！',
    '来看看有什么快到期了~'
  ];

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function catById(id) {
    return CATEGORIES.find(function(c) { return c.id === id; }) || CATEGORIES[CATEGORIES.length - 1];
  }

  function locById(id) {
    return LOCATIONS.find(function(l) { return l.id === id; }) || LOCATIONS[LOCATIONS.length - 1];
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  // ── Toast ─────────────────────────────────────────────
  function showToast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._t);
    el._t = setTimeout(function() { el.classList.add('hidden'); }, 2000);
  }

  // ── Custom Confirm ────────────────────────────────────
  function showConfirm(msg, icon, onOk, isDanger) {
    var overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = '<div class="confirm-box">'
      + '<div class="confirm-icon">' + (icon || '🍃') + '</div>'
      + '<div class="confirm-msg">' + msg + '</div>'
      + '<div class="confirm-btns">'
      + '<button class="confirm-cancel">取消</button>'
      + '<button class="' + (isDanger ? 'confirm-danger' : 'confirm-ok') + '">' + (isDanger ? '确认删除' : '确认') + '</button>'
      + '</div></div>';
    document.getElementById('app').appendChild(overlay);

    overlay.querySelector('.confirm-cancel').addEventListener('click', function() { overlay.remove(); });
    overlay.querySelector('.' + (isDanger ? 'confirm-danger' : 'confirm-ok')).addEventListener('click', function() {
      overlay.remove();
      if (onOk) onOk();
    });
  }

  // ── Tab Switching ─────────────────────────────────────
  function switchTab(tab) {
    STATE.tab = tab;
    document.querySelectorAll('.tab-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    ['home', 'inventory', 'add', 'settings'].forEach(function(v) {
      document.getElementById('view-' + v).classList.toggle('hidden', v !== tab);
    });
    render();
    document.querySelector('.main-content').scrollTop = 0;
  }

  function render() {
    updateBadge();
    switch(STATE.tab) {
      case 'home': renderHome(); break;
      case 'inventory': renderInventory(); break;
      case 'add': renderAdd(); break;
      case 'settings': renderSettings(); break;
    }
  }

  function updateBadge() {
    var count = Storage.getUrgentCount();
    var badge = document.getElementById('bell-badge');
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // ── HOME VIEW ─────────────────────────────────────────
  function renderHome() {
    var el = document.getElementById('view-home');
    var items = Storage.getActiveItems();
    var settings = Storage.getSettings();
    var fifoIds = Storage.getFIFOItems(items);

    var expired = [];
    var urgent = [];
    var soon = [];
    var safe = [];

    items.forEach(function(item) {
      var d = Storage.daysUntilExpiry(item);
      item._days = d;
      if (d < 0) expired.push(item);
      else if (d <= 3) urgent.push(item);
      else if (d <= 7) soon.push(item);
      else safe.push(item);
    });

    expired.sort(function(a,b) { return a._days - b._days; });
    urgent.sort(function(a,b) { return a._days - b._days; });
    soon.sort(function(a,b) { return a._days - b._days; });

    var fifoItems = items.filter(function(it) { return fifoIds[it.id]; });
    fifoItems.sort(function(a,b) { return a._days - b._days; });

    var greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    var totalItems = items.length;
    var urgentCount = expired.length + urgent.length;

    var html = '';

    // Greeting card
    html += '<div class="greeting-card">'
      + '<div class="greeting-text">' + greeting + '</div>'
      + '<div class="greeting-stats">'
      + '<div class="greeting-stat"><div class="greeting-stat-num">' + totalItems + '</div><div class="greeting-stat-label">件物品在管</div></div>'
      + '<div class="greeting-stat"><div class="greeting-stat-num">' + urgentCount + '</div><div class="greeting-stat-label">件需要注意</div></div>'
      + '</div></div>';

    // Alert banner for expired
    if (expired.length > 0) {
      html += '<div class="alert-banner">'
        + '<div class="alert-icon">⚠️</div>'
        + '<div class="alert-text">'
        + '<div class="alert-title">' + expired.length + ' 件物品已过期！</div>'
        + '<div class="alert-sub">请尽快处理，避免浪费或安全隐患</div>'
        + '</div></div>';
    }

    // Expired items
    if (expired.length > 0) {
      html += '<div class="section-header">'
        + '<span class="section-icon">🚨</span>'
        + '<span class="section-title">已过期</span>'
        + '<span class="section-count danger">' + expired.length + '</span>'
        + '</div>';
      expired.forEach(function(item) {
        html += renderItemCard(item, fifoIds);
      });
    }

    // Urgent items (0-3 days)
    if (urgent.length > 0) {
      html += '<div class="section-header">'
        + '<span class="section-icon">🔴</span>'
        + '<span class="section-title">即将到期</span>'
        + '<span class="section-count danger">' + urgent.length + '</span>'
        + '</div>';
      urgent.forEach(function(item) {
        html += renderItemCard(item, fifoIds);
      });
    }

    // FIFO recommendations
    if (fifoItems.length > 0 && settings.showFIFO) {
      html += '<div class="fifo-section">'
        + '<div class="section-header">'
        + '<span class="section-icon">🍃</span>'
        + '<span class="section-title">先用这些（FIFO）</span>'
        + '</div>';
      fifoItems.slice(0, 5).forEach(function(item) {
        html += renderItemCard(item, fifoIds);
      });
      html += '</div>';
    }

    // Soon items (3-7 days)
    if (soon.length > 0) {
      html += '<div class="section-header">'
        + '<span class="section-icon">🟡</span>'
        + '<span class="section-title">快要到期</span>'
        + '<span class="section-count warning">' + soon.length + '</span>'
        + '</div>';
      soon.forEach(function(item) {
        html += renderItemCard(item, fifoIds);
      });
    }

    // Empty state
    if (items.length === 0) {
      html += '<div class="empty-state">'
        + '<div class="empty-icon">🏝️</div>'
        + '<div class="empty-title">欢迎来到保质岛！</div>'
        + '<div class="empty-sub">这里还没有任何物品<br>点击下方 + 按钮开始添加吧</div>'
        + '<button class="empty-btn" id="home-add-btn">添加第一件物品</button>'
        + '</div>';
    } else if (urgentCount === 0 && soon.length === 0 && fifoItems.length === 0) {
      html += '<div class="empty-state">'
        + '<div class="empty-icon">✨</div>'
        + '<div class="empty-title">太棒了！一切安好</div>'
        + '<div class="empty-sub">目前没有需要紧急处理的物品<br>继续保持好习惯！</div>'
        + '</div>';
    }

    el.innerHTML = html;

    // Bind events
    el.querySelectorAll('.item-card').forEach(function(card) {
      card.addEventListener('click', function() { showDetail(card.dataset.id); });
    });

    var homeAddBtn = document.getElementById('home-add-btn');
    if (homeAddBtn) homeAddBtn.addEventListener('click', function() { switchTab('add'); });
  }

  function renderItemCard(item, fifoIds) {
    var cat = catById(item.categoryId);
    var loc = locById(item.locationId);
    var days = item._days !== undefined ? item._days : Storage.daysUntilExpiry(item);
    var status = Storage.statusClass(days);
    var isFifo = fifoIds && fifoIds[item.id];

    var daysDisplay, daysLabel;
    if (days < 0) {
      daysDisplay = Math.abs(days);
      daysLabel = '天已过期';
    } else if (days === 0) {
      daysDisplay = '!';
      daysLabel = '今天到期';
    } else if (days === Infinity) {
      daysDisplay = '∞';
      daysLabel = '无期限';
    } else {
      daysDisplay = days;
      daysLabel = '天后到期';
    }

    return '<div class="item-card ' + (status === 'expired' || status === 'danger' ? status : '') + (status === 'warning' ? ' urgent' : '') + '" data-id="' + item.id + '">'
      + '<div class="item-cat-icon" style="background:' + cat.color + '">' + cat.icon + '</div>'
      + '<div class="item-info">'
      + '<div class="item-name-row">'
      + '<span class="item-name">' + esc(item.name) + '</span>'
      + (isFifo ? '<span class="fifo-badge">先用!</span>' : '')
      + (item.opened ? '<span class="opened-badge">已开封</span>' : '')
      + '</div>'
      + '<div class="item-meta">'
      + '<span class="item-meta-loc">' + loc.icon + ' ' + loc.name + '</span>'
      + (item.quantity > 1 ? '<span>' + item.quantity + item.unit + '</span>' : '')
      + '</div>'
      + '</div>'
      + '<div class="item-right">'
      + '<div class="item-days ' + status + '">' + daysDisplay + '</div>'
      + '<div class="item-days-label">' + daysLabel + '</div>'
      + '</div>'
      + '</div>';
  }

  // ── INVENTORY VIEW ────────────────────────────────────
  function renderInventory() {
    var el = document.getElementById('view-inventory');
    var items = Storage.getActiveItems();
    var fifoIds = Storage.getFIFOItems(items);
    var filter = STATE.invFilter;
    var search = STATE.invSearch.trim().toLowerCase();

    items.forEach(function(item) {
      item._days = Storage.daysUntilExpiry(item);
    });

    items.sort(function(a,b) { return a._days - b._days; });

    if (search) {
      items = items.filter(function(it) {
        return it.name.toLowerCase().indexOf(search) >= 0;
      });
    }

    var html = '';

    // Search
    html += '<div class="search-bar">'
      + '<span class="search-icon">🔍</span>'
      + '<input type="text" class="search-input" id="inv-search" placeholder="搜索物品名称..." value="' + esc(STATE.invSearch) + '">'
      + '</div>';

    // Filter chips
    html += '<div class="inv-filter-bar">'
      + '<div class="filter-chip' + (filter === 'all' ? ' active' : '') + '" data-filter="all">全部</div>'
      + '<div class="filter-chip' + (filter === 'location' ? ' active' : '') + '" data-filter="location">按位置</div>'
      + '<div class="filter-chip' + (filter === 'category' ? ' active' : '') + '" data-filter="category">按分类</div>'
      + '<div class="filter-chip' + (filter === 'expiry' ? ' active' : '') + '" data-filter="expiry">按日期</div>'
      + '</div>';

    if (items.length === 0) {
      html += '<div class="empty-state">'
        + '<div class="empty-icon">📭</div>'
        + '<div class="empty-title">' + (search ? '没有找到匹配的物品' : '还没有库存物品') + '</div>'
        + '<div class="empty-sub">' + (search ? '试试其他关键词' : '点击 + 添加物品') + '</div>'
        + '</div>';
    } else if (filter === 'location') {
      var locGroups = {};
      items.forEach(function(it) {
        if (!locGroups[it.locationId]) locGroups[it.locationId] = [];
        locGroups[it.locationId].push(it);
      });
      LOCATIONS.forEach(function(loc) {
        var group = locGroups[loc.id];
        if (!group || group.length === 0) return;
        html += '<div class="inv-group-header">'
          + '<span class="inv-group-icon">' + loc.icon + '</span>'
          + '<span>' + loc.name + '</span>'
          + '<span class="inv-group-count">' + group.length + '件</span>'
          + '</div>';
        group.forEach(function(item) { html += renderItemCard(item, fifoIds); });
      });
    } else if (filter === 'category') {
      var catGroups = {};
      items.forEach(function(it) {
        if (!catGroups[it.categoryId]) catGroups[it.categoryId] = [];
        catGroups[it.categoryId].push(it);
      });
      CATEGORIES.forEach(function(cat) {
        var group = catGroups[cat.id];
        if (!group || group.length === 0) return;
        html += '<div class="inv-group-header">'
          + '<span class="inv-group-icon">' + cat.icon + '</span>'
          + '<span>' + cat.name + '</span>'
          + '<span class="inv-group-count">' + group.length + '件</span>'
          + '</div>';
        group.forEach(function(item) { html += renderItemCard(item, fifoIds); });
      });
    } else {
      items.forEach(function(item) { html += renderItemCard(item, fifoIds); });
    }

    el.innerHTML = html;

    // Events
    el.querySelectorAll('.filter-chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        STATE.invFilter = chip.dataset.filter;
        renderInventory();
      });
    });

    var searchInput = document.getElementById('inv-search');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        STATE.invSearch = this.value;
        renderInventory();
      });
      if (STATE.invSearch) searchInput.focus();
    }

    el.querySelectorAll('.item-card').forEach(function(card) {
      card.addEventListener('click', function() { showDetail(card.dataset.id); });
    });
  }

  // ── ADD / EDIT VIEW ───────────────────────────────────
  function renderAdd(editItem) {
    var el = document.getElementById('view-add');
    var item = editItem || null;
    var isEdit = !!item;

    var html = '<div class="form-title">' + (isEdit ? '编辑物品' : '添加新物品') + '</div>';

    // Name
    html += '<div class="form-group">'
      + '<label class="form-label">物品名称 *</label>'
      + '<input type="text" class="form-input" id="add-name" placeholder="例如：纯牛奶" value="' + esc(item ? item.name : '') + '" maxlength="50">'
      + '</div>';

    // Category
    html += '<div class="form-group">'
      + '<label class="form-label">分类</label>'
      + '<div class="selector-grid" id="add-cat-grid">';
    CATEGORIES.forEach(function(cat) {
      var active = item ? item.categoryId === cat.id : cat.id === 'food';
      html += '<div class="selector-item' + (active ? ' active' : '') + '" data-cat="' + cat.id + '">'
        + '<span class="selector-item-icon">' + cat.icon + '</span>'
        + '<span class="selector-item-name">' + cat.name + '</span>'
        + '</div>';
    });
    html += '</div></div>';

    // Location
    html += '<div class="form-group">'
      + '<label class="form-label">存放位置</label>'
      + '<div class="selector-grid" id="add-loc-grid">';
    LOCATIONS.forEach(function(loc) {
      var active = item ? item.locationId === loc.id : loc.id === 'fridge';
      html += '<div class="selector-item' + (active ? ' active' : '') + '" data-loc="' + loc.id + '">'
        + '<span class="selector-item-icon">' + loc.icon + '</span>'
        + '<span class="selector-item-name">' + loc.name + '</span>'
        + '</div>';
    });
    html += '</div></div>';

    // Dates
    html += '<div class="form-row">'
      + '<div class="form-group">'
      + '<label class="form-label">购买日期</label>'
      + '<input type="date" class="form-input" id="add-purchase" value="' + (item ? item.purchaseDate : today()) + '">'
      + '</div>'
      + '<div class="form-group">'
      + '<label class="form-label">保质期至 *</label>'
      + '<input type="date" class="form-input" id="add-expiry" value="' + (item ? item.expiryDate : '') + '">'
      + '</div>'
      + '</div>';

    // Quantity
    html += '<div class="form-row">'
      + '<div class="form-group">'
      + '<label class="form-label">数量</label>'
      + '<input type="number" class="form-input" id="add-qty" min="1" max="9999" value="' + (item ? item.quantity : 1) + '">'
      + '</div>'
      + '<div class="form-group">'
      + '<label class="form-label">单位</label>'
      + '<select class="form-input" id="add-unit">';
    UNITS.forEach(function(u) {
      html += '<option value="' + u + '"' + (item && item.unit === u ? ' selected' : (!item && u === '个' ? ' selected' : '')) + '>' + u + '</option>';
    });
    html += '</select></div></div>';

    // After opening
    html += '<div class="form-group">'
      + '<label class="form-label">开封后保质天数（选填）</label>'
      + '<input type="number" class="form-input" id="add-afteropen" placeholder="例如：7 天" min="1" max="365" value="' + (item && item.afterOpeningDays ? item.afterOpeningDays : '') + '">'
      + '</div>';

    // Notes
    html += '<div class="form-group">'
      + '<label class="form-label">备注（选填）</label>'
      + '<textarea class="form-textarea" id="add-notes" placeholder="例如：买二送一活动" maxlength="200">' + esc(item ? item.notes : '') + '</textarea>'
      + '</div>';

    // Buttons
    html += '<button class="form-btn-primary" id="add-save">'
      + (isEdit ? '保存修改 🍃' : '添加到保质岛 🍃')
      + '</button>';
    if (isEdit) {
      html += '<button class="form-btn-secondary" id="add-cancel">取消编辑</button>';
    }

    el.innerHTML = html;

    // Category selection
    el.querySelectorAll('#add-cat-grid .selector-item').forEach(function(item) {
      item.addEventListener('click', function() {
        el.querySelectorAll('#add-cat-grid .selector-item').forEach(function(s) { s.classList.remove('active'); });
        item.classList.add('active');
      });
    });

    // Location selection
    el.querySelectorAll('#add-loc-grid .selector-item').forEach(function(item) {
      item.addEventListener('click', function() {
        el.querySelectorAll('#add-loc-grid .selector-item').forEach(function(s) { s.classList.remove('active'); });
        item.classList.add('active');
      });
    });

    // Save
    document.getElementById('add-save').addEventListener('click', function() {
      var name = document.getElementById('add-name').value.trim();
      if (!name) { showToast('请输入物品名称'); return; }

      var expiry = document.getElementById('add-expiry').value;
      if (!expiry) { showToast('请选择保质期'); return; }

      var catEl = el.querySelector('#add-cat-grid .selector-item.active');
      var locEl = el.querySelector('#add-loc-grid .selector-item.active');
      var afterOpen = document.getElementById('add-afteropen').value;

      var data = {
        name: name,
        categoryId: catEl ? catEl.dataset.cat : 'other',
        locationId: locEl ? locEl.dataset.loc : 'other',
        purchaseDate: document.getElementById('add-purchase').value || today(),
        expiryDate: expiry,
        quantity: parseInt(document.getElementById('add-qty').value) || 1,
        unit: document.getElementById('add-unit').value || '个',
        afterOpeningDays: afterOpen ? parseInt(afterOpen) : null,
        notes: document.getElementById('add-notes').value.trim()
      };

      if (isEdit && STATE.editingId) {
        Storage.updateItem(STATE.editingId, data);
        STATE.editingId = null;
        showToast('修改成功 ✓');
        switchTab('inventory');
      } else {
        Storage.addItem(data);
        showToast('添加成功 🍃');
        renderAdd();
      }
    });

    // Cancel edit
    var cancelBtn = document.getElementById('add-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        STATE.editingId = null;
        switchTab('inventory');
      });
    }
  }

  // ── DETAIL MODAL ──────────────────────────────────────
  function showDetail(itemId) {
    var item = Storage.getItem(itemId);
    if (!item) return;

    var cat = catById(item.categoryId);
    var loc = locById(item.locationId);
    var days = Storage.daysUntilExpiry(item);
    var status = Storage.statusClass(days);
    var fifoIds = Storage.getFIFOItems(Storage.getActiveItems());
    var isFifo = fifoIds[item.id];

    var html = '<div class="detail-header">'
      + '<div class="detail-cat-icon" style="background:' + cat.color + '">' + cat.icon + '</div>'
      + '<div class="detail-name">' + esc(item.name) + '</div>'
      + (isFifo ? '<span class="fifo-badge" style="display:inline-block;margin-top:6px">FIFO 先用这个!</span>' : '')
      + '</div>';

    // Status
    var statusLabel;
    if (days < 0) statusLabel = '已过期 ' + Math.abs(days) + ' 天';
    else if (days === 0) statusLabel = '今天到期！';
    else if (days === Infinity) statusLabel = '无保质期限';
    else statusLabel = '距离到期';

    if (days !== Infinity) {
      html += '<div class="detail-status ' + status + '">'
        + '<div class="detail-status-days">' + (days < 0 ? '已过期' : (days === 0 ? '今天!' : days + ' 天')) + '</div>'
        + '<div class="detail-status-label">' + statusLabel + '</div>'
        + '</div>';
    }

    // Info grid
    html += '<div class="detail-info-grid">'
      + '<div class="detail-info-item"><div class="detail-info-label">分类</div><div class="detail-info-value">' + cat.icon + ' ' + cat.name + '</div></div>'
      + '<div class="detail-info-item"><div class="detail-info-label">存放位置</div><div class="detail-info-value">' + loc.icon + ' ' + loc.name + '</div></div>'
      + '<div class="detail-info-item"><div class="detail-info-label">购买日期</div><div class="detail-info-value">' + (item.purchaseDate || '-') + '</div></div>'
      + '<div class="detail-info-item"><div class="detail-info-label">到期日期</div><div class="detail-info-value">' + (item.expiryDate || '-') + '</div></div>'
      + '<div class="detail-info-item"><div class="detail-info-label">数量</div><div class="detail-info-value">' + item.quantity + ' ' + item.unit + '</div></div>'
      + '<div class="detail-info-item"><div class="detail-info-label">状态</div><div class="detail-info-value">' + (item.opened ? '已开封' : '未开封') + '</div></div>'
      + '</div>';

    if (item.afterOpeningDays) {
      html += '<div class="detail-info-grid" style="grid-template-columns:1fr">'
        + '<div class="detail-info-item"><div class="detail-info-label">开封后保质</div><div class="detail-info-value">' + item.afterOpeningDays + ' 天'
        + (item.opened && item.openedDate ? ' （' + item.openedDate + ' 开封）' : '')
        + '</div></div></div>';
    }

    if (item.notes) {
      html += '<div class="detail-info-grid" style="grid-template-columns:1fr">'
        + '<div class="detail-info-item"><div class="detail-info-label">备注</div><div class="detail-info-value">' + esc(item.notes) + '</div></div></div>';
    }

    // Action buttons
    html += '<div class="detail-btns">';
    if (!item.opened && item.afterOpeningDays) {
      html += '<button class="btn-use" id="detail-open" style="background:var(--sky)">标记开封</button>';
    }
    html += '<button class="btn-use" id="detail-use">已使用</button>'
      + '<button class="btn-edit" id="detail-edit">编辑</button>'
      + '</div>'
      + '<div class="detail-btns" style="margin-top:8px">'
      + '<button class="btn-delete" id="detail-delete">删除物品</button>'
      + '</div>';

    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');

    // Events
    var openBtn = document.getElementById('detail-open');
    if (openBtn) {
      openBtn.addEventListener('click', function() {
        Storage.updateItem(itemId, { opened: true, openedDate: today() });
        showToast('已标记开封 📦');
        hideModal();
        render();
      });
    }

    document.getElementById('detail-use').addEventListener('click', function() {
      showConfirm('确认已使用/消耗这个物品？', '✅', function() {
        Storage.markUsed(itemId);
        showToast('太棒了，又消耗了一件！🎉');
        hideModal();
        render();
      });
    });

    document.getElementById('detail-edit').addEventListener('click', function() {
      STATE.editingId = itemId;
      hideModal();
      switchTab('add');
      renderAdd(item);
    });

    document.getElementById('detail-delete').addEventListener('click', function() {
      showConfirm('确定要删除这个物品吗？', '🗑️', function() {
        Storage.deleteItem(itemId);
        showToast('已删除');
        hideModal();
        render();
      }, true);
    });
  }

  function hideModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  // ── SETTINGS VIEW ────────────────────────────────────
  function renderSettings() {
    var el = document.getElementById('view-settings');
    var settings = Storage.getSettings();
    var items = Storage.getAllItems();
    var activeCount = items.filter(function(it) { return !it.usedAt; }).length;
    var usedCount = items.filter(function(it) { return !!it.usedAt; }).length;

    var html = '<div class="form-title">设置</div>';

    // Stats
    html += '<div class="settings-section">'
      + '<div class="settings-section-title">数据统计</div>'
      + '<div class="setting-item"><div><div class="setting-label">在管物品</div></div><div style="font-weight:600;color:var(--primary)">' + activeCount + ' 件</div></div>'
      + '<div class="setting-item"><div><div class="setting-label">已消耗物品</div></div><div style="font-weight:600;color:var(--text-dim)">' + usedCount + ' 件</div></div>'
      + '</div>';

    // Reminder settings
    html += '<div class="settings-section">'
      + '<div class="settings-section-title">提醒设置</div>'
      + '<div class="setting-item">'
      + '<div><div class="setting-label">提前提醒天数</div><div class="setting-desc">在首页显示即将到期的物品</div></div>'
      + '<select class="setting-select" id="set-reminder-days">'
      + [1,2,3,5,7,14,30].map(function(d) {
        return '<option value="' + d + '"' + (settings.reminderDays === d ? ' selected' : '') + '>' + d + ' 天</option>';
      }).join('')
      + '</select></div>'
      + '<div class="setting-item">'
      + '<div><div class="setting-label">显示 FIFO 推荐</div><div class="setting-desc">在首页显示先进先出推荐</div></div>'
      + '<label class="toggle"><input type="checkbox" id="set-fifo"' + (settings.showFIFO ? ' checked' : '') + '><span class="toggle-slider"></span></label>'
      + '</div>'
      + '<div class="setting-item">'
      + '<div><div class="setting-label">浏览器通知</div><div class="setting-desc">到期前推送提醒（需授权）</div></div>'
      + '<label class="toggle"><input type="checkbox" id="set-notif"' + (settings.notificationsEnabled ? ' checked' : '') + '><span class="toggle-slider"></span></label>'
      + '</div>'
      + '</div>';

    // Data management
    html += '<div class="settings-section">'
      + '<div class="settings-section-title">数据管理</div>'
      + '<button class="data-btn" id="set-export">📤 导出数据</button>'
      + '<button class="data-btn" id="set-import">📥 导入数据</button>'
      + '<button class="data-btn danger" id="set-clear">🗑️ 清除所有数据</button>'
      + '</div>';

    // About
    html += '<div style="text-align:center;padding:24px 0;color:var(--text-light);font-size:12px">'
      + '🍃 保质岛 v1.0<br>家庭物品保质期管理<br>先进先出，不浪费'
      + '</div>';

    el.innerHTML = html;

    // Events
    document.getElementById('set-reminder-days').addEventListener('change', function() {
      Storage.updateSettings({ reminderDays: parseInt(this.value) });
      showToast('已更新提醒天数');
      updateBadge();
    });

    document.getElementById('set-fifo').addEventListener('change', function() {
      Storage.updateSettings({ showFIFO: this.checked });
    });

    document.getElementById('set-notif').addEventListener('change', function() {
      var checkbox = this;
      if (checkbox.checked) {
        if ('Notification' in window) {
          Notification.requestPermission().then(function(perm) {
            if (perm === 'granted') {
              Storage.updateSettings({ notificationsEnabled: true });
              showToast('通知已开启 🔔');
              checkAndNotify();
            } else {
              checkbox.checked = false;
              showToast('通知权限被拒绝');
            }
          });
        } else {
          checkbox.checked = false;
          showToast('浏览器不支持通知');
        }
      } else {
        Storage.updateSettings({ notificationsEnabled: false });
      }
    });

    document.getElementById('set-export').addEventListener('click', function() {
      var data = Storage.exportData();
      var blob = new Blob([data], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'shelflife_backup_' + today() + '.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('数据已导出 📤');
    });

    document.getElementById('set-import').addEventListener('click', function() {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', function() {
        var file = input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function() {
          try {
            Storage.importData(reader.result);
            showToast('数据已导入 📥');
            render();
          } catch(e) {
            showToast('导入失败，文件格式错误');
          }
        };
        reader.readAsText(file);
      });
      input.click();
    });

    document.getElementById('set-clear').addEventListener('click', function() {
      showConfirm('确定要清除所有数据吗？<br>此操作无法撤回！', '⚠️', function() {
        Storage.clearAll();
        showToast('数据已清除');
        render();
      }, true);
    });
  }

  // ── Notifications ─────────────────────────────────────
  function checkAndNotify() {
    var settings = Storage.getSettings();
    if (!settings.notificationsEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    var items = Storage.getActiveItems();
    var urgent = items.filter(function(it) {
      return Storage.daysUntilExpiry(it) <= settings.reminderDays;
    });

    if (urgent.length > 0) {
      var expired = urgent.filter(function(it) { return Storage.daysUntilExpiry(it) < 0; });
      var title, body;
      if (expired.length > 0) {
        title = '⚠️ ' + expired.length + ' 件物品已过期！';
        body = expired.slice(0, 3).map(function(it) { return it.name; }).join('、') + (expired.length > 3 ? ' 等' : '');
      } else {
        title = '🔔 ' + urgent.length + ' 件物品即将到期';
        body = urgent.slice(0, 3).map(function(it) {
          return it.name + '（' + Storage.daysUntilExpiry(it) + '天）';
        }).join('、');
      }

      new Notification(title, {
        body: body,
        icon: '🍃',
        tag: 'shelflife-urgent'
      });
    }
  }

  // ── Init ──────────────────────────────────────────────
  function init() {
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { switchTab(btn.dataset.tab); });
    });

    document.getElementById('modal-overlay').addEventListener('click', function(e) {
      if (e.target.id === 'modal-overlay') hideModal();
    });

    document.getElementById('bell-btn').addEventListener('click', function() {
      switchTab('home');
    });

    renderHome();
    checkAndNotify();
  }

  init();
})();
