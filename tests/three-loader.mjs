// 让 Node 也能 import 核心几何模块：src/ 用的是浏览器 importmap 的裸说明符 'three'，
// Node 不认识。这里把裸说明符重定向到 public/vendor 下已 vendored 的同一份运行时，
// 于是 tests/ 可以直接对 geometry.js、model.js 做数值断言，而不必把几何逻辑再抄一遍——
// 抄一遍就只能验自己抄得对不对，验不出 src 有没有错。
const VENDOR = new URL('../public/vendor/three/', import.meta.url).href;

export function resolve(specifier, context, next) {
  if (specifier === 'three') return next(`${VENDOR}three.module.js`, context);
  if (specifier.startsWith('three/addons/')) return next(`${VENDOR}addons/${specifier.slice('three/addons/'.length)}`, context);
  return next(specifier, context);
}
