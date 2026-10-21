/**
 * ÇEKİRDEK · Çizim Motoru
 * ------------------------------------------------------------------
 * Bu dosya, sıfırdan yazılmış mini bir UI çerçevesinin çekirdeğidir.
 * İçerik:
 *   1. Sanal düğüm (vnode) üretimi      -> h()
 *   2. DOM'a bağlama / ayıklama          -> mount() / unmount()
 *   3. Fark bulma (diff) ve yamama        -> patch()
 *   4. Bileşen modeli + yaşam döngüsü
 *   5. Hook'lar                          -> useState / useEffect / ...
 *
 * DOM API'si yalnızca fonksiyon çağrıldığında kullanılır; bu sayede
 * modül Node üzerinde de içe aktarılabilir (testler için).
 */

import { createTracker, releaseDeps, runTracked, signal } from './reaktif.js';

/* ------------------------------------------------------------------ */
/* Sabitler                                                            */
/* ------------------------------------------------------------------ */

/** Metin düğümü için özel tip. */
export const TEXT = Symbol('cekirdek/metin');
/** Birden çok kök düğüm döndüren bileşenler için parça tipi. */
export const FRAGMENT = Symbol('cekirdek/parca');

const isComponentType = (type) =>
  typeof type === 'object' && type !== null && type.__isComponent === true;

/* ------------------------------------------------------------------ */
/* SVG desteği                                                          */
/* ------------------------------------------------------------------ */

/**
 * SVG etiketleri `createElement` ile oluşturulursa HTML elemanı olur ve
 * tarayıcıda görünmez. Bu yüzden SVG ad alanında üretilirler.
 */
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set([
  'svg',
  'circle',
  'ellipse',
  'g',
  'line',
  'path',
  'polygon',
  'polyline',
  'rect',
  'text',
  'tspan',
  'defs',
  'use',
  'symbol',
  'marker',
  'mask',
  'pattern',
  'clipPath',
  'linearGradient',
  'radialGradient',
  'stop',
  'foreignObject',
  'image',
]);

function createElement(tagName) {
  if (SVG_TAGS.has(tagName)) {
    return document.createElementNS(SVG_NAMESPACE, tagName);
  }
  return document.createElement(tagName);
}

/* ------------------------------------------------------------------ */
/* 1. Sanal düğümler                                                    */
/* ------------------------------------------------------------------ */

function createText(value) {
  return {
    type: TEXT,
    props: { nodeValue: value },
    key: null,
    children: [],
    dom: null,
    component: null,
  };
}

/** Çocuk listesini düzleştirir ve metinleri metin düğümüne çevirir. */
function normalizeChildren(input) {
  const output = [];
  const walk = (value) => {
    if (value === null || value === undefined || value === false || value === true) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      output.push(createText(String(value)));
      return;
    }
    output.push(value);
  };
  walk(input);
  return output;
}

/**
 * Sanal düğüm (vnode) oluşturur.
 *   h('div', { class: 'kart' }, 'Merhaba')
 *   h(KonuKarti, { konu }, h('span', null, 'alt bileşen'))
 */
export function h(type, props, ...children) {
  const options = { ...(props || {}) };
  const key = options.key ?? null;
  delete options.key;

  const rawChildren =
    children.length > 0 ? children : options.children !== undefined ? [options.children] : [];
  const childList = normalizeChildren(rawChildren);

  if (isComponentType(type)) {
    // Bileşenlerde children "yuva" (slot) olarak props içinde taşınır.
    options.children = childList;
  } else {
    delete options.children;
  }

  return {
    type,
    props: options,
    key,
    children: childList,
    dom: null,
    component: null,
  };
}

/** Bileşen tanımı oluşturur. */
export function defineComponent(render) {
  return {
    __isComponent: true,
    render,
    displayName: render.displayName || render.name || 'Bilesen',
  };
}

/* ------------------------------------------------------------------ */
/* 2. Bileşen yaşam döngüsü                                             */
/* ------------------------------------------------------------------ */

