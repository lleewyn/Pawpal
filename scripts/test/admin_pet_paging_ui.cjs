const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('http://localhost:3000/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' }));
        await page.route(/\.css(?:\?|$)/, route => route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(process.cwd(), new URL(route.request().url()).pathname), 'utf8') }));
        await page.goto('http://localhost:3000/');
        await page.setContent('<link rel="stylesheet" href="/pages/admin/admin.css"><link rel="stylesheet" href="/pages/admin/modules/pets/pets.css"><div class="admin-module-wrapper">'
            + fs.readFileSync('pages/admin/modules/pets/pets.html', 'utf8') + '</div>');
        await page.evaluate(() => {
            window._pawpalAdminLoaded = true;
            sessionStorage.setItem('pawpal_admin_active_module', 'Thú cưng');
            window.petCalls = [];
            window.petHandlers = {};
            window.petFailure = false;
            window.petSource = Array.from({ length: 24 }, (_, index) => ({ id: 'raw-' + index, pet_code: 'PET-' + index, pet_name: 'Pet ' + index,
                customer_id: 'owner-' + index, breed_id: index % 2 ? 'cat' : 'dog', status: 'active', updated_at: 'v1', safety_note: index === 0 ? 'Safety note' : null }));
            const contextPet = index => ({ id: 'raw-' + index, pet_code: 'PET-' + index, pet_name: 'Pet ' + index, customer_id: 'owner-' + index, breed_id: 'dog', status: 'active', updated_at: 'v1' });
            window.getSupabaseClient = () => ({
                rpc: async (name, args = {}) => {
                    petCalls.push({ name, args });
                    if (name === 'get_admin_pet_reminder_sources') return { data: { appointments: [{ id: 'appt-600', pet_id: 'raw-600', customer_id: 'owner-600',
                        appointment_status: 'completed', appointment_date: '2020-01-01T01:00:00Z', service: { service_name: 'Tắm' } }], contacts: [] } };
                    if (name !== 'admin_pet_page') throw new Error('Unexpected RPC ' + name);
                    if (petFailure) return { error: { code: 'test_failure' } };
                    if (args.p_owner_query !== null) {
                        const owners = Array.from({ length: 24 }, (_, index) => ({ id: 'owner-' + index, name: 'Owner ' + index, phone: '0901234567', petCount: 1 }));
                        owners.push({ id: 'owner-500', name: 'Owner 500', phone: '0901234567', petCount: 1 });
                        const matches = owners.filter(owner => owner.name.toLowerCase().includes(args.p_owner_query.toLowerCase()));
                        return { data: { owners: matches.slice(0, 15), ownerTotal: matches.length } };
                    }
                    let matches = petSource.filter(pet => !args.p_query || (pet.pet_name + ' ' + pet.pet_code).toLowerCase().includes(args.p_query.toLowerCase()));
                    if (args.p_species !== 'ALL') matches = matches.filter(pet => pet.breed_id === args.p_species);
                    if (args.p_alert) matches = matches.filter(pet => pet.safety_note);
                    if (args.p_ids) matches = [...petSource, contextPet(500), contextPet(600)].filter(pet => args.p_ids.includes(pet.id) || args.p_ids.includes(pet.pet_code));
                    const number = Math.min(args.p_page, Math.max(1, Math.ceil(matches.length / args.p_size)));
                    const rows = matches.slice((number - 1) * args.p_size, number * args.p_size);
                    return { data: { total: matches.length, page: number, revision: 'snapshot-v1', pageIds: rows.map(pet => pet.id), pets: rows,
                        stats: { total: petSource.length, dog: petSource.filter(pet => pet.breed_id === 'dog').length,
                            cat: petSource.filter(pet => pet.breed_id === 'cat').length, other: 0, alert: petSource.filter(pet => pet.safety_note).length }, weights: rows.map(pet => ({ pet_id: pet.id, weight: 5 })),
                        breeds: ['dog', 'cat'].map(id => ({ id, breed_name: id === 'dog' ? 'Corgi' : 'Mèo ta', is_active: true, species: { id, species_name: id === 'dog' ? 'Chó' : 'Mèo', is_active: true } })),
                        custAcc: rows.map(pet => ({ id: pet.customer_id })), custProf: rows.map(pet => ({ customer_id: pet.customer_id, full_name: 'Owner ' + pet.customer_id.split('-')[1] })),
                        phones: rows.map(pet => ({ customer_id: pet.customer_id, phone_number: '0901234567' })) } };
                },
                channel() { const channel = { on(event, filter, callback) { petHandlers[filter.table] = callback; return channel; }, subscribe() { return channel; } }; return channel; },
                from(table) {
                    const query = { select() { return query; }, eq() { return query; }, order() { return query; }, in() { return query; },
                        range() { return Promise.resolve({ data: [], count: 0 }); },
                        limit() { petCalls.push({ table }); return Promise.resolve({ data: [{ id: 'log-500', appointment_id: 'appt-500', description: 'Care entry', recorded_at: '2026-10-24', appointment: { id: 'appt-500', pet_id: 'raw-500', customer_id: 'owner-500' } }] }); },
                        then(resolve) { resolve({ data: [] }); } };
                    return query;
                }
            });
        });
        for (const file of ['pets.js', 'subtabs/tab-pet-list.js', 'subtabs/tab-pet-profile.js', 'subtabs/tab-pet-carelog.js', 'subtabs/tab-pet-reminders.js']) {
            await page.addScriptTag({ content: fs.readFileSync('pages/admin/modules/pets/' + file, 'utf8') });
        }
        await page.waitForFunction(() => document.querySelectorAll('#petTableTbody tr[data-id]').length === 10);
        await page.evaluate(() => PawpalPets.init());
        assert.equal(await page.evaluate(() => petCalls.length), 1);
        assert.equal(await page.locator('#petStatTotal').innerText(), '24');
        await page.click('#petNextPageBtn');
        await page.waitForFunction(() => document.querySelector('#petTableTbody tr')?.dataset.id === 'PET-10');
        await page.click('#petNextPageBtn');
        await page.waitForFunction(() => document.querySelectorAll('#petTableTbody tr[data-id]').length === 4);
        assert.equal(await page.evaluate(() => petCalls.length), 3);
        await page.click('#petPageNumbersContainer button >> text=1');
        await page.waitForFunction(() => document.querySelector('#petTableTbody tr')?.dataset.id === 'PET-0');
        assert.equal(await page.evaluate(() => petCalls.length), 3);
        await page.fill('#petSearchInput', 'Pet 23');
        await page.waitForFunction(() => document.querySelectorAll('#petTableTbody tr[data-id]').length === 1);
        assert.equal(await page.evaluate(() => petCalls.length), 4);
        await page.fill('#petSearchInput', '');
        await page.waitForFunction(() => document.querySelectorAll('#petTableTbody tr[data-id]').length === 10);
        await page.selectOption('#petFilterSpecies', 'cat');
        await page.waitForFunction(() => document.querySelector('#petTableTbody tr')?.dataset.id === 'PET-1');
        await page.click('#petNextPageBtn');
        await page.waitForFunction(() => document.querySelectorAll('#petTableTbody tr[data-id]').length === 2);
        const downloadPromise = page.waitForEvent('download');
        await page.click('#btnExportPetReport');
        const download = await downloadPromise;
        assert.equal(fs.readFileSync(await download.path(), 'utf8').trim().split('\n').length, 13);
        assert.equal(await page.locator('#petTableTbody tr[data-id]').count(), 2);
        await page.click('#btnOpenAddPetModal');
        await page.fill('#newPetOwnerInput', 'Owner 500');
        await page.waitForFunction(() => document.querySelector('#newPetOwnerDropdown')?.textContent.includes('Owner 500'));
        await page.locator('#newPetOwnerDropdown .autocomplete-item').click();
        assert.equal(await page.inputValue('#newPetOwner'), 'owner-500');
        await page.keyboard.press('Escape');
        await page.evaluate(() => PawpalPets.switchSubtab('tab-pet-carelog'));
        await page.waitForFunction(() => document.querySelector('#petCarelogsListTbody')?.textContent.includes('Pet 500'));
        await page.evaluate(() => PawpalPets.switchSubtab('tab-pet-reminders'));
        await page.waitForFunction(() => PawpalPets.state.remindersLoadStatus === 'loaded');
        assert.ok(await page.evaluate(() => !!PawpalPets.getPet('raw-600')));
        await page.evaluate(() => PawpalPets.subtabs.profile.openPetProfile('raw-500'));
        await page.waitForFunction(() => document.getElementById('drawerPetName').textContent === 'Pet 500');
        await page.evaluate(() => {
            delete PawpalPets.state.petsData['PET-500'];
            sessionStorage.setItem('pawpal_admin_pet_id', 'PET-500');
            document.getElementById('drawerPetName').textContent = 'Waiting';
            return PawpalPets.init();
        });
        await page.waitForFunction(() => document.getElementById('drawerPetName').textContent === 'Pet 500');
        assert.equal(await page.evaluate(() => sessionStorage.getItem('pawpal_admin_pet_id')), 'PET-500');
        await page.evaluate(() => PawpalPets.switchSubtab('tab-pet-list'));
        await page.selectOption('#petFilterSpecies', 'ALL');
        await page.waitForFunction(() => document.querySelector('#petTableTbody tr')?.dataset.id === 'PET-0');
        await page.evaluate(() => { petFailure = true; return PawpalPets.refreshPetsData({ petIds: ['raw-0'] }); });
        await page.waitForSelector('#btnRetryPetPage');
        assert.equal(await page.locator('#petStatTotal').innerText(), '—');
        await page.evaluate(() => { petFailure = false; });
        await page.click('#btnRetryPetPage');
        await page.waitForFunction(() => document.querySelectorAll('#petTableTbody tr[data-id]').length === 10);
        let before = await page.evaluate(() => petCalls.length);
        await page.evaluate(() => {
            petSource[0].pet_name = 'Updated';
            for (let index = 0; index < 8; index++) petHandlers.pet_profile({ new: { id: 'raw-0' }, old: { id: 'raw-0' } });
            return PawpalPets.refreshPetsData({ petIds: ['raw-0'] });
        });
        assert.equal(await page.evaluate(() => petCalls.length), before + 1);
        assert.match(await page.locator('#petTableTbody').innerText(), /Updated/);
        await page.click('#petNextPageBtn');
        await page.waitForFunction(() => document.querySelector('#petTableTbody tr')?.dataset.id === 'PET-10');
        await page.click('#petNextPageBtn');
        await page.waitForFunction(() => document.querySelectorAll('#petTableTbody tr[data-id]').length === 4);
        before = await page.evaluate(() => petCalls.length);
        await page.evaluate(() => {
            petSource = petSource.slice(0, 13);
            petHandlers.pet_profile({ new: {}, old: { id: 'raw-23' } });
            return PawpalPets.refreshPetsData({ petIds: ['raw-23'] });
        });
        assert.equal(await page.locator('#petTableTbody tr[data-id]').count(), 3);
        assert.equal(await page.locator('#petPageNumbersContainer .active').innerText(), '2');
        assert.equal(await page.locator('#petStatTotal').innerText(), '13');
        assert.equal(await page.evaluate(() => petCalls.length), before + 1);
        await page.evaluate(() => PawpalPets.subtabs.profile.openPetProfile('PET-23'));
        await page.waitForFunction(() => PawpalPets.getPet('PET-23') === null);
        await page.evaluate(() => PawpalPets.switchSubtab('tab-pet-list'));
        before = await page.evaluate(() => petCalls.length);
        await page.evaluate(() => {
            sessionStorage.setItem('pawpal_admin_active_module', 'Other');
            petHandlers.pet_profile({ new: { id: 'raw-1' }, old: { id: 'raw-1' } });
        });
        await page.waitForTimeout(450);
        assert.equal(await page.evaluate(() => petCalls.length), before);
        await page.evaluate(() => {
            sessionStorage.setItem('pawpal_admin_active_module', 'Thú cưng');
            dispatchEvent(new CustomEvent('admin:module-show', { detail: { module: 'Thú cưng' } }));
        });
        await page.waitForFunction(before => petCalls.length > before, before);
        assert.equal(await page.evaluate(() => petCalls.length), before + 1);
        assert.deepEqual(errors, []);
        console.log('PASS server pages, cache, filters, KPI, full export, owner lookup, auxiliary contexts, restored/deleted profiles, error/retry, Realtime coalescing and inactive-module deferral. Mock RPC only.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
