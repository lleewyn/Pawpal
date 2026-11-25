'use strict';

const MAX_RULE_CHARACTERS = 12000;
const PRIORITY_KEYS = [
    'bot_role', 'privacy_security', 'anti_hallucination_rule', 'pet_health_safety',
    'agent_handover_rule', 'consultation_scope', 'core_communication_principle',
    'persona_identity', 'single_booking_rule', 'booking_support', 'payment_voucher_rule',
    'pawpoints_rule', 'account_support', 'pet_profile_guideline', 'product_consulting',
    'pet_spa_guideline', 'pet_hotel_guideline', 'pet_taxi_guideline',
    'care_timeline_guideline', 'complaint_handling'
];
const priority = new Map(PRIORITY_KEYS.map((key, index) => [key, index]));

function selectPromptRules(rows) {
    const sorted = (Array.isArray(rows) ? rows : [])
        .filter(row => row && row.is_active !== false && typeof row.prompt_key === 'string'
            && typeof row.content === 'string' && row.content.trim())
        .map(row => ({ ...row, content: row.content.trim() }))
        .sort((a, b) => (priority.get(a.prompt_key) ?? PRIORITY_KEYS.length)
            - (priority.get(b.prompt_key) ?? PRIORITY_KEYS.length)
            || a.prompt_key.localeCompare(b.prompt_key, 'en') || a.content.localeCompare(b.content, 'en'));
    const seen = new Set(), selected = [];
    let characters = 0;
    for (const row of sorted) {
        if (seen.has(row.prompt_key) || characters + row.content.length + 1 > MAX_RULE_CHARACTERS) continue;
        seen.add(row.prompt_key);
        selected.push(row);
        characters += row.content.length + 1;
    }
    return selected;
}

module.exports = { selectPromptRules, MAX_RULE_CHARACTERS, PRIORITY_KEYS };
