// ── 保质岛 Storage Layer ───────────────────────────────
var BUILTIN_CATEGORIES = [
  { id: 'food',      name: '食品干货', icon: '🥫', color: '#E8A87C' },
  { id: 'vegetable', name: '蔬菜水果', icon: '🥬', color: '#85B79D' },
  { id: 'meat',      name: '肉蛋水产', icon: '🥩', color: '#E07A5F' },
  { id: 'dairy',     name: '乳制品',   icon: '🥛', color: '#F5E6CC' },
  { id: 'bread',     name: '面包烘焙', icon: '🍞', color: '#DEB887' },
  { id: 'frozen',    name: '冷冻食品', icon: '🧊', color: '#81B1D3' },
  { id: 'beverage',  name: '饮料酒水', icon: '🧃', color: '#FFDAC1' },
  { id: 'snack',     name: '零食',     icon: '🍪', color: '#F0D9B5' },
  { id: 'seasoning', name: '调味料',   icon: '🧂', color: '#D4C5A9' },
  { id: 'medicine',  name: '药品',     icon: '💊', color: '#B5EAD7' },
  { id: 'personal',  name: '洗护美妆', icon: '🧴', color: '#FFB7B2' },
  { id: 'cleaning',  name: '清洁用品', icon: '🧹', color: '#C7CEEA' },
  { id: 'baby',      name: '母婴用品', icon: '🍼', color: '#FFE5EC' },
  { id: 'pet',       name: '宠物用品', icon: '🐾', color: '#E8D5B7' },
  { id: 'other',     name: '其他',     icon: '📦', color: '#D4C5A9' }
];

var BUILTIN_LOCATIONS = [
  { id: 'fridge',    name: '冰箱冷藏', icon: '🧊' },
  { id: 'freezer',   name: '冰箱冷冻', icon: '❄️' },
  { id: 'pantry',    name: '储物柜',   icon: '🏠' },
  { id: 'kitchen',   name: '厨房台面', icon: '🍳' },
  { id: 'bathroom',  name: '浴室',     icon: '🚿' },
  { id: 'bedroom',   name: '卧室',     icon: '🛏️' },
  { id: 'living',    name: '客厅',     icon: '🛋️' },
  { id: 'other',     name: '其他位置', icon: '📍' }
];

var UNITS = ['个','瓶','盒','袋','罐','包','支','片','升','斤','克','条','管','对','套'];

var EMOJI_PICKS = [
  '🥫','🥬','🥩','🥛','🍞','🧊','🧃','🍪','🧂','🍕','🍜','🍱',
  '🍣','🍩','🍰','🥗','🌽','🍎','🍌','🥚','🧀','🍫','🍭','🥜',
  '🍚','🍝','🥤','🍺','🍷','🧈','🥡','🫘','🍯','🥥','🫒','🧅',
  '🧴','🧹','🧼','🧽','💊','🩹','🪥','🧻','🔦','🕯️','🪴','🧯',
  '👕','👟','🧢','💍','⌚','🎮','📚','✏️','🧶','🎨','🎁','🔧',
  '🍼','🧸','🐾','🐱','🐕','📦','🔑','🏷️','💡','🧲','🪣','🛒',
  '❄️','🏠','🍳','🚿','🛏️','🛋️','📍','🚗','🗄️','🧳','🏪','🏢'
];

var COLOR_PALETTE = [
  '#E8A87C','#85B79D','#E07A5F','#F5E6CC','#DEB887','#81B1D3',
  '#FFDAC1','#F0D9B5','#D4C5A9','#B5EAD7','#FFB7B2','#C7CEEA',
  '#FFE5EC','#E8D5B7','#A8E890','#F9E79F','#AED6F1','#D7BDE2'
];

var DEFAULT_SETTINGS = {
  reminderDays: 3,
  notificationsEnabled: false,
  showFIFO: true,
  sortBy: 'expiry'
};

