/* Regression checks on the exact navigation helper in the beta runtime. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('beta/assets/globe.js', 'utf8');
const start = source.indexOf('function navigateOptions(');
const end = source.indexOf('function encounterDisclosures(', start);
assert(start >= 0 && end > start);
let focused = null, scrolled = null;
const root = {
  contains: b => items.includes(b),
  querySelectorAll: () => items,
};
const make = (name, extra = {}) => ({
  name, disabled: false,
  getClientRects: () => [1], visibility: 'visible',
  focus() { focused = this.name; },
  scrollIntoView() { scrolled = this.name; },
  closest() { return this; },
  ...extra,
});
const items = [
  make('A'), make('disabled', {disabled: true}),
  make('hidden', {getClientRects: () => []}),
  make('B'), make('invisible', {visibility: 'hidden'}), make('C'),
];
const {navigateOptions} = vm.runInNewContext(source.slice(start, end) + '\n({navigateOptions})', {
  clamp: (v, a, b) => Math.max(a, Math.min(v, b)),
  getComputedStyle: el => ({visibility: el.visibility}),
});
function press(target, key, extra = {}) {
  const event = {
    target, key, defaultPrevented: false, stopped: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.stopped = true; },
    ...extra,
  };
  focused = null; scrolled = null;
  const handled = navigateOptions(event, root, 'button');
  return {handled, focused, scrolled, prevented: event.defaultPrevented, stopped: event.stopped};
}
for (const [index, key, expected] of [[0,'ArrowRight','B'],[3,'ArrowLeft','A'],[3,'ArrowDown','C'],[5,'ArrowUp','B'],[0,'Home','A'],[0,'End','C'],[5,'ArrowRight','C']]) {
  assert.deepEqual(press(items[index],key), {handled:true,focused:expected,scrolled:expected,prevented:true,stopped:true});
}
for (const [key,extra] of [['Enter',{}],['Tab',{}],['ArrowLeft',{shiftKey:true}],['ArrowRight',{isComposing:true}],['ArrowRight',{ctrlKey:true}],['ArrowLeft',{metaKey:true}]]) {
  assert.equal(press(items[0],key,extra).handled,false);
}
assert.equal(press(make('outside'),'ArrowRight').handled,false);
console.log('Globe keyboard: focus-only arrows, boundaries, hidden/disabled skips, native typing/modifiers passed.');