let currentInstance = null;

function requireInstance(hookName) {
  if (!currentInstance) {
    throw new Error(
      `Çekirdek hatası: ${hookName}() yalnızca bir bileşenin render fonksiyonu içinde çağrılabilir.`
    );
  }
  return currentInstance;
}

function createInstance(vnode, parentDom) {
  const instance = {
    def: vnode.type,
    props: vnode.props,
    hooks: [],
    hookIndex: 0,
    pendingEffects: [],
    rootVNode: null,
    rootDom: null,
    parentDom,
    unmounted: false,
    tracker: createTracker(() => scheduleRender(instance)),
  };
  vnode.component = instance;
  return instance;
}

function renderComponent(instance) {
  releaseDeps(instance.tracker);
  instance.hookIndex = 0;
  instance.pendingEffects.length = 0;

  currentInstance = instance;
  let output;
  try {
    output = runTracked(instance.tracker, () => instance.def.render(instance.props));
  } finally {
    currentInstance = null;
  }
  return normalizeRoot(output);
}

/** Bileşenin döndürdüğü değeri tek bir vnode'a indirger. */
function normalizeRoot(output) {
  if (Array.isArray(output)) {
    return {
      type: FRAGMENT,
      props: {},
      key: null,
      children: normalizeChildren(output),
      dom: null,
      component: null,
    };
  }
  if (output === null || output === undefined || output === false) return createText('');
  if (typeof output === 'string' || typeof output === 'number') return createText(String(output));
  return output;
}

/* ------------------------------------------------------------------ */
/* 3. Zamanlayıcı (bileşen güncellemeleri toplanır)                      */
/* ------------------------------------------------------------------ */

const dirtyComponents = new Set();
let flushScheduled = false;

function scheduleRender(instance) {
  if (instance.unmounted) return;
  dirtyComponents.add(instance);
  if (!flushScheduled) {
    flushScheduled = true;
    queueMicrotask(flushUpdates);
  }
}

function flushUpdates() {
  flushScheduled = false;
  const queue = Array.from(dirtyComponents);
  dirtyComponents.clear();
  for (const instance of queue) {
    if (instance.unmounted) continue;
    rerenderComponent(instance);
  }
}

/* ------------------------------------------------------------------ */
/* 4. Hook'lar                                                          */
/* ------------------------------------------------------------------ */

function depsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

/**
 * Bileşen içi durum. Değer değiştiğinde bileşen otomatik yeniden çizilir.
 *   const [sayac, setSayac] = useState(0);
 */
export function useState(initial) {
  const instance = requireInstance('useState');
  const index = instance.hookIndex;
  instance.hookIndex += 1;

  if (instance.hooks.length <= index) {
    instance.hooks[index] = {
      signal: signal(typeof initial === 'function' ? initial() : initial),
    };
  }

  const hook = instance.hooks[index];
  const setState = (value) => {
    const next = typeof value === 'function' ? value(hook.signal.peek()) : value;
    hook.signal.value = next;
  };

  return [hook.signal.value, setState];
}

/** Değişmeyen referans döndüren kutu (DOM referansları için). */
export function useRef(initial) {
  const instance = requireInstance('useRef');
  const index = instance.hookIndex;
  instance.hookIndex += 1;

  if (instance.hooks.length <= index) {
    instance.hooks[index] = { current: initial };
  }
  return instance.hooks[index];
}

/** Bağımlılıklar değişmediyse yeniden hesaplamayan önbellek. */
export function useMemo(factory, deps) {
  const instance = requireInstance('useMemo');
  const index = instance.hookIndex;
  instance.hookIndex += 1;

  if (instance.hooks.length <= index) {
    instance.hooks[index] = { deps: null, value: undefined, initialized: false };
  }
  const hook = instance.hooks[index];

  if (!hook.initialized || !depsEqual(hook.deps, deps)) {
    hook.value = factory();
    hook.deps = deps ? deps.slice() : null;
    hook.initialized = true;
  }
  return hook.value;
}