var Storage = (function() {
  var K = {
    items: 'sl_items',
    settings: 'sl_settings',
    nextId: 'sl_nid',
    customCats: 'sl_ccats',
    hiddenCats: 'sl_hcats',
    customLocs: 'sl_clocs',
    hiddenLocs: 'sl_hlocs',
    subcats: 'sl_subcats'
  };

  // v1 → v2 自动数据迁移
  (function migrate() {
    var OLD = { items: 'shelflife_items', settings: 'shelflife_settings', nextId: 'shelflife_next_id' };
    var hasOld = localStorage.getItem(OLD.items);
    var hasNew = localStorage.getItem(K.items);
    if (hasOld && !hasNew) {
      localStorage.setItem(K.items, hasOld);
      var oldSettings = localStorage.getItem(OLD.settings);
      if (oldSettings) localStorage.setItem(K.settings, oldSettings);
      var oldId = localStorage.getItem(OLD.nextId);
      if (oldId) localStorage.setItem(K.nextId, oldId);
      localStorage.removeItem(OLD.items);
      localStorage.removeItem(OLD.settings);
      localStorage.removeItem(OLD.nextId);
    }
  })();

  function _r(key, fb) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; }
    catch(e) { return fb; }
  }
  function _w(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  function _uid(prefix) {
    var id = _r(K.nextId, 1000);
    _w(K.nextId, id + 1);
    return (prefix || 'id') + '_' + id;
  }

  function _today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  // ── Categories ──────────────────────────────────────
  function getVisibleCategories() {
    var hidden = _r(K.hiddenCats, []);
    var customs = _r(K.customCats, []);
    var cats = BUILTIN_CATEGORIES.filter(function(c) { return hidden.indexOf(c.id) < 0; });
    return cats.concat(customs);
  }

  function getAllCategories() {
    var customs = _r(K.customCats, []);
    return BUILTIN_CATEGORIES.map(function(c) {
      var hidden = _r(K.hiddenCats, []);
      return Object.assign({}, c, { builtIn: true, hidden: hidden.indexOf(c.id) >= 0 });
    }).concat(customs.map(function(c) {
      return Object.assign({}, c, { builtIn: false, hidden: false });
    }));
  }

  function addCategory(data) {
    var customs = _r(K.customCats, []);
    var cat = { id: _uid('cat'), name: data.name, icon: data.icon, color: data.color };
    customs.push(cat);
    _w(K.customCats, customs);
    return cat;
  }

  function updateCategory(id, data) {
    var isBuiltIn = BUILTIN_CATEGORIES.some(function(c) { return c.id === id; });
    if (isBuiltIn) return;
    var customs = _r(K.customCats, []);
    for (var i = 0; i < customs.length; i++) {
      if (customs[i].id === id) {
        for (var k in data) { if (data.hasOwnProperty(k)) customs[i][k] = data[k]; }
        break;
      }
    }
    _w(K.customCats, customs);
  }

  function deleteCategory(id) {
    var customs = _r(K.customCats, []);
    _w(K.customCats, customs.filter(function(c) { return c.id !== id; }));
    var subs = _r(K.subcats, {});
    delete subs[id];
    _w(K.subcats, subs);
  }

  function hideCategory(id) {
    var hidden = _r(K.hiddenCats, []);
    if (hidden.indexOf(id) < 0) { hidden.push(id); _w(K.hiddenCats, hidden); }
  }

  function showCategory(id) {
    var hidden = _r(K.hiddenCats, []);
    _w(K.hiddenCats, hidden.filter(function(h) { return h !== id; }));
  }

  function catById(id) {
    var all = getAllCategories();
    return all.find(function(c) { return c.id === id; }) || { id:'other', name:'未知', icon:'📦', color:'#D4C5A9' };
  }

  // ── Subcategories ───────────────────────────────────
  function getSubcategories(catId) {
    var subs = _r(K.subcats, {});
    return subs[catId] || [];
  }

  function addSubcategory(catId, name) {
    var subs = _r(K.subcats, {});
    if (!subs[catId]) subs[catId] = [];
    var sub = { id: _uid('sub'), name: name };
    subs[catId].push(sub);
    _w(K.subcats, subs);
    return sub;
  }

  function deleteSubcategory(catId, subId) {
    var subs = _r(K.subcats, {});
    if (!subs[catId]) return;
    subs[catId] = subs[catId].filter(function(s) { return s.id !== subId; });
    if (subs[catId].length === 0) delete subs[catId];
    _w(K.subcats, subs);
  }

  function subById(catId, subId) {
    if (!subId) return null;
    var subs = getSubcategories(catId);
    return subs.find(function(s) { return s.id === subId; }) || null;
  }

  // ── Locations ───────────────────────────────────────
  function getVisibleLocations() {
    var hidden = _r(K.hiddenLocs, []);
    var customs = _r(K.customLocs, []);
    return BUILTIN_LOCATIONS.filter(function(l) { return hidden.indexOf(l.id) < 0; }).concat(customs);
  }

  function getAllLocations() {
    var customs = _r(K.customLocs, []);
    return BUILTIN_LOCATIONS.map(function(l) {
      var hidden = _r(K.hiddenLocs, []);
      return Object.assign({}, l, { builtIn: true, hidden: hidden.indexOf(l.id) >= 0 });
    }).concat(customs.map(function(l) {
      return Object.assign({}, l, { builtIn: false, hidden: false });
    }));
  }

  function addLocation(data) {
    var customs = _r(K.customLocs, []);
    var loc = { id: _uid('loc'), name: data.name, icon: data.icon };
    customs.push(loc);
    _w(K.customLocs, customs);
    return loc;
  }

  function deleteLocation(id) {
    var customs = _r(K.customLocs, []);
    _w(K.customLocs, customs.filter(function(l) { return l.id !== id; }));
  }

  function hideLocation(id) {
    var hidden = _r(K.hiddenLocs, []);
    if (hidden.indexOf(id) < 0) { hidden.push(id); _w(K.hiddenLocs, hidden); }
  }

  function showLocation(id) {
    var hidden = _r(K.hiddenLocs, []);
    _w(K.hiddenLocs, hidden.filter(function(h) { return h !== id; }));
  }

  function locById(id) {
    var all = getAllLocations();
    return all.find(function(l) { return l.id === id; }) || { id:'other', name:'未知', icon:'📍' };
  }

  // ── Items ───────────────────────────────────────────
  function getAllItems() { return _r(K.items, []); }

  function getActiveItems() {
    return getAllItems().filter(function(it) { return !it.usedAt; });
  }

  function getItem(id) {
    return getAllItems().find(function(it) { return it.id === id; }) || null;
  }

  function addItem(data) {
    var items = getAllItems();
    var item = {
      id: _uid('item'),
      name: data.name || '',
      categoryId: data.categoryId || 'other',
      subcategoryId: data.subcategoryId || null,
      locationId: data.locationId || 'other',
      purchaseDate: data.purchaseDate || _today(),
      expiryDate: data.expiryDate || '',
      quantity: data.quantity || 1,
      unit: data.unit || '个',
      notes: data.notes || '',
      opened: false,
      openedDate: null,
      afterOpeningDays: data.afterOpeningDays || null,
      createdAt: Date.now(),
      usedAt: null
    };
    items.push(item);
    _w(K.items, items);
    return item;
  }

  function updateItem(id, data) {
    var items = getAllItems();
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        for (var k in data) { if (data.hasOwnProperty(k)) items[i][k] = data[k]; }
        break;
      }
    }
    _w(K.items, items);
  }

  function consumeOne(id) {
    var items = getAllItems();
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        if (!items[i]._origQty) items[i]._origQty = items[i].quantity;
        items[i].quantity = Math.max(0, items[i].quantity - 1);
        if (items[i].quantity === 0) items[i].usedAt = Date.now();
        break;
      }
    }
    _w(K.items, items);
  }

  function markUsed(id) {
    var items = getAllItems();
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        if (!items[i]._origQty) items[i]._origQty = items[i].quantity;
        items[i].usedAt = Date.now();
        break;
      }
    }
    _w(K.items, items);
  }

  function restoreItem(id) {
    var items = getAllItems();
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        items[i].usedAt = null;
        if (items[i]._origQty) { items[i].quantity = items[i]._origQty; delete items[i]._origQty; }
        else if (items[i].quantity === 0) items[i].quantity = 1;
        break;
      }
    }
    _w(K.items, items);
  }

  function getConsumedItems() {
    return getAllItems().filter(function(it) { return !!it.usedAt; });
  }

  function deleteItem(id) {
    _w(K.items, getAllItems().filter(function(it) { return it.id !== id; }));
  }

  // ── Settings ────────────────────────────────────────
  function getSettings() {
    var s = _r(K.settings, {});
    for (var k in DEFAULT_SETTINGS) { if (!(k in s)) s[k] = DEFAULT_SETTINGS[k]; }
    return s;
  }

  function updateSettings(data) {
    var s = getSettings();
    for (var k in data) { if (data.hasOwnProperty(k)) s[k] = data[k]; }
    _w(K.settings, s);
  }

  // ── Helpers ─────────────────────────────────────────
  function daysUntilExpiry(item) {
    if (!item.expiryDate) return Infinity;
    var eff = item.expiryDate;
    if (item.opened && item.openedDate && item.afterOpeningDays) {
      var od = new Date(item.openedDate);
      od.setDate(od.getDate() + item.afterOpeningDays);
      var oe = od.getFullYear() + '-' + String(od.getMonth()+1).padStart(2,'0') + '-' + String(od.getDate()).padStart(2,'0');
      if (oe < eff) eff = oe;
    }
    return Math.round((new Date(eff+'T00:00:00') - new Date(_today()+'T00:00:00')) / 86400000);
  }

  function statusClass(days) {
    if (days < 0) return 'expired';
    if (days <= 3) return 'danger';
    if (days <= 7) return 'warning';
    return 'safe';
  }

  function getFIFOItems(activeItems) {
    var groups = {};
    activeItems.forEach(function(item) {
      var key = item.name.trim().toLowerCase() + '|' + item.locationId;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    var ids = {};
    Object.keys(groups).forEach(function(key) {
      var g = groups[key];
      if (g.length > 1) {
        g.sort(function(a,b) { return a.purchaseDate < b.purchaseDate ? -1 : a.purchaseDate > b.purchaseDate ? 1 : 0; });
        ids[g[0].id] = true;
      }
    });
    return ids;
  }

  function getUrgentCount() {
    var s = getSettings();
    var count = 0;
    getActiveItems().forEach(function(it) { if (daysUntilExpiry(it) <= s.reminderDays) count++; });
    return count;
  }

  function getCategoryStats() {
    var items = getActiveItems();
    var stats = {};
    items.forEach(function(it) {
      if (!stats[it.categoryId]) stats[it.categoryId] = 0;
      stats[it.categoryId] += it.quantity;
    });
    return stats;
  }

  function exportData() {
    return JSON.stringify({
      items: getAllItems(),
      settings: getSettings(),
      customCats: _r(K.customCats, []),
      hiddenCats: _r(K.hiddenCats, []),
      customLocs: _r(K.customLocs, []),
      hiddenLocs: _r(K.hiddenLocs, []),
      subcats: _r(K.subcats, {}),
      exportedAt: Date.now()
    });
  }

  function importData(json) {
    var d = JSON.parse(json);
    if (d.items) _w(K.items, d.items);
    if (d.settings) _w(K.settings, d.settings);
    if (d.customCats) _w(K.customCats, d.customCats);
    if (d.hiddenCats) _w(K.hiddenCats, d.hiddenCats);
    if (d.customLocs) _w(K.customLocs, d.customLocs);
    if (d.hiddenLocs) _w(K.hiddenLocs, d.hiddenLocs);
    if (d.subcats) _w(K.subcats, d.subcats);
  }

  function clearAll() { Object.values(K).forEach(function(k) { localStorage.removeItem(k); }); }

  return {
    getVisibleCategories: getVisibleCategories,
    getAllCategories: getAllCategories,
    addCategory: addCategory,
    updateCategory: updateCategory,
    deleteCategory: deleteCategory,
    hideCategory: hideCategory,
    showCategory: showCategory,
    catById: catById,
    getSubcategories: getSubcategories,
    addSubcategory: addSubcategory,
    deleteSubcategory: deleteSubcategory,
    subById: subById,
    getVisibleLocations: getVisibleLocations,
    getAllLocations: getAllLocations,
    addLocation: addLocation,
    deleteLocation: deleteLocation,
    hideLocation: hideLocation,
    showLocation: showLocation,
    locById: locById,
    getAllItems: getAllItems,
    getActiveItems: getActiveItems,
    getItem: getItem,
    addItem: addItem,
    updateItem: updateItem,
    consumeOne: consumeOne,
    markUsed: markUsed,
    restoreItem: restoreItem,
    getConsumedItems: getConsumedItems,
    deleteItem: deleteItem,
    getSettings: getSettings,
    updateSettings: updateSettings,
    daysUntilExpiry: daysUntilExpiry,
    statusClass: statusClass,
    getFIFOItems: getFIFOItems,
    getUrgentCount: getUrgentCount,
    getCategoryStats: getCategoryStats,
    exportData: exportData,
    importData: importData,
    clearAll: clearAll
  };
})();
