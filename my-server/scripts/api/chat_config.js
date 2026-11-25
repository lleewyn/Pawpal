/**
 * Quản lý Cấu hình & Feature Toggles Phân hệ Chatbot (G5-05)
 * Cung cấp công tắc tính năng (feature flags), kiểm soát lùi (rollback) và chế độ kiểm duyệt.
 */

const DEFAULT_CONFIG = {
    // 1. Feature flags theo master plan G5-05 & PR-06
    copilot_read_enabled: process.env.COPILOT_READ_ENABLED !== 'false',
    copilot_draft_enabled: process.env.COPILOT_DRAFT_ENABLED !== 'false',
    ticket_action_enabled: process.env.TICKET_ACTION_ENABLED !== 'false',
    points_action_enabled: process.env.POINTS_ACTION_ENABLED !== 'false',
    raw_reveal_enabled: process.env.RAW_REVEAL_ENABLED !== 'false',

    // PR-06: Công tắc tính năng & Triển khai có kiểm soát (Kill Switches)
    ai_bot_reply_enabled: process.env.ENABLE_AI_BOT_REPLY !== 'false',
    copilot_ai_enabled: process.env.ENABLE_COPILOT_AI !== 'false',
    fast_path_enabled: process.env.FAST_PATH_ENABLED !== 'false',
    rollout_stage: process.env.CHATBOT_ROLLOUT_STAGE || 'all', // 'internal' | 'pilot' | 'all'

    // 2. Chế độ kiểm duyệt (auto | manual_review) - tuyệt đối không có chế độ tắt bảo vệ
    moderation_mode: process.env.MODERATION_MODE || 'auto',

    // 3. Giới hạn tài nguyên Copilot & Thao tác
    max_tool_iterations: 3,
    context_char_limit: 2000,
    min_stock_threshold: 5,
    action_preview_ttl_ms: 10 * 60 * 1000, // 10 phút

    // 4. Phiên bản hệ thống
    version: '1.6.0-PR06-PROD',
    last_updated: new Date().toISOString()
};

// In-memory runtime override (cho phép Admin điều chỉnh nóng trong phiên làm việc)
let runtimeConfig = { ...DEFAULT_CONFIG };

function getChatConfig() {
    return { ...runtimeConfig };
}

function updateChatConfig(newConfig = {}) {
    // Bảo vệ không cho phép xóa/bật các giá trị nguy hiểm
    if (newConfig.moderation_mode && !['auto', 'manual_review'].includes(newConfig.moderation_mode)) {
        throw new Error('Chế độ kiểm duyệt chỉ được là "auto" hoặc "manual_review".');
    }

    runtimeConfig = {
        ...runtimeConfig,
        ...newConfig,
        last_updated: new Date().toISOString()
    };
    return { ...runtimeConfig };
}

function isFeatureEnabled(featureName) {
    if (Object.prototype.hasOwnProperty.call(runtimeConfig, featureName)) {
        return Boolean(runtimeConfig[featureName]);
    }
    return true;
}

module.exports = {
    getChatConfig,
    updateChatConfig,
    isFeatureEnabled,
    DEFAULT_CONFIG
};
