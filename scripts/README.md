# Scripts Utility - PawPal

## Các script có sẵn

### 1. `sync_headers.js`
Đồng bộ header từ `index.html` sang tất cả subpages trong `pages/*/`.

**Sử dụng:**
```bash
node scripts/sync_headers.js
```

### 2. `sync_footers.js`
Đồng bộ footer từ `index.html` sang tất cả subpages.

**Sử dụng:**
```bash
node scripts/sync_footers.js
```

### 3. `update-nav.js`
Cập nhật các link anchor (#experts, #contact,...) sang page thực.

**Sử dụng:**
```bash
node scripts/update-nav.js
```

### 4. `fix-paths-after-restructure.js`
Fix CSS/JS paths sau khi di chuyển file (dùng một lần sau khi restructure).

### 5. `fix-cross-links.js`
Fix cross-links giữa các page sau khi restructure (dùng một lần).

## Workflow thông thường

Khi cập nhật header/footer trong `index.html`:
```bash
node scripts/sync_headers.js
node scripts/sync_footers.js
```

Khi thay đổi cấu trúc navigation:
```bash
node scripts/update-nav.js
```
