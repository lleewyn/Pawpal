// Serialize module initialization; an older request cannot replace a newer view.
export function createLatestRenderer() {
    let version = 0;
    let tail = Promise.resolve();
    return {
        begin() { return ++version; },
        isCurrent(ticket) { return ticket === version; },
        commit(ticket, render) {
            const next = tail.catch(() => {}).then(async () => {
                if (ticket !== version) return false;
                await render();
                return true;
            });
            tail = next;
            return next;
        }
    };
}
