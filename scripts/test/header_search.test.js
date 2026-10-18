const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture(value) {
    const events = {}, formEvents = {}, iconEvents = {};
    const input = { value, closest: () => ({ addEventListener: (name, fn) => { formEvents[name] = fn; } }), addEventListener: (name, fn) => { events[name] = fn; } };
    const icon = { style: {}, addEventListener: (name, fn) => { iconEvents[name] = fn; } };
    const bar = { dataset: {}, querySelector: name => name === 'input' ? input : icon };
    const location = { href: '/#current-position' };
    const source = fs.readFileSync('components/header/header.js', 'utf8');
    const start = source.indexOf('    function setupHeaderSearch()');
    const end = source.indexOf('\n    // -------------------------------------------------------------', start);
    const context = { window: { location }, document: { querySelectorAll: () => [bar] } };
    vm.createContext(context);
    vm.runInContext(source.slice(start, end) + '\nsetupHeaderSearch();', context);
    return { events, formEvents, iconEvents, location };
}

for (const value of ['', '   ', '\t\n']) {
    test(`empty search ${JSON.stringify(value)} cancels Enter, icon click and form submission`, () => {
        const f = fixture(value);
        for (const handler of [f.events.keydown, f.iconEvents.click, f.formEvents.submit]) {
            let prevented = false, stopped = false;
            handler({ key: 'Enter', preventDefault: () => { prevented = true; }, stopPropagation: () => { stopped = true; } });
            assert.equal(prevented, true);
            assert.equal(stopped, true);
            assert.equal(f.location.href, '/#current-position');
        }
    });
}

test('nonempty header search trims and encodes the query', () => {
    const f = fixture('  thức ăn & mèo  ');
    f.events.keydown({ key: 'Enter', preventDefault() {}, stopPropagation() {} });
    assert.equal(f.location.href, '/shop?search=' + encodeURIComponent('thức ăn & mèo'));
});
