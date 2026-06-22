const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../assets/css/user/dashboard.css');
let content = fs.readFileSync(filePath, 'utf8');

const settingsStyles = `
/* ==========================================================================
   REDESIGNED SETTINGS TAB STYLES (Mockup Compatibility)
   ========================================================================== */

.settings-grid-custom {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: var(--space-md);
    align-items: start;
}

.settings-column {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}

.settings-card-custom {
    background: var(--color-bg-white);
    border: var(--border-card);
    border-radius: var(--card-border-radius);
    padding: var(--space-md);
    box-shadow: var(--shadow-card);
}

.settings-card-header-custom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 10px;
}

.settings-card-header-custom .settings-card-title-custom {
    font-family: var(--font-heading);
    font-size: 1.2rem;
    color: var(--color-text-dark);
    font-weight: 700;
    margin: 0;
}

.settings-card-body-custom {
    padding-top: 10px;
}

.form-label-custom {
    font-weight: 600;
    color: var(--color-text-dark);
    font-size: 0.8rem;
    margin-bottom: 6px;
    display: block;
}

.form-control-custom {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: #f8fafc;
    font-size: 0.85rem;
    color: var(--color-text-dark);
    transition: border-color 0.2s;
}

.form-control-custom:focus {
    border-color: var(--color-primary);
    outline: none;
}

.password-input-wrapper-custom {
    position: relative;
}

.password-input-wrapper-custom .form-control-custom {
    padding-right: 42px;
}

.btn-toggle-password-custom {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--color-text-light);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
}

.btn-toggle-password-custom:hover {
    color: var(--color-primary);
}

/* Strength meter */
.strength-label-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
    font-weight: 700;
    margin-top: 6px;
}

.strength-title {
    color: var(--color-text-light);
    letter-spacing: 0.5px;
}

.strength-value-label {
    color: var(--color-text-light);
}

.password-strength-bar-custom {
    display: flex;
    gap: 8px;
    height: 4px;
    margin-top: 6px;
}

.strength-bar-segment {
    flex: 1;
    background-color: #cbd5e1;
    border-radius: 2px;
    transition: background-color 0.2s;
}

.strength-bar-segment.weak {
    background-color: var(--color-danger);
}

.strength-bar-segment.medium {
    background-color: var(--color-accent);
}

.strength-bar-segment.strong {
    background-color: var(--color-success);
}

.settings-action-row {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-top: 16px;
}

.btn-submit-custom {
    border: none;
    border-radius: 24px;
    padding: 10px 24px;
    font-weight: 700;
    color: #ffffff;
    background-color: var(--color-primary-dark);
    cursor: pointer;
    transition: background-color 0.2s;
}

.btn-submit-custom:hover:not(:disabled) {
    background-color: var(--color-primary);
}

.btn-submit-custom:disabled {
    background-color: #cbd5e1;
    color: #94a3b8;
    cursor: not-allowed;
}

/* Social links custom */
.social-links-list-custom {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.social-link-item-custom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: #ffffff;
}

.social-info-custom {
    display: flex;
    align-items: center;
    gap: 12px;
}

.social-text-custom {
    display: flex;
    flex-direction: column;
}

.social-name-custom {
    font-weight: 700;
    color: var(--color-text-dark);
    font-size: 0.85rem;
}

.social-email-custom {
    font-size: 0.75rem;
    color: var(--color-text-light);
}

.btn-social-action-custom {
    border: none;
    border-radius: 15px;
    padding: 4px 16px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s, color 0.2s;
}

.btn-social-action-custom.disconnect-btn {
    background-color: #f1f5f9;
    color: var(--color-text-light);
}

.btn-social-action-custom.disconnect-btn:hover {
    background-color: #fee2e2;
    color: var(--color-danger);
}

.btn-social-action-custom.connect-btn {
    background-color: #f1f5f9;
    color: var(--color-primary);
}

.btn-social-action-custom.connect-btn:hover {
    background-color: var(--color-primary-light);
    color: var(--color-primary-dark);
}

/* Switches and unit toggle */
.switch-custom {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
    flex-shrink: 0;
}

.switch-custom input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider-custom {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: #cbd5e1;
    transition: 0.3s;
    border-radius: 22px;
}

.slider-custom:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.switch-custom input:checked + .slider-custom {
    background-color: var(--color-primary);
}

.switch-custom input:checked + .slider-custom:before {
    transform: translateX(18px);
}

.btn-save-notifications-custom {
    width: 100%;
    border: none;
    border-radius: 24px;
    padding: 12px;
    font-weight: 700;
    color: #ffffff;
    background: var(--color-accent);
    cursor: pointer;
    transition: background-color 0.2s;
}

.btn-save-notifications-custom:hover {
    background: var(--color-accent-dark);
}

/* Weight unit button groups */
.unit-toggle-buttons {
    display: flex;
    background: #e2e8f0;
    border-radius: 8px;
    padding: 3px;
    flex-shrink: 0;
}

.unit-btn {
    border: none;
    border-radius: 6px;
    padding: 4px 12px;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    background: transparent;
    color: var(--color-text-light);
    transition: all 0.2s;
}

.unit-btn.active {
    background: #ffffff;
    color: var(--color-text-dark);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

@media (max-width: 991px) {
    .settings-grid-custom {
        grid-template-columns: 1fr;
    }
}
`;

content += settingsStyles;
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully appended settings styles to dashboard.css');
