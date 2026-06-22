const fs = require('fs');

const filePath = 'd:/Aboutme/MyProject/Pawpal/pages/user/pet-profile.html';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize to LF
content = content.replace(/\r\n/g, '\n');

const targetOffer = `<div class="pet-offer-card" style="background-color: #fef9c3; border: 1px solid #fef08a; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 16px; box-shadow: var(--shadow-card);">
                                    <div>
                                        <h3 style="font-family: var(--font-heading); font-size: 1.3rem; color: #713f12; font-weight: 700; margin-bottom: 8px;">Ưu đãi hôm nay dành cho bé</h3>
                                        <p style="font-size: 0.9rem; color: #854d0e; line-height: 1.5; margin: 0;">Giảm 20% cho tất cả dịch vụ spa và làm đẹp khi đặt lịch qua ứng dụng PawPal.</p>
                                    </div>
                                    <a href="/pages/services/booking.html" class="btn" style="background-color: #064e3b; color: #fff; border: none; border-radius: 20px; padding: 10px 24px; font-weight: 700; display: inline-block; width: max-content; font-size: 0.85rem; text-decoration: none;">Đặt ngay</a>
                                </div>`;

const replacementOffer = `<div class="pet-offer-card" style="background-color: #fef9c3; border: 1px solid #fef08a; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; height: 100%; box-shadow: var(--shadow-card);">
                                    <div>
                                        <h3 style="font-family: var(--font-heading); font-size: 1.3rem; color: #713f12; font-weight: 700; margin-bottom: 8px;">Ưu đãi hôm nay dành cho bé</h3>
                                        <p style="font-size: 0.9rem; color: #854d0e; line-height: 1.5; margin: 0;">Giảm 20% cho tất cả dịch vụ spa và làm đẹp khi đặt lịch qua ứng dụng PawPal.</p>
                                    </div>
                                    <a href="/pages/services/booking.html" class="btn" style="background-color: #064e3b; color: #fff; border: none; border-radius: 20px; padding: 10px 24px; font-weight: 700; display: inline-block; width: max-content; font-size: 0.85rem; text-decoration: none; margin-top: 16px;">Đặt ngay</a>
                                </div>`;

const targetReminder = `<div class="pet-reminder-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: var(--shadow-card); display: flex; flex-direction: column; gap: 16px;">
                                    <h3 style="font-family: var(--font-heading); font-size: 1.25rem; color: var(--color-text-dark); font-weight: 700; margin: 0;">Nhắc nhở</h3>
                                    <div class="reminder-list" style="display: flex; flex-direction: column; gap: 12px;">
                                        <div class="reminder-item" style="background-color: #fef9c3; border: 1px solid #fef08a; border-radius: 12px; padding: 12px 16px;">
                                            <div style="font-weight: 700; font-size: 0.85rem; color: #713f12;">Tiêm phòng Milu</div>
                                            <div style="font-size: 0.75rem; color: #854d0e; margin-top: 2px;">Trong 2 ngày tới</div>
                                        </div>
                                        <div class="reminder-item" style="background-color: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 12px; padding: 12px 16px;">
                                            <div style="font-weight: 700; font-size: 0.85rem; color: #1b5e20;">Cắt tỉa lông LALA</div>
                                            <div style="font-size: 0.75rem; color: #2e7d32; margin-top: 2px;">Chủ nhật này</div>
                                        </div>
                                    </div>
                                    <a href="/pages/user/bookings.html" style="font-size: 0.85rem; font-weight: 700; color: var(--color-primary); text-decoration: none; display: block; text-align: center;">Xem tất cả lịch hẹn</a>
                                </div>`;

const replacementReminder = `<div class="pet-reminder-card" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: var(--shadow-card); display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                                    <h3 style="font-family: var(--font-heading); font-size: 1.25rem; color: var(--color-text-dark); font-weight: 700; margin: 0 0 16px 0;">Nhắc nhở</h3>
                                    <div class="reminder-list" style="display: flex; gap: 12px; margin-bottom: 16px; width: 100%;">
                                        <div class="reminder-item" style="flex: 1; background-color: #fef9c3; border: 1px solid #fef08a; border-radius: 12px; padding: 12px 16px;">
                                            <div style="font-weight: 700; font-size: 0.85rem; color: #713f12;">Tiêm phòng Milu</div>
                                            <div style="font-size: 0.75rem; color: #854d0e; margin-top: 2px;">Trong 2 ngày tới</div>
                                        </div>
                                        <div class="reminder-item" style="flex: 1; background-color: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 12px; padding: 12px 16px;">
                                            <div style="font-weight: 700; font-size: 0.85rem; color: #1b5e20;">Cắt tỉa lông LALA</div>
                                            <div style="font-size: 0.75rem; color: #2e7d32; margin-top: 2px;">Chủ nhật này</div>
                                        </div>
                                    </div>
                                    <a href="/pages/user/bookings.html" style="font-size: 0.85rem; font-weight: 700; color: var(--color-primary); text-decoration: none; display: block; text-align: center;">Xem tất cả lịch hẹn</a>
                                </div>`;

if (content.includes(targetOffer)) {
    content = content.replace(targetOffer, replacementOffer);
} else {
    console.error('Target offer card not found!');
}

if (content.includes(targetReminder)) {
    content = content.replace(targetReminder, replacementReminder);
} else {
    console.error('Target reminder card not found!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched reminder layout to row and equal heights.');