/** Çizim sonrası çalışan yan etki. Temizleme fonksiyonu döndürebilir. */
export function useEffect(effectFn, deps) {
  const instance = requireInstance('useEffect');
  const index = instance.hookIndex;
  instance.hookIndex += 1;

  if (instance.hooks.length <= index) {
    instance.hooks[index] = { deps: null, cleanup: null, initialized: false };
  }
  const hook = instance.hooks[index];

  if (!hook.initialized || !depsEqual(hook.deps, deps)) {
    hook.deps = deps ? deps.slice() : null;
    hook.initialized = true;
    instance.pendingEffects.push(() => {
      if (typeof hook.cleanup === 'function') hook.cleanup();
      hook.cleanup = effectFn();
    });
  }
}

function flushEffects(instance) {
  if (!instance.pendingEffects.length) return;
  const queue = instance.pendingEffects.splice(0);
  for (const run of queue) {
    try {
      run();
    } catch (error) {
      console.error('Çekirdek: useEffect içinde hata oluştu:', error);
    }
  }
}

/* ------------------------------------------------------------------ */
/* 5. DOM'a bağlama / ayıklama / yamalama                               */
/* ------------------------------------------------------------------ */

export function mount(vnode, parentDom) {
  if (vnode.type === TEXT) {
    const node = document.createTextNode(vnode.props.nodeValue);
    vnode.dom = node;
    vnode.parentDom = parentDom;
    parentDom.appendChild(node);
    return node;
  }

  if (vnode.type === FRAGMENT) {
    const host = document.createElement('div');
    host.style.display = 'contents';
    host.setAttribute('data-parca', '');
    vnode.dom = host;
    vnode.parentDom = parentDom;
    for (const child of vnode.children) mount(child, host);
    parentDom.appendChild(host);
    return host;
  }

  if (isComponentType(vnode.type)) {
    return mountComponent(vnode, parentDom);
  }

  const element = createElement(vnode.type);
  vnode.dom = element;
  vnode.parentDom = parentDom;
  applyProps(element, {}, vnode.props);
  for (const child of vnode.children) mount(child, element);
  parentDom.appendChild(element);
  return element;
}

function mountComponent(vnode, parentDom) {
  const instance = createInstance(vnode, parentDom);
  const root = renderComponent(instance);
  instance.rootVNode = root;
  const dom = mount(root, parentDom);
  instance.rootDom = dom;
  vnode.dom = dom;
  // İlk çizimde kaydedilen yan etkiler de çalışmalı.
  flushEffects(instance);
  return dom;
}

function rerenderComponent(instance) {
  if (instance.unmounted) return;
  const next = renderComponent(instance);
  const previous = instance.rootVNode;
  instance.rootVNode = next;
  const dom = patch(previous, next, instance.parentDom);
  instance.rootDom = dom;
  flushEffects(instance);
}

/** Eski vnode yerine yenisini yerleştirir; konum korunur. */
export function patch(previous, next, parentDom) {
  if (previous === next) return previous.dom;

  if (previous.type !== next.type) {
    const oldDom = previous.dom;
    const dom = mount(next, parentDom);
    if (oldDom && oldDom.parentNode === parentDom) {
      parentDom.insertBefore(dom, oldDom);
    }
    unmount(previous);
    return dom;
  }

  if (next.type === TEXT) {
    if (previous.props.nodeValue !== next.props.nodeValue) {
      previous.dom.nodeValue = next.props.nodeValue;
    }
    next.dom = previous.dom;
    next.parentDom = previous.parentDom;
    return next.dom;
  }

  if (isComponentType(next.type)) {
    const instance = previous.component;
    next.component = instance;
    instance.parentDom = parentDom;
    const changed = !shallowEqual(previous.props, next.props);
    instance.props = next.props;
    if (changed) rerenderComponent(instance);
    next.dom = instance.rootDom;
    return next.dom;
  }

  if (next.type === FRAGMENT) {
    next.dom = previous.dom;
    next.parentDom = previous.parentDom;
    patchChildren(previous.dom, previous.children, next.children);
    return next.dom;
  }

  const element = previous.dom;
  next.dom = element;
  next.parentDom = previous.parentDom;
  applyProps(element, previous.props, next.props);
  patchChildren(element, previous.children, next.children);
  return element;
}

