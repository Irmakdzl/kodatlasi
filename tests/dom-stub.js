/**
 * Testler için minik DOM taklidi.
 * ------------------------------------------------------------------
 * Gerçek tarayıcı olmadan mount/patch/ bileşen davranışını doğrulamak
 * için gereken en küçük DOM yüzeyini taklit eder. Üretim kodunda
 * kullanılmaz.
 */

class Style {
  constructor() {
    this._props = new Map();
  }

  setProperty(name, value) {
    if (value === '' || value == null) this._props.delete(name);
    else this._props.set(name, String(value));
  }

  removeProperty(name) {
    this._props.delete(name);
  }

  getPropertyValue(name) {
    return this._props.get(name) || '';
  }

  get cssText() {
    return Array.from(this._props.entries())
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }

  set cssText(value) {
    this._props.clear();
    String(value)
      .split(';')
      .forEach((part) => {
        const [key, ...rest] = part.split(':');
        if (key && rest.length) this.setProperty(key.trim(), rest.join(':').trim());
      });
  }
}

class ClassList {
  constructor(element) {
    this.element = element;
    this.set = new Set();
  }

  /** Gerçek DOM gibi davranır: değişiklikler `class` özniteliğine yansır. */
  sync() {
    this.element.attributes.class = Array.from(this.set).join(' ');
  }

  add(...names) {
    names.forEach((name) => name && this.set.add(name));
    this.sync();
  }

  remove(...names) {
    names.forEach((name) => this.set.delete(name));
    this.sync();
  }

  contains(name) {
    return this.set.has(name);
  }
}

class FakeNode {
  constructor(tagName) {
    this.tagName = tagName ? String(tagName).toUpperCase() : undefined;
    this.nodeType = tagName === undefined ? 3 : 1;
    this.childNodes = [];
    this.parentNode = null;
    this.attributes = {};
    this.style = new Style();
    this.classList = new ClassList(this);
    this.listeners = {};
    this.nodeValue = null;
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  get nextSibling() {
    if (!this.parentNode) return null;
    const index = this.parentNode.childNodes.indexOf(this);
    return this.parentNode.childNodes[index + 1] || null;
  }

  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  insertBefore(child, reference) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    const index = reference ? this.childNodes.indexOf(reference) : -1;
    if (index === -1) this.childNodes.push(child);
    else this.childNodes.splice(index, 0, child);
    return child;
  }

  removeChild(child) {
    const index = this.childNodes.indexOf(child);
    if (index !== -1) this.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'class') {
      this.classList.set = new Set(String(value).split(/\s+/).filter(Boolean));
    }
  }

  removeAttribute(name) {
    delete this.attributes[name];
    if (name === 'class') this.classList.set = new Set();
  }

  getAttribute(name) {
    return name in this.attributes ? this.attributes[name] : null;
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  removeEventListener(type, handler) {
    const list = this.listeners[type];
    if (!list) return;
    const index = list.indexOf(handler);
    if (index !== -1) list.splice(index, 1);
  }

  dispatch(type, event = {}) {
    const list = this.listeners[type] || [];
    list.slice().forEach((handler) => handler({ type, target: this, ...event }));
  }

  focus() {
    this.focused = true;
  }

  blur() {
    this.focused = false;
  }

  select() {}

  click(event = {}) {
    this.dispatch('click', event);
  }

  get textContent() {
    if (this.nodeType === 3) return this.nodeValue;
    return this.childNodes.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    this.childNodes = [];
    if (this.nodeType === 3) this.nodeValue = String(value);
  }

  /** Testlerde ağacı okunabilir biçimde yazdırır. */
  dump(indent = 0) {
    const pad = '  '.repeat(indent);
    if (this.nodeType === 3) return `${pad}"${this.nodeValue}"`;
    const attrs = Object.entries(this.attributes)
      .map(([key, value]) => ` ${key}="${value}"`)
      .join('');
    const style = this.style.cssText ? ` style="${this.style.cssText}"` : '';
    const classes = this.classList.set.size ? ` class="${[...this.classList.set].join(' ')}"` : '';
    const head = `${pad}<${this.tagName.toLowerCase()}${attrs}${classes}${style}>`;
    const children = this.childNodes.map((child) => child.dump(indent + 1)).join('\n');
    return children ? `${head}\n${children}` : head;
  }
}

/** Global `document` taklidini kurar ve geri döndürülebilir bir temizleyici verir. */
export function installDom() {
  const previousDocument = globalThis.document;
  const previousQueueMicrotask = globalThis.queueMicrotask;
  const previousWindow = globalThis.window;

  globalThis.document = {
    createElement(tagName) {
      return new FakeNode(tagName);
    },
    createElementNS(_namespace, tagName) {
      const node = new FakeNode(tagName);
      node.namespaceURI = _namespace;
      return node;
    },
    createTextNode(text) {
      const node = new FakeNode(undefined);
      node.nodeValue = String(text);
      return node;
    },
    getElementById() {
      return null;
    },
    documentElement: { setAttribute() {} },
  };

  // Testlerin deterministik olması için mikro kuyruğunu senkron çalıştır.
  const pending = [];
  globalThis.queueMicrotask = (fn) => {
    pending.push(fn);
  };
  const flush = () => {
    while (pending.length) pending.shift()();
  };

  // `window` taklidi: olay dinleyicileri ve zamanlayıcılar.
  const windowListeners = new Map();
  globalThis.window = {
    addEventListener(type, handler) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      const list = windowListeners.get(type);
      if (!list) return;
      const index = list.indexOf(handler);
      if (index !== -1) list.splice(index, 1);
    },
    dispatch(type, event = {}) {
      (windowListeners.get(type) || []).slice().forEach((handler) =>
        handler({ type, preventDefault() {}, ...event })
      );
    },
    setTimeout: (...args) => setTimeout(...args),
    clearTimeout: (...args) => clearTimeout(...args),
    confirm: () => true,
  };

  return {
    flush,
    document: globalThis.document,
    window: globalThis.window,
    restore() {
      globalThis.document = previousDocument;
      globalThis.queueMicrotask = previousQueueMicrotask;
      globalThis.window = previousWindow;
    },
  };
}

export { FakeNode };
