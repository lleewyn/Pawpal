# Landing Page Improvements

## ✅ Completed

### Fix 1-3: Links
- ✅ Service cards arrow buttons → `pages/services/booking.html`
- ✅ Shop "Xem tất cả" → `pages/shop/shop.html`
- ✅ Process CTA → `pages/services/booking.html`

### Fix 4: Features section với số liệu cụ thể
- ✅ "5,000+ nhật ký cập nhật mỗi tháng"
- ✅ "8 chuyên gia có chứng chỉ quốc tế"

### Fix 5: Services subtitle tự nhiên hơn
- ✅ "Spa, Hotel, và hơn thế nữa — Chăm sóc toàn diện cho bé cưng của bạn"

### Fix 6: Hero status widget dynamic
- ✅ Thay hardcode bằng JS dynamic update mỗi 5 phút

### Fix 7: Membership/Loyalty section
- ✅ 4 benefit cards
- ✅ 3 membership tiers (Silver, Gold, Diamond)
- ✅ Fully responsive

---

## 🟡 Recommended (Manual)

### Fix 8: Đổi thứ tự sections

**Lý do:** Shop section sau Process hơi lạc lõng. Services và Shop đều là "offering", nên đặt gần nhau logic hơn.

**Flow hiện tại:**
```
Hero → Features → Services → Tracker → Safety → Experts → Process → Shop → Membership → Testimonials → FAQ → Footer
```

**Flow đề xuất:**
```
Hero → Features → Services → Shop → Tracker → Safety → Experts → Process → Membership → Testimonials → FAQ → Footer
```

**Cách thực hiện:**
1. Mở `index.html`
2. Cut toàn bộ `<!-- Shop/Shopping Section -->` (dòng ~692-852)
3. Paste sau `<!-- Services Section -->` kết thúc (sau dòng ~381)
4. Điều chỉnh spacing nếu cần

---

### Fix 9: FAQ Section Enhancement

FAQ đã có sẵn ở dòng 1103. Cần review nội dung:

**Câu hỏi cần có:**
- ✓ Vaccine có bắt buộc không?
- ✓ Có nhận mèo không?
- ✓ Giờ mở cửa?
- ? Chính sách hoàn tiền?
- ? Làm sao để theo dõi nhật ký real-time?
- ? Paw Points có thời hạn sử dụng không?

**Cách enhance:**
Thêm 2-3 câu hỏi về Paw Points và nhật ký real-time vào FAQ section.

---

### Fix 10: Footer CTA Banner Enhancement

Footer CTA đã có (dòng 1168) nhưng cần làm nổi bật hơn:

**Hiện tại:** Text đơn giản + button

**Đề xuất enhance:**
- Thêm countdown timer giả (hôm nay còn X slot)
- Thêm urgency indicator
- Làm nổi bật visual hơn (gradient, shadow)

**CSS cần thêm:**
```css
.footer-cta-banner {
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
    box-shadow: 0 -10px 40px rgba(42, 89, 68, 0.15);
}
```

---

## 📊 Summary

**Fixes hoàn thành:** 1, 2, 3, 4, 5, 6, 7  
**Cần thực hiện manual:** 8 (đổi thứ tự), 9 (thêm FAQ), 10 (enhance CTA)

**Ước tính thời gian:**
- Fix 8: ~5 phút (cut-paste HTML)
- Fix 9: ~10 phút (thêm 3 FAQ items)
- Fix 10: ~5 phút (update CSS)
