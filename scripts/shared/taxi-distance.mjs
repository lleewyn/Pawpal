// Deterministic simulation shared by customer and staff booking forms.
export function estimatedTaxiDistance(pickup, dropoff) {
    const normalize = value => String(value || '').normalize('NFC').trim().toLocaleLowerCase('vi').replace(/\s+/g, ' ');
    const from = normalize(pickup), to = normalize(dropoff);
    if (!from || !to) return null;
    if (from === to) return 0;
    let hash = 0;
    for (const character of [from, to].sort().join('|')) hash = (hash * 31 + character.codePointAt(0)) >>> 0;
    return (10 + hash % 291) / 10;
}
