'use strict';
const $ = id => document.getElementById(id);
const key = 'unit-price-check:v1';
let items = [];
let storageAvailable = true;

function message(text, error = false) {
  $('message').textContent = text;
  $('message').className = text ? (error ? 'error' : 'success') : '';
}

try {
  const saved = localStorage.getItem(key);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length > 100) throw new Error('invalid storage');
    parsed.forEach(PriceCheck.validate);
    items = parsed;
  }
} catch (_) {
  storageAvailable = false;
  $('storage-note').textContent = '本地记录不可读取，本次仅在页面内保存；旧记录不会被覆盖。';
}

function save() {
  if (!storageAvailable) return;
  try { localStorage.setItem(key, JSON.stringify(items)); }
  catch (_) {
    storageAvailable = false;
    $('storage-note').textContent = '浏览器不允许保存，本次比较仅在当前页面有效。';
  }
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function format(value) {
  return value.toLocaleString('zh-CN', { maximumSignificantDigits: 8 });
}

function render() {
  const root = $('results');
  root.replaceChildren();
  $('clear').disabled = items.length === 0;
  if (!items.length) {
    const empty = element('div', undefined, 'empty');
    empty.append(element('div', '÷', 'empty-icon'), element('h3', '先放进两款商品'), element('p', '把包装的大小换成相同单位，\n答案就一目了然。'));
    root.append(empty);
    return;
  }
  const groups = new Map();
  items.forEach((item, index) => {
    const result = PriceCheck.calculate(item);
    if (!groups.has(result.dimension)) groups.set(result.dimension, []);
    groups.get(result.dimension).push({ item, index, ...result });
  });
  for (const group of groups.values()) {
    const ordered = group.slice().sort((a, b) => a.unitPrice - b.unitPrice);
    const minimum = ordered[0].unitPrice;
    root.append(element('h3', `按${ordered[0].label}比较 · ${group.length}款`, 'group-title'));
    for (const row of ordered) {
      const best = Math.abs(row.unitPrice - minimum) <= Math.max(1, minimum) * 1e-10;
      const card = element('article', undefined, 'product' + (best && group.length > 1 ? ' best' : ''));
      const head = element('div', undefined, 'product-head');
      const remove = element('button', '移除', 'remove');
      remove.type = 'button';
      remove.setAttribute('aria-label', `移除${row.item.name}`);
      remove.addEventListener('click', () => { items.splice(row.index, 1); save(); render(); });
      head.append(element('h3', row.item.name), remove);
      card.append(head);
      if (best && group.length > 1) card.append(element('div', ordered.filter(v => Math.abs(v.unitPrice - minimum) <= Math.max(1, minimum) * 1e-10).length > 1 ? '并列最低单位价' : '本组最低单位价', 'badge'));
      const price = element('p', `¥ ${format(row.unitPrice)} `, 'unit-price');
      price.append(element('span', `/ ${row.label}`));
      card.append(price, element('p', `¥${row.item.price.toFixed(2)} ÷ ${format(row.total)}${row.label} · ${format(row.item.amount)}${row.item.unit === 'piece' ? '件' : row.item.unit} × ${row.item.quantity}件`, 'calculation'));
      if (!best) {
        const difference = row.unitPrice - minimum;
        card.append(element('p', `每${row.label}多 ¥${format(difference)}` + (minimum > 0 ? `，高 ${format(difference / minimum * 100)}%` : ''), 'difference'));
      }
      root.append(card);
    }
  }
}

$('parse').addEventListener('click', () => {
  try {
    const item = PriceCheck.parse($('paste').value);
    for (const field of ['name', 'price', 'amount', 'unit', 'quantity']) $(field).value = item[field];
    message('已识别。请核对到手总价、单件规格和实际件数，再加入比较。');
    $('name').focus();
  } catch (error) { message(error.message, true); }
});

$('product-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    if (items.length >= 100) throw new Error('一次最多比较100款商品，请先移除部分商品。');
    const item = { name: $('name').value.trim(), price: Number($('price').value), amount: Number($('amount').value), unit: $('unit').value, quantity: Number($('quantity').value) };
    PriceCheck.validate(item);
    items.push(item);
    save();
    render();
    $('product-form').reset();
    $('paste').value = '';
    message('已加入比较。可以继续添加另一款商品。');
  } catch (error) { message(error.message, true); }
});

$('sample').addEventListener('click', () => {
  if (items.length > 98) { message('请先移除部分商品再添加示例。', true); return; }
  items.push({ name: '示例牛奶 A', price: 59.9, amount: 250, unit: 'ml', quantity: 24 }, { name: '示例牛奶 B', price: 49.9, amount: 200, unit: 'ml', quantity: 24 });
  save(); render(); message('已添加两款演示商品，价格仅为示例。');
});

$('clear').addEventListener('click', () => {
  if (!confirm('清空当前比较记录？')) return;
  items = []; save(); render(); message('已清空比较记录。');
});
render();
