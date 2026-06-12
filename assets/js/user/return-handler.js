/**
 * RETURN HANDLER - Form đổi trả
 * Tuân thủ 100% design.md
 * - NO emoji
 * - File upload với validation
 * - Dynamic required proof
 */

let uploadedFiles = [];
let returnReasons = [];

// Initialize return form
async function initReturnForm() {
    try {
        // Load return reasons
        const response = await fetch('/data/return-reasons.json');
        returnReasons = await response.json();
        
        // Populate reasons dropdown
        const reasonSelect = document.getElementById('return-reason');
        returnReasons.forEach(reason => {
            const option = document.createElement('option');
            option.value = reason.value;
            option.textContent = reason.label;
            reasonSelect.appendChild(option);
        });
        
        // Setup event listeners
        setupReturnFormListeners();
        
    } catch (error) {
        console.error('Lỗi load return reasons:', error);
    }
}

// Setup all event listeners
function setupReturnFormListeners() {
    // Open/Close panel
    const overlay = document.getElementById('return-panel-overlay');
    const closeBtn = document.getElementById('close-return-panel');
    
    closeBtn.addEventListener('click', closeReturnPanel);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeReturnPanel();
        }
    });
    
    // Reason change - dynamic required proof
    const reasonSelect = document.getElementById('return-reason');
    reasonSelect.addEventListener('change', handleReasonChange);
    
    // File upload
    const fileUploadZone = document.getElementById('file-upload-zone');
    const fileInput = document.getElementById('file-input');
    
    fileUploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    
    // Drag and drop
    fileUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadZone.classList.add('dragging');
    });
    
    fileUploadZone.addEventListener('dragleave', () => {
        fileUploadZone.classList.remove('dragging');
    });
    
    fileUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadZone.classList.remove('dragging');
        handleFiles(e.dataTransfer.files);
    });
    
    // Character counter
    const descTextarea = document.getElementById('return-description');
    const charCounter = document.getElementById('char-counter');
    
    descTextarea.addEventListener('input', () => {
        charCounter.textContent = `${descTextarea.value.length}/500`;
    });
    
    // Form submit
    const form = document.getElementById('return-form');
    form.addEventListener('submit', handleFormSubmit);
}

// Open return panel
function openReturnPanel() {
    const overlay = document.getElementById('return-panel-overlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Render products checklist
    renderProductsChecklist();
    
    // Reset form
    document.getElementById('return-form').reset();
    uploadedFiles = [];
    document.getElementById('file-preview-list').innerHTML = '';
    document.getElementById('char-counter').textContent = '0/500';
    document.getElementById('proof-required-mark').style.display = 'none';
    hideFileError();
}

// Close return panel
function closeReturnPanel() {
    const overlay = document.getElementById('return-panel-overlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Render products checklist
function renderProductsChecklist() {
    if (!currentOrder) return;
    
    const container = document.getElementById('return-products-list');
    
    container.innerHTML = currentOrder.products.map((product, index) => `
        <label class="product-checkbox">
            <input type="checkbox" 
                   name="products[]" 
                   value="${product.id}"
                   data-index="${index}">
            <div class="checkbox-product-info">
                <img src="${product.image}" alt="${product.name}">
                <div class="checkbox-product-text">
                    <h5>${product.name}</h5>
                    <p>x${product.quantity} | ${formatCurrency(product.total)}</p>
                </div>
            </div>
        </label>
    `).join('');
}

// Handle reason change - dynamic required proof
function handleReasonChange(e) {
    const selectedValue = e.target.value;
    const selectedReason = returnReasons.find(r => r.value === selectedValue);
    const proofMark = document.getElementById('proof-required-mark');
    
    if (selectedReason && selectedReason.requires_proof) {
        proofMark.style.display = 'inline';
    } else {
        proofMark.style.display = 'none';
    }
}

// Handle files upload
function handleFiles(files) {
    hideFileError();
    
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    Array.from(files).forEach(file => {
        // Validate file type
        if (!validTypes.includes(file.type)) {
            showFileError('Chỉ chấp nhận file JPG, PNG, WEBP hoặc MP4');
            return;
        }
        
        // Validate file size
        if (file.size > maxSize) {
            showFileError(`File "${file.name}" vượt quá 5MB`);
            return;
        }
        
        // Check if already uploaded
        if (uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
            showFileError(`File "${file.name}" đã được tải lên`);
            return;
        }
        
        uploadedFiles.push(file);
        renderFilePreview(file);
    });
}

// Render file preview
function renderFilePreview(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const preview = document.createElement('div');
        preview.className = 'file-preview-item';
        preview.dataset.fileName = file.name;
        
        const isVideo = file.type.startsWith('video/');
        const mediaElement = isVideo 
            ? `<video src="${e.target.result}" muted></video>`
            : `<img src="${e.target.result}" alt="Preview">`;
        
        preview.innerHTML = `
            ${mediaElement}
            <button type="button" class="remove-file-btn" onclick="removeFile('${file.name}')">
                ×
            </button>
        `;
        
        document.getElementById('file-preview-list').appendChild(preview);
    };
    
    reader.readAsDataURL(file);
}

// Remove file
function removeFile(fileName) {
    // Remove from array
    uploadedFiles = uploadedFiles.filter(f => f.name !== fileName);
    
    // Remove preview
    const preview = document.querySelector(`[data-file-name="${fileName}"]`);
    if (preview) {
        preview.remove();
    }
    
    hideFileError();
}

// Show file error
function showFileError(message) {
    const errorEl = document.getElementById('file-error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

// Hide file error
function hideFileError() {
    const errorEl = document.getElementById('file-error');
    errorEl.style.display = 'none';
}

// Handle form submit
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(e.target);
    const returnType = formData.get('return_type');
    const reason = formData.get('reason');
    const description = formData.get('description');
    
    // Get selected products
    const selectedProducts = [];
    document.querySelectorAll('input[name="products[]"]:checked').forEach(checkbox => {
        selectedProducts.push(checkbox.value);
    });
    
    // Validation
    if (selectedProducts.length === 0) {
        alert('Vui lòng chọn ít nhất một sản phẩm để đổi trả');
        return;
    }
    
    if (!reason) {
        alert('Vui lòng chọn lý do đổi trả');
        return;
    }
    
    // Check if proof required
    const selectedReason = returnReasons.find(r => r.value === reason);
    if (selectedReason && selectedReason.requires_proof && uploadedFiles.length === 0) {
        showFileError('Lý do này bắt buộc phải tải lên hình ảnh/video minh chứng');
        return;
    }
    
    // Prepare return request data
    const returnRequest = {
        orderId: currentOrder.id,
        returnType,
        reason,
        description,
        products: selectedProducts,
        files: uploadedFiles.map(f => f.name),
        createdAt: new Date().toISOString()
    };
    
    console.log('Return request:', returnRequest);
    
    // TODO: Call API to submit return request
    
    // Show success message
    alert('Yêu cầu đổi trả đã được gửi thành công!\n\nBộ phận chăm sóc khách hàng sẽ liên hệ với bạn trong vòng 24 giờ.');
    
    closeReturnPanel();
}

// Utility: Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initReturnForm();
});
