/**
 * ÇEKİRDEK · Genel API
 * Uygulama kodunun yalnızca bu dosyadan içe aktarma yapması yeterlidir.
 */

export { signal, computed, effect, watch, batch, untrack } from './reaktif.js';

export {
  h,
  render,
  defineComponent,
  useState,
  useRef,
  useMemo,
  useEffect,
  TEXT,
  FRAGMENT,
} from './motor.js';
