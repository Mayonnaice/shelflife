// ── Data Model & Storage Layer ─────────────────────────
var CATEGORIES = [
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

var LOCATIONS = [
  { id: 'fridge',    name: '冰箱冷藏', icon: '🧊' },
  { id: 'freezer',   name: '冰箱冷冻', icon: '❄️' },
  { id: 'pantry',    name: '储物柜',   icon: '🏠' },
  { id: 'kitchen',   name: '厨房台面', icon: '🍳' },
  { id: 'bathroom',  name: '浴室',     icon: '🚿' },
  { id: 'bedroom',   name: '卧室',     icon: '🛏️' },
  { id: 'living',    name: '客厅',     icon: '🛋️' },
  { id: 'other',     name: '其他位置', icon: '📍' }
];

var UNITS = ['个', '瓶', '盒', '袋', '罐', '包', '支', '片', '升', '斤', '克', '条', '管', '对', '套'];

var DEFAULT_SETTINGS = {
  reminderDays: 3,
  notificationsEnabled: false,
  showFIFO: true,
  sortBy: 'expiry'
};

var Storage = (function() {
  var ITEMS_KEY = 'shelflife_items';
  var SETTINGS_KEY = 'shelflife_settings';
  var ID_KEY = 'shelflife_next_id';

  function _read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch(e) { return fallback; }
  }

  function _write(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function nextId() {
    var id = _read(ID_KEY, 1000);
    _write(ID_KEY, id + 1);
    return 'item_' + id;
  }

  function getAllItems() {
    return _read(ITEMS_KEY, []);
  }

  function getActiveItems() {
    return getAllItems().filter(function(it) { return !it.usedAt; });
  }

  function getItem(id) {
    return getAllItems().find(function(it) { return it.id === id; }) || null;
  }

  function addItem(data) {
    var items = getAllItems();
    var item = {
      id: nextId(),
      name: data.name || '',
      categoryId: data.categoryId || 'other',
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
    _write(ITEMS_KEY, items);
    return item;
  }

  function updateItem(id, data) {
    var items = getAllItems();
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        for (var k in data) {
          if (data.hasOwnProperty(k)) items[i][k] = data[k];
        }
        break;
      }
    }
    _write(ITEMS_KEY, items);
  }

  function markUsed(id) {
    updateItem(id, { usedAt: Date.now() });
  }

  function deleteItem(id) {
    var items = getAllItems().filter(function(it) { return it.id !== id; });
    _write(ITEMS_KEY, items);
  }

  function getSettings() {
    var s = _read(SETTINGS_KEY, {});
    for (var k in DEFAULT_SETTINGS) {
      if (!(k in s)) s[k] = DEFAULT_SETTINGS[k];
    }
    return s;
  }

  function updateSettings(data) {
    var s = getSettings();
    for (var k in data) {
      if (data.hasOwnProperty(k)) s[k] = data[k];
    }
    _write(SETTINGS_KEY, s);
  }

  function _today() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function daysUntilExpiry(item) {
    if (!item.expiryDate) return Infinity;
    var effectiveExpiry = item.expiryDate;
    if (item.opened && item.openedDate && item.afterOpeningDays) {
      var openDate = new Date(item.openedDate);
      openDate.setDate(openDate.getDate() + item.afterOpeningDays);
      var openExpiry = openDate.getFullYear() + '-' +
        String(openDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(openDate.getDate()).padStart(2, '0');
      if (openExpiry < effectiveExpiry) effectiveExpiry = openExpiry;
    }
    var exp = new Date(effectiveExpiry + 'T00:00:00');
    var now = new Date(_today() + 'T00:00:00');
    return Math.round((exp - now) / 86400000);
  }

  function statusClass(days) {
    if (days < 0) return 'expired';
    if (days <= 3) return 'danger';
    if (days <= 7) return 'warning';
    return 'safe';
  }

  function statusText(days) {
    if (days < 0) return '已过期 ' + Math.abs(days) + ' 天';
    if (days === 0) return '今天到期！';
    return '剩余 ' + days + ' 天';
  }

  function getFIFOItems(activeItems) {
    var groups = {};
    activeItems.forEach(function(item) {
      var key = item.name.trim().toLowerCase() + '|' + item.locationId;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    var fifoIds = {};
    Object.keys(groups).forEach(function(key) {
      var group = groups[key];
      if (group.length > 1) {
        group.sort(function(a, b) {
          return a.purchaseDate < b.purchaseDate ? -1 : a.purchaseDate > b.purchaseDate ? 1 : 0;
        });
        fifoIds[group[0].id] = true;
      }
    });
    return fifoIds;
  }

  function getUrgentCount() {
    var items = getActiveItems();
    var settings = getSettings();
    var count = 0;
    items.forEach(function(item) {
      var d = daysUntilExpiry(item);
      if (d <= settings.reminderDays) count++;
    });
    return count;
  }

  function exportData() {
    return JSON.stringify({
      items: getAllItems(),
      settings: getSettings(),
      exportedAt: Date.now()
    });
  }

  function importData(jsonStr) {
    var data = JSON.parse(jsonStr);
    if (data.items) _write(ITEMS_KEY, data.items);
    if (data.settings) _write(SETTINGS_KEY, data.settings);
  }

  function clearAll() {
    localStorage.removeItem(ITEMS_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(ID_KEY);
  }

  return {
    getAllItems: getAllItems,
    getActiveItems: getActiveItems,
    getItem: getItem,
    addItem: addItem,
    updateItem: updateItem,
    markUsed: markUsed,
    deleteItem: deleteItem,
    getSettings: getSettings,
    updateSettings: updateSettings,
    daysUntilExpiry: daysUntilExpiry,
    statusClass: statusClass,
    statusText: statusText,
    getFIFOItems: getFIFOItems,
    getUrgentCount: getUrgentCount,
    exportData: exportData,
    importData: importData,
    clearAll: clearAll,
    CATEGORIES: CATEGORIES,
    LOCATIONS: LOCATIONS,
    UNITS: UNITS
  };
})();