/**
 * Anahtar (key) destekli çocuk listesi farkı.
 * Eski çocuklar yeniden kullanılır, fazlalıklar silinir, sıra düzeltilir.
 */
function patchChildren(parentDom, oldChildren, newChildren) {
  const oldByKey = new Map();
  oldChildren.forEach((child, index) => {
    oldByKey.set(child.key !== null ? `k:${child.key}` : `i:${index}`, child);
  });

  const used = new Set();
  const orderedDoms = [];

  newChildren.forEach((newChild, index) => {
    const key = newChild.key !== null ? `k:${newChild.key}` : `i:${index}`;
    const oldChild = oldByKey.get(key);
    if (oldChild && !used.has(oldChild) && oldChild.type === newChild.type) {
      used.add(oldChild);
      orderedDoms.push(patch(oldChild, newChild, parentDom));
    } else {
      orderedDoms.push(mount(newChild, parentDom));
    }
  });

  for (const child of oldChildren) {
    if (!used.has(child)) unmount(child);
  }

  // DOM sırasını yeni çocuk sırasıyla eşleştir.
  let previousDom = null;
  for (const dom of orderedDoms) {
    const expected = previousDom ? previousDom.nextSibling : parentDom.firstChild;
    if (dom !== expected) parentDom.insertBefore(dom, expected);
    previousDom = dom;
  }
}

export function unmount(vnode) {
  if (!vnode) return;

  if (vnode.component) {
    const instance = vnode.component;
    instance.unmounted = true;
    dirtyComponents.delete(instance);
    releaseDeps(instance.tracker);
    for (const hook of instance.hooks) {
      if (hook && typeof hook.cleanup === 'function') {
        try {
          hook.cleanup();
        } catch (error) {
          console.error('Çekirdek: temizleme hatası:', error);
        }
        hook.cleanup = null;
      }
    }
    if (instance.rootVNode) unmount(instance.rootVNode);
    return;
  }

  for (const child of vnode.children) unmount(child);
  if (vnode.dom && vnode.dom.parentNode) {
    vnode.dom.parentNode.removeChild(vnode.dom);
  }
}

/* ------------------------------------------------------------------ */
/* 6. Karşılaştırma yardımcıları                                        */
/* ------------------------------------------------------------------ */

function vnodeEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.type !== b.type || a.key !== b.key) return false;
  if (a.type === TEXT) return a.props.nodeValue === b.props.nodeValue;
  return shallowEqual(a.props, b.props);
}

function vnodeListEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!vnodeEqual(a[i], b[i])) return false;
  }
  return true;
}

function shallowEqual(a = {}, b = {}) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (key === 'children') continue;
    if (!Object.is(a[key], b[key])) return false;
  }
  return vnodeListEqual(a.children, b.children);
}

/* ------------------------------------------------------------------ */
/* 7. Öznitelik uygulama                                               */
/* ------------------------------------------------------------------ */

const ATTRIBUTE_ALIASES = {
  className: 'class',
  htmlFor: 'for',
  readOnly: 'readonly',
  tabIndex: 'tabindex',
  maxLength: 'maxlength',
  minLength: 'minlength',
  autoComplete: 'autocomplete',
  autoFocus: 'autofocus',
  colSpan: 'colspan',
  rowSpan: 'rowspan',
  crossOrigin: 'crossorigin',
  spellCheck: 'spellcheck',
  contentEditable: 'contenteditable',
  noValidate: 'novalidate',
  srcSet: 'srcset',
  dateTime: 'datetime',
};

const EVENT_ALIASES = {
  onDoubleClick: 'dblclick',
};

function attributeName(key) {
  return ATTRIBUTE_ALIASES[key] || key;
}

