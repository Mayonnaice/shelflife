// ── 保质岛 App ────────────────────────────────────────────
(function() {
  'use strict';

  var STATE = {
    tab: 'home',
    drillCategory: null,
    invFilter: 'all',
    invSearch: '',
    editingId: null,
    modalStack: []
  };

  var GREETINGS = [
    '今天也要好好整理哦~', '检查一下库存吧！', '先进先出，不浪费~',
    '保质岛欢迎你回来！', '来看看有什么快到期了~', '勤整理，好生活！'
  ];

  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function today() {
    var d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  // ── Toast & Confirm ───────────────────────────────────
  function showToast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg; el.classList.remove('hidden');
    clearTimeout(el._t);
    el._t = setTimeout(function(){ el.classList.add('hidden'); }, 2000);
  }

  function showConfirm(msg, icon, onOk, isDanger) {
    var ov = document.createElement('div');
    ov.className = 'confirm-overlay';
    ov.innerHTML = '<div class="confirm-box"><div class="confirm-icon">'+(icon||'🍃')+'</div>'
      +'<div class="confirm-msg">'+msg+'</div><div class="confirm-btns">'
      +'<button class="confirm-cancel">取消</button>'
      +'<button class="'+(isDanger?'confirm-danger':'confirm-ok')+'">'+(isDanger?'确认删除':'确认')+'</button>'
      +'</div></div>';
    document.getElementById('app').appendChild(ov);
    ov.querySelector('.confirm-cancel').onclick = function(){ ov.remove(); };
    ov.querySelector('.'+(isDanger?'confirm-danger':'confirm-ok')).onclick = function(){ ov.remove(); if(onOk) onOk(); };
  }

  // ── Tab / Nav ─────────────────────────────────────────
  function switchTab(tab) {
    STATE.tab = tab;
    if (tab !== 'inventory') STATE.drillCategory = null;
    document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.tab===tab); });
    ['home','inventory','add','settings'].forEach(function(v){ document.getElementById('view-'+v).classList.toggle('hidden', v!==tab); });
    render();
    document.querySelector('.main-content').scrollTop = 0;
  }

  function drillToCategory(catId) {
    STATE.drillCategory = catId;
    STATE.invFilter = 'all';
    STATE.invSearch = '';
    switchTab('inventory');
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
    var c = Storage.getUrgentCount();
    var b = document.getElementById('bell-badge');
    if (c>0) { b.textContent = c>99?'99+':c; b.classList.remove('hidden'); }
    else b.classList.add('hidden');
  }

  // ── HOME VIEW (Dashboard) ────────────────────────────
  function renderHome() {
    var el = document.getElementById('view-home');
    var items = Storage.getActiveItems();
    var settings = Storage.getSettings();
    var stats = Storage.getCategoryStats();
    var cats = Storage.getVisibleCategories();

    var totalQty = 0;
    items.forEach(function(it){ totalQty += it.quantity; });

    var urgentItems = [];
    items.forEach(function(it) {
      var d = Storage.daysUntilExpiry(it);
      it._days = d;
      if (d <= settings.reminderDays) urgentItems.push(it);
    });
    urgentItems.sort(function(a,b){ return a._days - b._days; });

    var expired = urgentItems.filter(function(it){ return it._days < 0; });
    var greeting = GREETINGS[Math.floor(Math.random()*GREETINGS.length)];

    var html = '';

    // Greeting
    html += '<div class="greeting-card">'
      +'<div class="greeting-text">'+greeting+'</div>'
      +'<div class="greeting-stats">'
      +'<div><div class="greeting-stat-num">'+totalQty+'</div><div class="greeting-stat-label">件物品在管</div></div>'
      +'<div><div class="greeting-stat-num">'+urgentItems.length+'</div><div class="greeting-stat-label">件需要注意</div></div>'
      +'</div></div>';

    // Alert
    if (expired.length > 0) {
      html += '<div class="alert-banner"><div class="alert-icon">⚠️</div><div class="alert-text">'
        +'<div class="alert-title">'+expired.length+' 件物品已过期！</div>'
        +'<div class="alert-sub">请尽快处理，避免浪费</div></div></div>';
    }

    if (items.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">🏝️</div>'
        +'<div class="empty-title">欢迎来到保质岛！</div>'
        +'<div class="empty-sub">点击下方 + 开始添加物品</div>'
        +'<button class="empty-btn" id="home-add-btn">添加第一件物品</button></div>';
    } else {
      // Dashboard grid
      html += '<div class="section-header"><span class="section-icon">📊</span><span class="section-title">我的囤货</span></div>';

      // Total card
      html += '<div class="dash-total"><div class="dash-total-left"><span class="dash-total-icon">📦</span>'
        +'<span class="dash-total-label">全部物品</span></div><div class="dash-total-num">'+totalQty+'</div></div>';

      // Category cards
      var catsWithItems = cats.filter(function(c){ return stats[c.id] && stats[c.id] > 0; });

      if (catsWithItems.length > 0) {
        html += '<div class="dash-grid">';
        catsWithItems.forEach(function(cat) {
          var count = stats[cat.id] || 0;
          var catUrgent = items.filter(function(it){ return it.categoryId===cat.id && it._days <= settings.reminderDays; }).length;
          html += '<div class="dash-card'+(catUrgent>0?' has-urgent':'')+'" data-cat="'+cat.id+'" style="border-top:3px solid '+cat.color+'">'
            +'<div class="dash-card-icon">'+cat.icon+'</div>'
            +'<div class="dash-card-name">'+esc(cat.name)+'</div>'
            +'<div class="dash-card-count">'+count+'</div>'
            +'<div class="dash-card-unit">件</div>'
            +'</div>';
        });
        html += '</div>';
      }

      // Urgent items
      if (urgentItems.length > 0) {
        var fifoIds = Storage.getFIFOItems(items);
        html += '<div class="section-header"><span class="section-icon">⚡</span><span class="section-title">需要注意</span>'
          +'<span class="section-count danger">'+urgentItems.length+'</span></div>';
        urgentItems.slice(0,8).forEach(function(item) {
          html += renderItemCard(item, fifoIds);
        });
        if (urgentItems.length > 8) {
          html += '<div style="text-align:center;padding:8px;color:var(--text-dim);font-size:13px">还有 '+(urgentItems.length-8)+' 件...</div>';
        }
      }

      // FIFO section
      var fifoIds2 = Storage.getFIFOItems(items);
      var fifoItems = items.filter(function(it){ return fifoIds2[it.id]; });
      if (fifoItems.length > 0 && settings.showFIFO) {
        fifoItems.sort(function(a,b){ return a._days - b._days; });
        html += '<div class="fifo-section"><div class="section-header"><span class="section-icon">🍃</span><span class="section-title">先用这些 (FIFO)</span></div>';
        fifoItems.slice(0,5).forEach(function(item){ html += renderItemCard(item, fifoIds2); });
        html += '</div>';
      }
    }

    el.innerHTML = html;

    // Events
    el.querySelectorAll('.dash-card').forEach(function(card){
      card.addEventListener('click', function(){ drillToCategory(card.dataset.cat); });
    });
    el.querySelectorAll('.item-card').forEach(function(card){
      card.addEventListener('click', function(){ showDetail(card.dataset.id); });
    });
    var addBtn = document.getElementById('home-add-btn');
    if (addBtn) addBtn.addEventListener('click', function(){ switchTab('add'); });
  }

  function renderItemCard(item, fifoIds) {
    var cat = Storage.catById(item.categoryId);
    var loc = Storage.locById(item.locationId);
    var sub = Storage.subById(item.categoryId, item.subcategoryId);
    var days = item._days !== undefined ? item._days : Storage.daysUntilExpiry(item);
    var status = Storage.statusClass(days);
    var isFifo = fifoIds && fifoIds[item.id];

    var dd, dl;
    if (days<0){ dd=Math.abs(days); dl='天已过期'; }
    else if (days===0){ dd='!'; dl='今天到期'; }
    else if (days===Infinity){ dd='∞'; dl='无期限'; }
    else { dd=days; dl='天后到期'; }

    return '<div class="item-card '+(status==='expired'||status==='danger'?status:'')+(status==='warning'?' urgent':'')+'" data-id="'+item.id+'">'
      +'<div class="item-cat-icon" style="background:'+cat.color+'">'+cat.icon+'</div>'
      +'<div class="item-info"><div class="item-name-row">'
      +'<span class="item-name">'+esc(item.name)+'</span>'
      +(isFifo?'<span class="fifo-badge">先用!</span>':'')
      +(item.opened?'<span class="opened-badge">已开封</span>':'')
      +(sub?'<span class="sub-badge">'+esc(sub.name)+'</span>':'')
      +'</div><div class="item-meta">'
      +'<span>'+loc.icon+' '+loc.name+'</span>'
      +(item.quantity>1?'<span>'+item.quantity+item.unit+'</span>':'')
      +'</div></div>'
      +'<div class="item-right"><div class="item-days '+status+'">'+dd+'</div>'
      +'<div class="item-days-label">'+dl+'</div></div></div>';
  }

  // ── INVENTORY VIEW ────────────────────────────────────
  function renderInventory() {
    var el = document.getElementById('view-inventory');
    var items = Storage.getActiveItems();
    var fifoIds = Storage.getFIFOItems(items);
    var drillCat = STATE.drillCategory;
    var search = STATE.invSearch.trim().toLowerCase();

    items.forEach(function(it){ it._days = Storage.daysUntilExpiry(it); });
    items.sort(function(a,b){ return a._days - b._days; });

    if (drillCat) items = items.filter(function(it){ return it.categoryId === drillCat; });
    if (search) items = items.filter(function(it){ return it.name.toLowerCase().indexOf(search)>=0; });

    var html = '';

    // Back button if drilled
    if (drillCat) {
      var dCat = Storage.catById(drillCat);
      html += '<div class="inv-back" id="inv-back">← 返回首页 / '+dCat.icon+' '+esc(dCat.name)+' ('+items.length+'件)</div>';
    }

    // Search
    html += '<div class="search-bar"><span class="search-icon">🔍</span>'
      +'<input type="text" class="search-input" id="inv-search" placeholder="搜索物品名称..." value="'+esc(STATE.invSearch)+'"></div>';

    // Filters (only show if not drilled into specific category)
    if (!drillCat) {
      var f = STATE.invFilter;
      var consumedCount = Storage.getConsumedItems().length;
      html += '<div class="inv-filter-bar">'
        +'<div class="filter-chip'+(f==='all'?' active':'')+'" data-filter="all">全部</div>'
        +'<div class="filter-chip'+(f==='location'?' active':'')+'" data-filter="location">按位置</div>'
        +'<div class="filter-chip'+(f==='category'?' active':'')+'" data-filter="category">按分类</div>'
        +'<div class="filter-chip'+(f==='consumed'?' active':'')+'" data-filter="consumed">已消耗'+(consumedCount>0?' ('+consumedCount+')':'')+'</div>'
        +'</div>';
    } else {
      // Show subcategory filter if this category has subcategories
      var subs = Storage.getSubcategories(drillCat);
      if (subs.length > 0) {
        var sf = STATE.invSubFilter || 'all';
        html += '<div class="inv-filter-bar">'
          +'<div class="filter-chip'+(sf==='all'?' active':'')+'" data-subfilter="all">全部</div>';
        subs.forEach(function(sub){
          html += '<div class="filter-chip'+(sf===sub.id?' active':'')+'" data-subfilter="'+sub.id+'">'+esc(sub.name)+'</div>';
        });
        html += '<div class="filter-chip" data-subfilter="none">未分类</div></div>';

        if (sf !== 'all') {
          if (sf === 'none') items = items.filter(function(it){ return !it.subcategoryId; });
          else items = items.filter(function(it){ return it.subcategoryId === sf; });
        }
      }
    }

    if (!drillCat && STATE.invFilter === 'consumed') {
      var consumed = Storage.getConsumedItems();
      if (search) consumed = consumed.filter(function(it){ return it.name.toLowerCase().indexOf(search)>=0; });
      consumed.sort(function(a,b){ return (b.usedAt||0) - (a.usedAt||0); });
      if (consumed.length === 0) {
        html += '<div class="empty-state"><div class="empty-icon">✨</div>'
          +'<div class="empty-title">暂无已消耗物品</div>'
          +'<div class="empty-sub">消耗的物品会出现在这里</div></div>';
      } else {
        consumed.forEach(function(ci){
          var cat = Storage.catById(ci.categoryId);
          var loc = Storage.locById(ci.locationId);
          var usedDate = ci.usedAt ? new Date(ci.usedAt) : null;
          var usedStr = usedDate ? usedDate.getFullYear()+'-'+String(usedDate.getMonth()+1).padStart(2,'0')+'-'+String(usedDate.getDate()).padStart(2,'0') : '';
          html += '<div class="item-card consumed-card" data-cid="'+ci.id+'">'
            +'<div class="item-cat-icon" style="background:'+cat.color+';opacity:0.6">'+cat.icon+'</div>'
            +'<div class="item-info"><div class="item-name-row">'
            +'<span class="item-name" style="opacity:0.7">'+esc(ci.name)+'</span>'
            +'<span class="consumed-badge">已消耗</span></div>'
            +'<div class="item-meta"><span>'+loc.icon+' '+loc.name+'</span>'
            +(ci._origQty?'<span>原'+ci._origQty+ci.unit+'</span>':'')
            +'<span>消耗于 '+usedStr+'</span></div></div>'
            +'<button class="btn-restore" data-rid="'+ci.id+'">恢复</button></div>';
        });
      }
    } else if (items.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">📭</div>'
        +'<div class="empty-title">'+(search?'没有找到匹配的物品':'暂无物品')+'</div>'
        +'<div class="empty-sub">'+(search?'试试其他关键词':'点击 + 添加物品')+'</div></div>';
    } else if (!drillCat && STATE.invFilter === 'location') {
      var locG = {};
      items.forEach(function(it){ if(!locG[it.locationId]) locG[it.locationId]=[]; locG[it.locationId].push(it); });
      Storage.getVisibleLocations().forEach(function(loc){
        var g = locG[loc.id]; if(!g||!g.length) return;
        html += '<div class="inv-group-header"><span class="inv-group-icon">'+loc.icon+'</span><span>'+loc.name+'</span><span class="inv-group-count">'+g.length+'件</span></div>';
        g.forEach(function(item){ html += renderItemCard(item, fifoIds); });
      });
    } else if (!drillCat && STATE.invFilter === 'category') {
      var catG = {};
      items.forEach(function(it){ if(!catG[it.categoryId]) catG[it.categoryId]=[]; catG[it.categoryId].push(it); });
      Storage.getVisibleCategories().forEach(function(cat){
        var g = catG[cat.id]; if(!g||!g.length) return;
        html += '<div class="inv-group-header"><span class="inv-group-icon">'+cat.icon+'</span><span>'+cat.name+'</span><span class="inv-group-count">'+g.length+'件</span></div>';
        g.forEach(function(item){ html += renderItemCard(item, fifoIds); });
      });
    } else {
      items.forEach(function(item){ html += renderItemCard(item, fifoIds); });
    }

    el.innerHTML = html;

    // Events
    var back = document.getElementById('inv-back');
    if (back) back.addEventListener('click', function(){ STATE.drillCategory=null; switchTab('home'); });

    el.querySelectorAll('.filter-chip[data-filter]').forEach(function(chip){
      chip.addEventListener('click', function(){ STATE.invFilter=chip.dataset.filter; renderInventory(); });
    });
    el.querySelectorAll('.filter-chip[data-subfilter]').forEach(function(chip){
      chip.addEventListener('click', function(){ STATE.invSubFilter=chip.dataset.subfilter; renderInventory(); });
    });

    var si = document.getElementById('inv-search');
    if (si) { si.addEventListener('input', function(){ STATE.invSearch=this.value; renderInventory(); }); if(STATE.invSearch) si.focus(); }

    el.querySelectorAll('.item-card:not(.consumed-card)').forEach(function(card){
      card.addEventListener('click', function(){ showDetail(card.dataset.id); });
    });
    el.querySelectorAll('.consumed-card').forEach(function(card){
      card.addEventListener('click', function(e){
        if (e.target.classList.contains('btn-restore')) return;
        showConsumedDetail(card.dataset.cid);
      });
    });
    el.querySelectorAll('.btn-restore').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        showConfirm('确认恢复此物品？','🔄',function(){
          Storage.restoreItem(btn.dataset.rid);
          showToast('已恢复 ✓');
          renderInventory();
        });
      });
    });
  }

  // ── ADD / EDIT VIEW ───────────────────────────────────
  function renderAdd(editItem) {
    var el = document.getElementById('view-add');
    var item = editItem || null;
    var isEdit = !!item;
    var cats = Storage.getVisibleCategories();
    var locs = Storage.getVisibleLocations();
    var selCat = item ? item.categoryId : (cats[0]?cats[0].id:'other');
    var selSub = item ? item.subcategoryId : null;

    var html = '<div class="form-title">'+(isEdit?'编辑物品':'添加新物品')+'</div>';

    // Name
    html += '<div class="form-group"><label class="form-label">物品名称 *</label>'
      +'<input type="text" class="form-input" id="add-name" placeholder="例如：纯牛奶" value="'+esc(item?item.name:'')+'" maxlength="50"></div>';

    // Category
    html += '<div class="form-group"><label class="form-label"><span>分类</span><span class="form-label-link" id="manage-cats-link">管理分类 ›</span></label>'
      +'<div class="selector-grid" id="add-cat-grid">';
    cats.forEach(function(cat){
      html += '<div class="selector-item'+(selCat===cat.id?' active':'')+'" data-cat="'+cat.id+'">'
        +'<span class="selector-item-icon">'+cat.icon+'</span>'
        +'<span class="selector-item-name">'+esc(cat.name)+'</span></div>';
    });
    html += '</div>';

    // Subcategory chips
    var subs = Storage.getSubcategories(selCat);
    if (subs.length > 0) {
      html += '<div class="sub-chips" id="add-sub-chips">'
        +'<div class="sub-chip'+(selSub===null?' active':'')+'" data-sub="">不选子类</div>';
      subs.forEach(function(sub){
        html += '<div class="sub-chip'+(selSub===sub.id?' active':'')+'" data-sub="'+sub.id+'">'+esc(sub.name)+'</div>';
      });
      html += '</div>';
    }
    html += '</div>';

    // Location
    html += '<div class="form-group"><label class="form-label"><span>存放位置</span><span class="form-label-link" id="manage-locs-link">管理位置 ›</span></label>'
      +'<div class="selector-grid" id="add-loc-grid">';
    var selLoc = item ? item.locationId : (locs[0]?locs[0].id:'other');
    locs.forEach(function(loc){
      html += '<div class="selector-item'+(selLoc===loc.id?' active':'')+'" data-loc="'+loc.id+'">'
        +'<span class="selector-item-icon">'+loc.icon+'</span>'
        +'<span class="selector-item-name">'+esc(loc.name)+'</span></div>';
    });
    html += '</div></div>';

    // Dates
    html += '<div class="form-row"><div class="form-group"><label class="form-label">生产日期</label>'
      +'<input type="date" class="form-input" id="add-purchase" value="'+(item?item.purchaseDate:today())+'"></div>'
      +'<div class="form-group"><label class="form-label">保质期至 *</label>'
      +'<input type="date" class="form-input" id="add-expiry" value="'+(item?item.expiryDate:'')+'"></div></div>';

    // Quantity
    html += '<div class="form-row"><div class="form-group"><label class="form-label">数量</label>'
      +'<input type="number" class="form-input" id="add-qty" min="1" max="9999" value="'+(item?item.quantity:1)+'"></div>'
      +'<div class="form-group"><label class="form-label">单位</label><select class="form-input" id="add-unit">';
    UNITS.forEach(function(u){
      html += '<option value="'+u+'"'+((item&&item.unit===u)||(!item&&u==='个')?' selected':'')+'>'+u+'</option>';
    });
    html += '</select></div></div>';

    // After opening
    html += '<div class="form-group"><label class="form-label">开封后保质天数（选填）</label>'
      +'<input type="number" class="form-input" id="add-afteropen" placeholder="例如：7 天" min="1" max="365" value="'+(item&&item.afterOpeningDays?item.afterOpeningDays:'')+'"></div>';

    // Notes
    html += '<div class="form-group"><label class="form-label">备注（选填）</label>'
      +'<textarea class="form-textarea" id="add-notes" placeholder="例如：买二送一活动" maxlength="200">'+esc(item?item.notes:'')+'</textarea></div>';

    html += '<button class="form-btn-primary" id="add-save">'+(isEdit?'保存修改 🍃':'添加到保质岛 🍃')+'</button>';
    if (isEdit) html += '<button class="form-btn-secondary" id="add-cancel">取消编辑</button>';

    el.innerHTML = html;

    // Category selection with subcategory refresh
    el.querySelectorAll('#add-cat-grid .selector-item').forEach(function(si){
      si.addEventListener('click', function(){
        el.querySelectorAll('#add-cat-grid .selector-item').forEach(function(s){ s.classList.remove('active'); });
        si.classList.add('active');
        refreshSubChips(el, si.dataset.cat);
      });
    });

    // Subcategory selection
    bindSubChips(el);

    // Location selection
    el.querySelectorAll('#add-loc-grid .selector-item').forEach(function(si){
      si.addEventListener('click', function(){
        el.querySelectorAll('#add-loc-grid .selector-item').forEach(function(s){ s.classList.remove('active'); });
        si.classList.add('active');
      });
    });

    // Manage links
    document.getElementById('manage-cats-link').addEventListener('click', function(){ showManageCategories(); });
    document.getElementById('manage-locs-link').addEventListener('click', function(){ showManageLocations(); });

    // Save
    document.getElementById('add-save').addEventListener('click', function(){
      var name = document.getElementById('add-name').value.trim();
      if (!name) { showToast('请输入物品名称'); return; }
      var expiry = document.getElementById('add-expiry').value;
      if (!expiry) { showToast('请选择保质期'); return; }

      var catEl = el.querySelector('#add-cat-grid .selector-item.active');
      var locEl = el.querySelector('#add-loc-grid .selector-item.active');
      var subEl = el.querySelector('#add-sub-chips .sub-chip.active');
      var ao = document.getElementById('add-afteropen').value;

      var data = {
        name: name,
        categoryId: catEl?catEl.dataset.cat:'other',
        subcategoryId: subEl&&subEl.dataset.sub?subEl.dataset.sub:null,
        locationId: locEl?locEl.dataset.loc:'other',
        purchaseDate: document.getElementById('add-purchase').value || today(),
        expiryDate: expiry,
        quantity: parseInt(document.getElementById('add-qty').value)||1,
        unit: document.getElementById('add-unit').value||'个',
        afterOpeningDays: ao?parseInt(ao):null,
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

    var cancelBtn = document.getElementById('add-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', function(){ STATE.editingId=null; switchTab('inventory'); });
  }

  function refreshSubChips(el, catId) {
    var oldChips = document.getElementById('add-sub-chips');
    if (oldChips) oldChips.remove();
    var subs = Storage.getSubcategories(catId);
    if (subs.length === 0) return;
    var container = document.createElement('div');
    container.className = 'sub-chips'; container.id = 'add-sub-chips';
    container.innerHTML = '<div class="sub-chip active" data-sub="">不选子类</div>'
      + subs.map(function(s){ return '<div class="sub-chip" data-sub="'+s.id+'">'+esc(s.name)+'</div>'; }).join('');
    var catGrid = document.getElementById('add-cat-grid');
    catGrid.parentNode.insertBefore(container, catGrid.nextSibling);
    bindSubChips(el);
  }

  function bindSubChips(el) {
    var chips = el.querySelectorAll('#add-sub-chips .sub-chip');
    chips.forEach(function(chip){
      chip.addEventListener('click', function(){
        chips.forEach(function(c){ c.classList.remove('active'); });
        chip.classList.add('active');
      });
    });
  }

  // ── DETAIL MODAL ──────────────────────────────────────
  function showDetail(itemId) {
    var item = Storage.getItem(itemId);
    if (!item) return;
    var cat = Storage.catById(item.categoryId);
    var loc = Storage.locById(item.locationId);
    var sub = Storage.subById(item.categoryId, item.subcategoryId);
    var days = Storage.daysUntilExpiry(item);
    var status = Storage.statusClass(days);
    var fifoIds = Storage.getFIFOItems(Storage.getActiveItems());

    var html = '<div class="detail-header">'
      +'<div class="detail-cat-icon" style="background:'+cat.color+'">'+cat.icon+'</div>'
      +'<div class="detail-name">'+esc(item.name)+'</div>'
      +(sub?'<span class="sub-badge" style="display:inline-block;margin-top:6px">'+esc(sub.name)+'</span>':'')
      +(fifoIds[item.id]?'<span class="fifo-badge" style="display:inline-block;margin-top:6px">FIFO 先用这个!</span>':'')
      +'</div>';

    if (days !== Infinity) {
      var sLabel = days<0?'已过期 '+Math.abs(days)+' 天':days===0?'今天到期！':'距离到期';
      html += '<div class="detail-status '+status+'">'
        +'<div class="detail-status-days">'+(days<0?'已过期':days===0?'今天!':days+' 天')+'</div>'
        +'<div class="detail-status-label">'+sLabel+'</div></div>';
    }

    html += '<div class="detail-info-grid">'
      +'<div class="detail-info-item"><div class="detail-info-label">分类</div><div class="detail-info-value">'+cat.icon+' '+cat.name+'</div></div>'
      +'<div class="detail-info-item"><div class="detail-info-label">存放位置</div><div class="detail-info-value">'+loc.icon+' '+loc.name+'</div></div>'
      +'<div class="detail-info-item"><div class="detail-info-label">生产日期</div><div class="detail-info-value">'+(item.purchaseDate||'-')+'</div></div>'
      +'<div class="detail-info-item"><div class="detail-info-label">到期日期</div><div class="detail-info-value">'+(item.expiryDate||'-')+'</div></div>'
      +'<div class="detail-info-item"><div class="detail-info-label">数量</div><div class="detail-info-value">'+item.quantity+' '+item.unit+'</div></div>'
      +'<div class="detail-info-item"><div class="detail-info-label">状态</div><div class="detail-info-value">'+(item.opened?'已开封':'未开封')+'</div></div>'
      +'</div>';

    if (item.afterOpeningDays) {
      html += '<div class="detail-info-grid" style="grid-template-columns:1fr">'
        +'<div class="detail-info-item"><div class="detail-info-label">开封后保质</div><div class="detail-info-value">'
        +item.afterOpeningDays+' 天'+(item.opened&&item.openedDate?' （'+item.openedDate+' 开封）':'')+'</div></div></div>';
    }
    if (item.notes) {
      html += '<div class="detail-info-grid" style="grid-template-columns:1fr">'
        +'<div class="detail-info-item"><div class="detail-info-label">备注</div><div class="detail-info-value">'+esc(item.notes)+'</div></div></div>';
    }

    html += '<div class="detail-btns">';
    if (!item.opened && item.afterOpeningDays)
      html += '<button class="btn-use" id="detail-open" style="background:var(--sky)">标记开封</button>';
    if (item.quantity > 1)
      html += '<button class="btn-use" id="detail-consume1" style="background:var(--sky)">消耗1'+item.unit+'</button>';
    html += '<button class="btn-use" id="detail-use">'+(item.quantity>1?'全部消耗':'已使用')+'</button>'
      +'<button class="btn-edit" id="detail-edit">编辑</button></div>'
      +'<div class="detail-btns" style="margin-top:8px"><button class="btn-delete" id="detail-delete">删除物品</button></div>';

    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');

    var openBtn = document.getElementById('detail-open');
    if (openBtn) openBtn.onclick = function(){
      Storage.updateItem(itemId, { opened:true, openedDate:today() });
      showToast('已标记开封 📦'); hideModal(); render();
    };
    var consume1Btn = document.getElementById('detail-consume1');
    if (consume1Btn) consume1Btn.onclick = function(){
      try {
        var before = Storage.getItem(itemId);
        var beforeQty = before ? before.quantity : '?';
        Storage.consumeOne(itemId);
        var updated = Storage.getItem(itemId);
        var afterQty = updated ? updated.quantity : '?';
        if (updated && updated.quantity === 0) {
          showToast('最后1个已消耗 🎉'); hideModal();
        } else {
          showToast(beforeQty+'→'+afterQty+' ✓'); showDetail(itemId);
        }
        render();
      } catch(e) {
        alert('消耗出错: '+e.message);
      }
    };
    document.getElementById('detail-use').onclick = function(){
      showConfirm('确认'+(item.quantity>1?'全部':'')+'消耗？','✅',function(){
        try {
          Storage.markUsed(itemId);
          showToast('太棒了 🎉'); hideModal(); render();
        } catch(e) {
          alert('消耗出错: '+e.message);
        }
      });
    };
    document.getElementById('detail-edit').onclick = function(){
      STATE.editingId = itemId; hideModal(); switchTab('add'); renderAdd(item);
    };
    document.getElementById('detail-delete').onclick = function(){
      showConfirm('确定要删除？','🗑️',function(){ Storage.deleteItem(itemId); showToast('已删除'); hideModal(); render(); },true);
    };
  }

  function showConsumedDetail(itemId) {
    var item = Storage.getItem(itemId);
    if (!item) return;
    var cat = Storage.catById(item.categoryId);
    var loc = Storage.locById(item.locationId);
    var sub = Storage.subById(item.categoryId, item.subcategoryId);
    var usedDate = item.usedAt ? new Date(item.usedAt) : null;
    var usedStr = usedDate ? usedDate.getFullYear()+'-'+String(usedDate.getMonth()+1).padStart(2,'0')+'-'+String(usedDate.getDate()).padStart(2,'0') : '';

    var html = '<div class="detail-header">'
      +'<div class="detail-cat-icon" style="background:'+cat.color+';opacity:0.6">'+cat.icon+'</div>'
      +'<div class="detail-name" style="opacity:0.7">'+esc(item.name)+'</div>'
      +(sub?'<span class="sub-badge" style="display:inline-block;margin-top:6px">'+esc(sub.name)+'</span>':'')
      +'<span class="consumed-badge" style="display:inline-block;margin-top:6px">已消耗</span>'
      +'</div>';

    html += '<div class="detail-info-grid">'
      +'<div class="detail-info-item"><div class="detail-info-label">分类</div><div class="detail-info-value">'+cat.icon+' '+cat.name+'</div></div>'
      +'<div class="detail-info-item"><div class="detail-info-label">存放位置</div><div class="detail-info-value">'+loc.icon+' '+loc.name+'</div></div>'
      +'<div class="detail-info-item"><div class="detail-info-label">生产日期</div><div class="detail-info-value">'+(item.purchaseDate||'-')+'</div></div>'
      +'<div class="detail-info-item"><div class="detail-info-label">到期日期</div><div class="detail-info-value">'+(item.expiryDate||'-')+'</div></div>'
      +'<div class="detail-info-item"><div class="detail-info-label">原数量</div><div class="detail-info-value">'+(item._origQty||item.quantity)+' '+item.unit+'</div></div>'
      +'<div class="detail-info-item"><div class="detail-info-label">消耗日期</div><div class="detail-info-value">'+usedStr+'</div></div>'
      +'</div>';

    if (item.notes) {
      html += '<div class="detail-info-grid" style="grid-template-columns:1fr">'
        +'<div class="detail-info-item"><div class="detail-info-label">备注</div><div class="detail-info-value">'+esc(item.notes)+'</div></div></div>';
    }

    html += '<div class="detail-btns">'
      +'<button class="btn-use" id="cd-restore" style="background:var(--sky)">🔄 恢复物品</button>'
      +'<button class="btn-delete" id="cd-delete">删除记录</button></div>';

    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');

    document.getElementById('cd-restore').onclick = function(){
      showConfirm('确认恢复此物品？','🔄',function(){
        Storage.restoreItem(itemId);
        showToast('已恢复 ✓'); hideModal(); render();
      });
    };
    document.getElementById('cd-delete').onclick = function(){
      showConfirm('确定要永久删除？','🗑️',function(){
        Storage.deleteItem(itemId); showToast('已删除'); hideModal(); render();
      },true);
    };
  }

  function hideModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

  // ── MANAGE CATEGORIES MODAL ───────────────────────────
  function showManageCategories() {
    var mc = document.getElementById('modal-content');
    mc.innerHTML = buildManageCatsHTML();
    document.getElementById('modal-overlay').classList.remove('hidden');
    bindManageCatsEvents();
  }

  function buildManageCatsHTML() {
    var allCats = Storage.getAllCategories();
    var html = '<div class="modal-title">管理物品分类</div>';

    // Add new
    html += '<div style="margin-bottom:16px">'
      +'<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">'
      +'<button class="emoji-picker-btn" id="mc-emoji-btn">📦</button>'
      +'<input type="text" class="form-input" id="mc-name" placeholder="新分类名称" maxlength="20" style="flex:1">'
      +'<button class="manage-btn primary" id="mc-add" style="width:auto;padding:0 16px;border-radius:var(--radius-xs);height:46px;font-size:13px;font-weight:600">添加</button>'
      +'</div>'
      +'<div class="emoji-grid hidden" id="mc-emoji-grid">';
    EMOJI_PICKS.forEach(function(e){
      html += '<button class="emoji-grid-item" data-emoji="'+e+'">'+e+'</button>';
    });
    html += '</div>'
      +'<div class="color-grid" id="mc-color-grid">';
    COLOR_PALETTE.forEach(function(c,i){
      html += '<div class="color-swatch'+(i===0?' selected':'')+'" data-color="'+c+'" style="background:'+c+'"></div>';
    });
    html += '</div></div>';

    // List
    html += '<div class="manage-list">';
    allCats.forEach(function(cat){
      html += '<div class="manage-item'+(cat.hidden?' hidden-item':'')+'">'
        +'<span class="manage-item-icon">'+cat.icon+'</span>'
        +'<div style="flex:1"><div class="manage-item-name">'+esc(cat.name)+'</div>'
        +'<div class="manage-item-sub">'+Storage.getSubcategories(cat.id).length+' 个子分类</div></div>';
      if (cat.builtIn) {
        html += '<button class="manage-btn" data-toggle="'+cat.id+'" title="'+(cat.hidden?'显示':'隐藏')+'">'+(cat.hidden?'👁':'🙈')+'</button>';
      } else {
        html += '<button class="manage-btn danger" data-delcat="'+cat.id+'" title="删除">✕</button>';
      }
      html += '<button class="manage-btn" data-mansub="'+cat.id+'" title="管理子分类">▸</button></div>';
    });
    html += '</div>';

    return html;
  }

  function bindManageCatsEvents() {
    var emojiBtn = document.getElementById('mc-emoji-btn');
    var emojiGrid = document.getElementById('mc-emoji-grid');
    var selectedEmoji = '📦';
    var selectedColor = COLOR_PALETTE[0];

    emojiBtn.addEventListener('click', function(){ emojiGrid.classList.toggle('hidden'); });
    emojiGrid.querySelectorAll('.emoji-grid-item').forEach(function(item){
      item.addEventListener('click', function(){
        selectedEmoji = item.dataset.emoji;
        emojiBtn.textContent = selectedEmoji;
        emojiGrid.classList.add('hidden');
      });
    });

    document.querySelectorAll('#mc-color-grid .color-swatch').forEach(function(sw){
      sw.addEventListener('click', function(){
        document.querySelectorAll('#mc-color-grid .color-swatch').forEach(function(s){ s.classList.remove('selected'); });
        sw.classList.add('selected');
        selectedColor = sw.dataset.color;
      });
    });

    document.getElementById('mc-add').addEventListener('click', function(){
      var name = document.getElementById('mc-name').value.trim();
      if (!name) { showToast('请输入分类名称'); return; }
      Storage.addCategory({ name:name, icon:selectedEmoji, color:selectedColor });
      showToast('已添加 '+selectedEmoji+' '+name);
      showManageCategories();
    });

    document.querySelectorAll('[data-toggle]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.dataset.toggle;
        var cat = Storage.getAllCategories().find(function(c){ return c.id===id; });
        if (cat && cat.hidden) Storage.showCategory(id);
        else Storage.hideCategory(id);
        showManageCategories();
      });
    });

    document.querySelectorAll('[data-delcat]').forEach(function(btn){
      btn.addEventListener('click', function(){
        showConfirm('删除此自定义分类？','🗑️',function(){
          Storage.deleteCategory(btn.dataset.delcat);
          showToast('已删除');
          showManageCategories();
        },true);
      });
    });

    document.querySelectorAll('[data-mansub]').forEach(function(btn){
      btn.addEventListener('click', function(){ showManageSubcategories(btn.dataset.mansub); });
    });
  }

  // ── MANAGE SUBCATEGORIES ──────────────────────────────
  function showManageSubcategories(catId) {
    var cat = Storage.catById(catId);
    var subs = Storage.getSubcategories(catId);
    var mc = document.getElementById('modal-content');

    var html = '<div class="modal-title">'+cat.icon+' '+esc(cat.name)+' 的子分类</div>';

    html += '<div style="display:flex;gap:8px;margin-bottom:16px">'
      +'<input type="text" class="form-input" id="ms-name" placeholder="新子分类名称" maxlength="20" style="flex:1">'
      +'<button class="manage-btn primary" id="ms-add" style="width:auto;padding:0 16px;border-radius:var(--radius-xs);height:46px;font-size:13px;font-weight:600">添加</button>'
      +'</div>';

    if (subs.length === 0) {
      html += '<div style="text-align:center;padding:24px;color:var(--text-dim);font-size:14px">暂无子分类</div>';
    } else {
      html += '<div class="manage-list">';
      subs.forEach(function(sub){
        html += '<div class="manage-item"><span class="manage-item-icon">·</span>'
          +'<div class="manage-item-name">'+esc(sub.name)+'</div>'
          +'<button class="manage-btn danger" data-delsub="'+sub.id+'">✕</button></div>';
      });
      html += '</div>';
    }

    html += '<button class="form-btn-secondary" id="ms-back">← 返回分类管理</button>';

    mc.innerHTML = html;

    document.getElementById('ms-add').addEventListener('click', function(){
      var name = document.getElementById('ms-name').value.trim();
      if (!name) { showToast('请输入子分类名称'); return; }
      Storage.addSubcategory(catId, name);
      showToast('已添加');
      showManageSubcategories(catId);
    });

    document.querySelectorAll('[data-delsub]').forEach(function(btn){
      btn.addEventListener('click', function(){
        Storage.deleteSubcategory(catId, btn.dataset.delsub);
        showToast('已删除');
        showManageSubcategories(catId);
      });
    });

    document.getElementById('ms-back').addEventListener('click', function(){ showManageCategories(); });
  }

  // ── MANAGE LOCATIONS MODAL ────────────────────────────
  function showManageLocations() {
    var allLocs = Storage.getAllLocations();
    var mc = document.getElementById('modal-content');

    var html = '<div class="modal-title">管理存放位置</div>';

    html += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">'
      +'<button class="emoji-picker-btn" id="ml-emoji-btn">📍</button>'
      +'<input type="text" class="form-input" id="ml-name" placeholder="新位置名称" maxlength="20" style="flex:1">'
      +'<button class="manage-btn primary" id="ml-add" style="width:auto;padding:0 16px;border-radius:var(--radius-xs);height:46px;font-size:13px;font-weight:600">添加</button>'
      +'</div>'
      +'<div class="emoji-grid hidden" id="ml-emoji-grid">';
    EMOJI_PICKS.forEach(function(e){
      html += '<button class="emoji-grid-item" data-emoji="'+e+'">'+e+'</button>';
    });
    html += '</div>';

    html += '<div class="manage-list" style="margin-top:16px">';
    allLocs.forEach(function(loc){
      html += '<div class="manage-item'+(loc.hidden?' hidden-item':'')+'">'
        +'<span class="manage-item-icon">'+loc.icon+'</span>'
        +'<div class="manage-item-name" style="flex:1">'+esc(loc.name)+'</div>';
      if (loc.builtIn) {
        html += '<button class="manage-btn" data-ltoggle="'+loc.id+'">'+(loc.hidden?'👁':'🙈')+'</button>';
      } else {
        html += '<button class="manage-btn danger" data-delloc="'+loc.id+'">✕</button>';
      }
      html += '</div>';
    });
    html += '</div>';

    mc.innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');

    var emojiBtn = document.getElementById('ml-emoji-btn');
    var emojiGrid = document.getElementById('ml-emoji-grid');
    var selEmoji = '📍';

    emojiBtn.addEventListener('click', function(){ emojiGrid.classList.toggle('hidden'); });
    emojiGrid.querySelectorAll('.emoji-grid-item').forEach(function(item){
      item.addEventListener('click', function(){
        selEmoji = item.dataset.emoji;
        emojiBtn.textContent = selEmoji;
        emojiGrid.classList.add('hidden');
      });
    });

    document.getElementById('ml-add').addEventListener('click', function(){
      var name = document.getElementById('ml-name').value.trim();
      if (!name) { showToast('请输入位置名称'); return; }
      Storage.addLocation({ name:name, icon:selEmoji });
      showToast('已添加 '+selEmoji+' '+name);
      showManageLocations();
    });

    document.querySelectorAll('[data-ltoggle]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.dataset.ltoggle;
        var loc = Storage.getAllLocations().find(function(l){ return l.id===id; });
        if (loc && loc.hidden) Storage.showLocation(id);
        else Storage.hideLocation(id);
        showManageLocations();
      });
    });

    document.querySelectorAll('[data-delloc]').forEach(function(btn){
      btn.addEventListener('click', function(){
        showConfirm('删除此自定义位置？','🗑️',function(){
          Storage.deleteLocation(btn.dataset.delloc);
          showToast('已删除');
          showManageLocations();
        },true);
      });
    });
  }

  // ── SETTINGS VIEW ────────────────────────────────────
  function renderSettings() {
    var el = document.getElementById('view-settings');
    var settings = Storage.getSettings();
    var items = Storage.getAllItems();
    var activeCount = items.filter(function(it){ return !it.usedAt; }).length;
    var usedCount = items.filter(function(it){ return !!it.usedAt; }).length;

    var html = '<div class="form-title">设置</div>';

    // Stats
    html += '<div class="settings-section"><div class="settings-section-title">数据统计</div>'
      +'<div class="setting-item" style="cursor:default"><div><div class="setting-label">在管物品</div></div><div style="font-weight:600;color:var(--primary)">'+activeCount+' 件</div></div>'
      +'<div class="setting-item" style="cursor:default"><div><div class="setting-label">已消耗物品</div></div><div style="font-weight:600;color:var(--text-dim)">'+usedCount+' 件</div></div>'
      +'</div>';

    // Category & Location management
    html += '<div class="settings-section"><div class="settings-section-title">分类与位置</div>'
      +'<div class="setting-item" id="set-manage-cats"><div><div class="setting-label">管理物品分类</div><div class="setting-desc">添加、隐藏分类和子分类</div></div><span class="setting-arrow">›</span></div>'
      +'<div class="setting-item" id="set-manage-locs"><div><div class="setting-label">管理存放位置</div><div class="setting-desc">添加、隐藏存放位置</div></div><span class="setting-arrow">›</span></div>'
      +'</div>';

    // Reminder
    html += '<div class="settings-section"><div class="settings-section-title">提醒设置</div>'
      +'<div class="setting-item" style="cursor:default"><div><div class="setting-label">提前提醒天数</div><div class="setting-desc">首页显示即将到期物品</div></div>'
      +'<select class="setting-select" id="set-remind">';
    [1,2,3,5,7,14,30].forEach(function(d){
      html += '<option value="'+d+'"'+(settings.reminderDays===d?' selected':'')+'>'+d+' 天</option>';
    });
    html += '</select></div>'
      +'<div class="setting-item" style="cursor:default"><div><div class="setting-label">显示 FIFO 推荐</div><div class="setting-desc">首页显示先进先出推荐</div></div>'
      +'<label class="toggle"><input type="checkbox" id="set-fifo"'+(settings.showFIFO?' checked':'')+'><span class="toggle-slider"></span></label></div>'
      +'<div class="setting-item" style="cursor:default"><div><div class="setting-label">浏览器通知</div><div class="setting-desc">到期前推送提醒</div></div>'
      +'<label class="toggle"><input type="checkbox" id="set-notif"'+(settings.notificationsEnabled?' checked':'')+'><span class="toggle-slider"></span></label></div>'
      +'</div>';

    // Data
    html += '<div class="settings-section"><div class="settings-section-title">数据管理</div>'
      +'<button class="data-btn" id="set-export">📤 导出数据</button>'
      +'<button class="data-btn" id="set-import">📥 导入数据</button>'
      +'<button class="data-btn danger" id="set-clear">🗑️ 清除所有数据</button></div>';

    // Debug
    html += '<div class="settings-section"><div class="settings-section-title">调试信息</div>'
      +'<button class="data-btn" id="set-debug">🔍 检查数据库状态</button>'
      +'<div id="debug-output" style="display:none;margin-top:8px;padding:12px;background:#f5f5f5;border-radius:8px;font-size:12px;word-break:break-all;max-height:300px;overflow:auto"></div></div>';

    html += '<div style="text-align:center;padding:24px 0;color:var(--text-light);font-size:12px">🍃 保质岛 v3.2<br>家庭物品保质期管理<br>先进先出，不浪费</div>';

    el.innerHTML = html;

    // Events
    document.getElementById('set-manage-cats').addEventListener('click', function(){ showManageCategories(); });
    document.getElementById('set-manage-locs').addEventListener('click', function(){ showManageLocations(); });

    document.getElementById('set-remind').addEventListener('change', function(){
      Storage.updateSettings({ reminderDays:parseInt(this.value) }); showToast('已更新'); updateBadge();
    });
    document.getElementById('set-fifo').addEventListener('change', function(){
      Storage.updateSettings({ showFIFO:this.checked });
    });
    document.getElementById('set-notif').addEventListener('change', function(){
      var cb = this;
      if (cb.checked) {
        if ('Notification' in window) {
          Notification.requestPermission().then(function(p){
            if (p==='granted') { Storage.updateSettings({notificationsEnabled:true}); showToast('通知已开启 🔔'); }
            else { cb.checked=false; showToast('通知权限被拒绝'); }
          });
        } else { cb.checked=false; showToast('浏览器不支持通知'); }
      } else { Storage.updateSettings({notificationsEnabled:false}); }
    });

    document.getElementById('set-export').addEventListener('click', function(){
      var blob = new Blob([Storage.exportData()],{type:'application/json'});
      var a = document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download='shelflife_backup_'+today()+'.json'; a.click(); URL.revokeObjectURL(a.href);
      showToast('数据已导出 📤');
    });
    document.getElementById('set-import').addEventListener('click', function(){
      var input = document.createElement('input'); input.type='file'; input.accept='.json';
      input.onchange = function(){
        var f=input.files[0]; if(!f) return;
        var r=new FileReader();
        r.onload=function(){ try{ Storage.importData(r.result); showToast('数据已导入 📥'); render(); }catch(e){ showToast('导入失败'); } };
        r.readAsText(f);
      };
      input.click();
    });
    document.getElementById('set-debug').addEventListener('click', function(){
      var all = Storage.getAllItems();
      var active = all.filter(function(it){ return !it.usedAt; });
      var consumed = all.filter(function(it){ return !!it.usedAt; });
      var info = '总物品数: ' + all.length + '\n'
        + '在管: ' + active.length + '\n'
        + '已消耗: ' + consumed.length + '\n'
        + '---全部物品---\n';
      all.forEach(function(it, idx){
        info += (idx+1) + '. ' + it.name + ' | qty:' + it.quantity
          + ' | usedAt:' + (it.usedAt || '无')
          + ' | _origQty:' + (it._origQty || '无')
          + ' | id:' + it.id + '\n';
      });
      info += '---函数检查---\n';
      info += 'consumeOne: ' + (typeof Storage.consumeOne) + '\n';
      info += 'restoreItem: ' + (typeof Storage.restoreItem) + '\n';
      info += 'getConsumedItems: ' + (typeof Storage.getConsumedItems) + '\n';
      info += '---localStorage原始数据---\n';
      info += localStorage.getItem('sl_items');
      var el = document.getElementById('debug-output');
      el.style.display = 'block';
      el.textContent = info;
    });
    document.getElementById('set-clear').addEventListener('click', function(){
      showConfirm('确定清除所有数据？<br>此操作无法撤回！','⚠️',function(){ Storage.clearAll(); showToast('数据已清除'); render(); },true);
    });
  }

  // ── Notifications ─────────────────────────────────────
  function checkNotify() {
    var s = Storage.getSettings();
    if (!s.notificationsEnabled || !('Notification' in window) || Notification.permission!=='granted') return;
    var items = Storage.getActiveItems();
    var urgent = items.filter(function(it){ return Storage.daysUntilExpiry(it)<=s.reminderDays; });
    if (urgent.length > 0) {
      var expired = urgent.filter(function(it){ return Storage.daysUntilExpiry(it)<0; });
      var title = expired.length>0 ? '⚠️ '+expired.length+' 件已过期！' : '🔔 '+urgent.length+' 件即将到期';
      var body = urgent.slice(0,3).map(function(it){ return it.name; }).join('、');
      new Notification(title, { body:body, tag:'shelflife' });
    }
  }

  // ── Init ──────────────────────────────────────────────
  (function init() {
    document.querySelectorAll('.tab-btn').forEach(function(btn){
      btn.addEventListener('click', function(){ switchTab(btn.dataset.tab); });
    });
    document.getElementById('modal-overlay').addEventListener('click', function(e){
      if (e.target.id==='modal-overlay') hideModal();
    });
    document.getElementById('bell-btn').addEventListener('click', function(){ switchTab('home'); });
    renderHome();
    checkNotify();
  })();

})();
