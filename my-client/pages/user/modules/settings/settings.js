/**
 * modules/settings/settings.js - Logic cho Module Cài đặt tài khoản PawPal
 * Chuẩn AGENTS.md: 9px radius, Flat Solid, Text-Only, Auto-Save, Zero JSON Mock
 */

import { withDeadline } from '/scripts/shared/request-deadline.mjs';
let passwordSaving = false;
function getSupabaseClient() {
    return window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
}
function getCurrentUser() {
    try { return window.getCurrentUser?.() || JSON.parse(localStorage.getItem('pawpal_current_user') || 'null'); }
    catch { return null; }
}

export function showToast(type, message, duration = 3000) {
    let container = document.getElementById('settingsToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'settingsToastContainer';
        container.className = 'toast-container-custom';
        document.body.appendChild(container);
    }
    container.style.cssText = 'position:fixed;top:24px;right:24px;z-index:100000;display:flex;flex-direction:column;gap:8px;max-width:calc(100vw - 32px);';

    const toastColors = {
        success: { bg: '#236B48', label: 'Thành công' },
        error: { bg: '#8F2424', label: 'Lỗi' },
        info: { bg: '#20495E', label: 'Thông báo' },
        warning: { bg: '#734718', label: 'Lưu ý' }
    };
    const cfg = toastColors[type] || toastColors.success;

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${type === 'success' ? '#236B48' : '#ffffff'};
        border: 1px solid #E2ECE5;
        border-radius: 9px;
        padding: 10px 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        min-width: 260px;
        max-width: 360px;
        color: #203A2C;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        opacity: 1;
        transition: opacity 0.25s ease;
    `;

    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 13px; color: ${cfg.bg};">${cfg.label}:</span>
            <span style="font-size: 13px; color: #203A2C;"></span>
        </div>
        <button type="button" style="border: none; background: transparent; color: #4F7A65; font-size: 16px; cursor: pointer; padding: 0 4px;">&times;</button>
    `;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    const spans = toast.querySelectorAll('span');
    spans[1].textContent = message;
    if (type === 'success') {
        spans.forEach(span => span.style.color = '#ffffff');
        toast.querySelector('button').style.color = '#ffffff';
    }

    toast.querySelector('button').addEventListener('click', () => toast.remove());
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

function calculatePasswordStrength(password) {
    let score = 0;
    if (!password || password.length === 0) return { score: 0 };
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password)) score++;
    return { score: Math.min(score, 3) };
}

function initPasswordStrengthMeter() {
    const newPassword = document.getElementById('newPassword');
    const strengthLabel = document.getElementById('strengthLabel');
    const seg1 = document.getElementById('strengthSeg1');
    const seg2 = document.getElementById('strengthSeg2');
    const strengthSeg3 = document.getElementById('strengthSeg3');

    if (!newPassword || !strengthLabel) return;

    newPassword.addEventListener('input', () => {
        const password = newPassword.value;
        const strength = calculatePasswordStrength(password);

        if (seg1) seg1.className = 'strength-bar-segment';
        if (seg2) seg2.className = 'strength-bar-segment';
        if (strengthSeg3) strengthSeg3.className = 'strength-bar-segment';

        if (strength.score === 0) {
            strengthLabel.textContent = 'Trống';
            strengthLabel.style.color = '#4F7A65';
        } else if (strength.score === 1) {
            if (seg1) seg1.classList.add('weak');
            strengthLabel.textContent = 'Yếu';
            strengthLabel.style.color = '#DC2626';
        } else if (strength.score === 2) {
            if (seg1) seg1.classList.add('medium');
            if (seg2) seg2.classList.add('medium');
            strengthLabel.textContent = 'Trung bình';
            strengthLabel.style.color = '#D97706';
        } else {
            if (seg1) seg1.classList.add('strong');
            if (seg2) seg2.classList.add('strong');
            if (strengthSeg3) strengthSeg3.classList.add('strong');
            strengthLabel.textContent = 'Mạnh';
            strengthLabel.style.color = '#236B48';
        }

        validateChangePasswordForm();
    });
}