function eventName(key) {
  if (EVENT_ALIASES[key]) return EVENT_ALIASES[key];
  return key.slice(2).toLowerCase();
}

function styleProperty(key) {
  if (key.startsWith('--')) return key;
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function classListOf(value) {
  const set = new Set();
  if (!value) return set;
  if (typeof value === 'string') {
    value.split(/\s+/).filter(Boolean).forEach((cls) => set.add(cls));
    return set;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => classListOf(item).forEach((cls) => set.add(cls)));
    return set;
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([cls, enabled]) => {
      if (enabled) set.add(cls);
    });
  }
  return set;
}

function applyClass(element, previous, next) {
  const wanted = classListOf(next);
  classListOf(previous).forEach((cls) => {
    if (!wanted.has(cls)) element.classList.remove(cls);
  });
  wanted.forEach((cls) => {
    if (!element.classList.contains(cls)) element.classList.add(cls);
  });
}

function applyStyle(element, previous, next) {
  if (typeof next === 'string') {
    element.style.cssText = next;
    return;
  }
  const nextObject = next || {};
  const previousObject = previous && typeof previous === 'object' ? previous : {};
  Object.keys(previousObject).forEach((key) => {
    if (!(key in nextObject)) element.style.removeProperty(styleProperty(key));
  });
  Object.keys(nextObject).forEach((key) => {
    element.style.setProperty(styleProperty(key), nextObject[key] == null ? '' : String(nextObject[key]));
  });
}

function applyProps(element, previousProps, nextProps) {
  for (const key of Object.keys(previousProps)) {
    if (key === 'children' || key === 'ref') continue;
    if (key in nextProps) continue;
    if (key.startsWith('on') && typeof previousProps[key] === 'function') {
      element.removeEventListener(eventName(key), previousProps[key]);
    } else if (key === 'style') {
      element.removeAttribute('style');
    } else {
      element.removeAttribute(attributeName(key));
    }
  }

  for (const key of Object.keys(nextProps)) {
    if (key === 'children') continue;
    const previous = previousProps[key];
    const next = nextProps[key];

    if (key === 'ref') {
      if (typeof next === 'function') next(element);
      continue;
    }

    if (key === 'style') {
      applyStyle(element, previous, next);
      continue;
    }
    if (key === 'class' || key === 'className') {
      applyClass(element, previous, next);
      continue;
    }
    if (key === 'value' && 'value' in element) {
      const text = next == null ? '' : String(next);
      // Kontrollü input: sadece gerçekten değişen değer yazılır,
      // böylece kullanıcının yazdığı metin imleç konumunu bozmaz.
      if (element.__cekirdekDeger !== text) {
        element.__cekirdekDeger = text;
        element.value = text;
      }
      continue;
    }
    if (key === 'checked' && 'checked' in element) {
      element.checked = Boolean(next);
      continue;
    }
    if (key === 'disabled' && 'disabled' in element) {
      element.disabled = Boolean(next);
      continue;
    }
    if (key === 'selected' && 'selected' in element) {
      element.selected = Boolean(next);
      continue;
    }
    if (key.startsWith('on') && typeof next === 'function') {
      if (typeof previous === 'function') element.removeEventListener(eventName(key), previous);
      element.addEventListener(eventName(key), next);
      continue;
    }
    if (previous === next) continue;
    if (next == null || next === false) {
      element.removeAttribute(attributeName(key));
    } else if (next === true) {
      element.setAttribute(attributeName(key), '');
    } else {
      element.setAttribute(attributeName(key), String(next));
    }
  }
}

/* ------------------------------------------------------------------ */
/* 8. Genel API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Bir bileşeni verilen kapsayıcıya bağlar.
 *   render(App, {}, document.getElementById('uygulama'));
 */
export function render(def, props, container) {
  const vnode = h(def, props || {});
  container.textContent = '';
  const dom = mount(vnode, container);
  return {
    dom,
    unmount() {
      unmount(vnode);
    },
  };
}
