(function (root) {
  'use strict';
  const units = {
    ml: { dimension: 'volume', factor: 0.001, label: '升' },
    l: { dimension: 'volume', factor: 1, label: '升' },
    g: { dimension: 'weight', factor: 0.001, label: '公斤' },
    kg: { dimension: 'weight', factor: 1, label: '公斤' },
    piece: { dimension: 'count', factor: 1, label: '件' }
  };
  const aliases = { 毫升: 'ml', 升: 'l', 克: 'g', 千克: 'kg', 公斤: 'kg', 件: 'piece', 颗: 'piece', 粒: 'piece', 节: 'piece' };
  const number = '([+-]?\\d+(?:\\.\\d+)?)';
  const size = number + '\\s*(毫升|千克|公斤|ml|kg|升|克|l|g|件|颗|粒|节)(?![a-z])';

  function parse(text) {
    const input = String(text).normalize('NFKC').replace(/[Xx＊*](?=\s*\d)/g, '×');
    const specs = [...input.matchAll(new RegExp(size, 'gi'))].filter((spec, index) => index === 0 || !(aliases[spec[2]] === 'piece' && /×\s*$/.test(input.slice(0, spec.index))));
    if (specs.length !== 1) throw new Error('请保留一款商品的一种规格，例如 250ml×24盒；也可以直接手动填写。');
    const spec = specs[0];
    const unit = aliases[spec[2]] || spec[2].toLowerCase();
    let quantity = 1;
    let rest = input.slice(spec.index + spec[0].length);
    // shortcut: 只自动识别规格之后的包装乘数，倒序和买赠组合请手动核对，出现真实需求再扩展。
    const pack = /^\s*×\s*(\d+)(?![\d.])\s*(?:盒|瓶|罐|袋|包|提|箱|组|件|颗|粒|节)?/;
    let match;
    while ((match = rest.match(pack))) {
      quantity *= Number(match[1]);
      rest = rest.slice(match[0].length);
    }
    if (/[×+赠送]/.test(rest) || /[×+赠送]/.test(input.slice(0, spec.index)) || /^\s*\d+\s*(?:盒|瓶|罐|袋|包|提|箱|组|件|颗|粒|节)/.test(rest)) {
      throw new Error('包装顺序或买赠规则需要核对，请按单件规格和实际总件数手动填写。');
    }
    const finalPrices = [...input.matchAll(new RegExp('(?:券后(?:价)?|到手(?:价)?|实付)\\s*[:：]?\\s*[¥￥]?\\s*' + number, 'g'))];
    const prices = finalPrices.length ? finalPrices : [...input.matchAll(new RegExp(number + '\\s*元|[¥￥]\\s*' + number, 'g'))];
    if (prices.length !== 1) throw new Error('价格不明确，请保留一个到手价，例如“券后59.9元”，或手动填写。');
    const price = Number(prices[0][1] || prices[0][2]);
    const item = { name: input.slice(0, spec.index).replace(/[，,：:;；\s]+$/g, '') || '未命名商品', price, amount: Number(spec[1]), unit, quantity };
    validate(item);
    return item;
  }

  function validate(item) {
    if (!item || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80) throw new Error('商品名应为 1–80 个字符。');
    if (typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0 || item.price > 100000000 || Math.abs(item.price * 100 - Math.round(item.price * 100)) > 0.00001) throw new Error('到手总价须为 0–1亿元，最多两位小数。');
    if (typeof item.amount !== 'number' || !Number.isFinite(item.amount) || item.amount <= 0 || item.amount > 1000000000) throw new Error('单件规格须大于 0，且不超过 10亿。');
    if (!Object.hasOwn(units, item.unit)) throw new Error('请选择支持的计量单位。');
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0 || item.quantity > 1000000) throw new Error('实际件数须为 1–100万之间的整数。');
    return item;
  }

  function calculate(item) {
    validate(item);
    const unit = units[item.unit];
    const total = item.amount * item.quantity * unit.factor;
    return { total, unitPrice: item.price / total, dimension: unit.dimension, label: unit.label };
  }

  const api = { parse, validate, calculate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PriceCheck = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