function validateChangePasswordForm() {
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmNewPassword = document.getElementById('confirmNewPassword');
    const btnSubmit = document.getElementById('btnUpdateSecurity');
    const errEl = document.getElementById('confirmPasswordError');

    if (!newPassword || !confirmNewPassword || !btnSubmit) return;

    const isCurrentValid = currentPassword ? currentPassword.value.trim().length > 0 : true;
    const isPasswordValid = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/s.test(newPassword.value) && newPassword.value.length <= 128;
    const isConfirmMatch = confirmNewPassword.value === newPassword.value;
    const isConfirmFilled = confirmNewPassword.value.length > 0;

    if (isConfirmFilled && !isConfirmMatch) {
        confirmNewPassword.classList.add('is-invalid');
        if (errEl) errEl.classList.add('d-block');
    } else {
        confirmNewPassword.classList.remove('is-invalid');
        if (errEl) errEl.classList.remove('d-block');
    }

    btnSubmit.disabled = passwordSaving || !(isCurrentValid && isPasswordValid && isConfirmMatch && isConfirmFilled);
}

function initChangePasswordForm() {
    const form = document.getElementById('changePasswordForm');
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmNewPassword = document.getElementById('confirmNewPassword');
    const btnSubmit = document.getElementById('btnUpdateSecurity');
    const btnCancel = document.getElementById('btnCancelSecurity');

    if (!form || !btnSubmit) return;

    if (currentPassword) currentPassword.addEventListener('input', validateChangePasswordForm);
    if (confirmNewPassword) confirmNewPassword.addEventListener('input', validateChangePasswordForm);

    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            form.reset();
            const strengthLabel = document.getElementById('strengthLabel');
            if (strengthLabel) {
                strengthLabel.textContent = 'Trống';
                strengthLabel.style.color = '#4F7A65';
            }
            ['strengthSeg1', 'strengthSeg2', 'strengthSeg3'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.className = 'strength-bar-segment';
            });
            confirmNewPassword.classList.remove('is-invalid');
            const errEl = document.getElementById('confirmPasswordError');
            if (errEl) errEl.classList.remove('d-block');
            btnSubmit.disabled = true;
        });
    }

    form.addEventListener('submit', e => e.preventDefault());
    btnSubmit.addEventListener('click', async (e) => {
        e.preventDefault();
        if (passwordSaving) return;
        const user = getCurrentUser();
        if (!user) { showToast('error', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'); return; }

        passwordSaving = true;
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Đang lưu...';

        try {
            if (!currentPassword?.value || !newPassword.value || newPassword.value !== confirmNewPassword.value) throw new Error('Vui lòng kiểm tra mật khẩu hiện tại và mật khẩu nhập lại.');
            const result = await withDeadline(() => window.PawpalCustomerAuth.request('change-password', {
                currentPassword: currentPassword.value,
                newPassword: newPassword.value
            }, true), 20000, 'Chưa xác nhận được kết quả đổi mật khẩu do kết nối chậm. Vui lòng kiểm tra lại trước khi thử lần nữa.');
            try {
                await withDeadline(() => window.PawpalCustomerAuth.accept(result), 10000, 'Không thể đồng bộ phiên đăng nhập.');
            } catch {
                showToast('warning', 'Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại nếu phiên hiện tại không hoạt động.', 7000);
            }
        } catch (dbErr) {
            showToast('error', dbErr.message || 'Không thể cập nhật mật khẩu. Vui lòng thử lại.');
            btnSubmit.textContent = 'Cập nhật mật khẩu';
            validateChangePasswordForm();
            return;
        } finally {
            passwordSaving = false;
            btnSubmit.textContent = 'Cập nhật mật khẩu';
            validateChangePasswordForm();
        }

        const warning = document.getElementById('tempAccountWarning');
        if (warning) warning.classList.add('d-none');

        showToast('success', 'Mật khẩu đã được cập nhật thành công!');
        form.reset();
        btnSubmit.textContent = 'Cập nhật mật khẩu';
        btnSubmit.disabled = true;
        const strengthLabel = document.getElementById('strengthLabel');
        if (strengthLabel) {
            strengthLabel.textContent = 'Trống';
            strengthLabel.style.color = '#4F7A65';
        }
        ['strengthSeg1', 'strengthSeg2', 'strengthSeg3'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.className = 'strength-bar-segment';
        });
    });
}

function initPasswordToggles() {
    document.querySelectorAll('.btn-toggle-password-text').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;

            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = 'Ẩn';
            } else {
                input.type = 'password';
                btn.textContent = 'Hiện';
            }
        });
    });
}

export async function exportCustomerData() {
    const db=getSupabaseClient();
    const auth=await db?.auth?.getUser();
    if(auth?.error || !auth?.data?.user)throw Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    const uid=auth.data.user.id;
    const profile=await db.rpc('customer_profile_snapshot');
    if(profile.error || !profile.data?.id)throw Error('Không thể tải hồ sơ. Chưa tạo tệp dữ liệu.');
    const owner=profile.data.id;
    async function rows(table,columns){
        const result=[];
        for(let offset=0;;offset+=500){
            const response=await db.from(table).select(columns).eq('customer_id',owner).order('id').range(offset,offset+499);
            if(response.error)throw Error('Không thể tải đủ dữ liệu. Chưa tạo tệp; vui lòng thử lại.');
            result.push(...(response.data || []));
            if((response.data || []).length<500)return result;
        }
    }
    const [pets,appointments,orders]=await Promise.all([
        rows('pet_profile','id,pet_code,pet_name,gender,date_of_birth,color,routine,allergy,safety_note,status,breed_id,created_at,updated_at'),
        rows('appointment','id,appointment_code,scheduled_start_at,scheduled_end_at,appointment_status,pet_id,created_at,updated_at'),
        rows('sales_order','id,order_code,order_status,shipping_status,created_at,updated_at')
    ]);
    const current=await db.auth.getUser();
    if(current.error || current.data.user?.id!==uid)throw Error('Phiên đăng nhập đã thay đổi. Vui lòng tải lại trang.');
    const {revision,customer_updated_at,...user}=profile.data;
    return {exportedAt:new Date().toISOString(),scope:'Hồ sơ cá nhân, địa chỉ, thú cưng, lịch hẹn và danh sách đơn hàng; không phải bản sao lưu toàn bộ tài khoản.',user,pets,appointments,orders};
}

function initPrivacyActions(){
    const button=document.getElementById('btnExportUserData');
    button?.addEventListener('click',async()=>{
        if(button.disabled)return;
        button.disabled=true;button.textContent='Đang tải...';
        try {
            const data=await withDeadline(exportCustomerData,20000,'Tải dữ liệu quá lâu. Chưa tạo tệp; vui lòng thử lại.');
            if(!button.isConnected)return;
            const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
            const anchor=document.createElement('a');anchor.href=url;anchor.download='pawpal-data-'+Date.now()+'.json';anchor.click();
            setTimeout(()=>URL.revokeObjectURL(url),1000);
            showToast('success','Đã tạo bản sao dữ liệu trong phạm vi hiển thị.');
        }catch(error){if(button.isConnected)showToast('error',error.message);}
        finally{button.disabled=false;button.textContent='Tải dữ liệu';}
    });
}

let isInitRunning = false;

// Khởi tạo toàn bộ module Cài đặt
export function init() {
    if (isInitRunning) return;
    isInitRunning = true;
    try {
        const user = getCurrentUser();
        if (!user) return;

        if (user.is_temporary) {
            const warning = document.getElementById('tempAccountWarning');
            if (warning) warning.classList.remove('d-none');
        }

        if (typeof window.setUserSubBreadcrumb === 'function') {
            window.setUserSubBreadcrumb('', 'settings');
        }

        initPasswordStrengthMeter();
        initChangePasswordForm();
        initPasswordToggles();
        initPrivacyActions();
    } finally {
        isInitRunning = false;
    }
}

export const initSettings = init;
window.initSettings = init;
