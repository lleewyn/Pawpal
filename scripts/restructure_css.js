const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const cssDir = path.join(baseDir, 'assets', 'css');

// Tải style.css gốc
const styleCssPath = path.join(cssDir, 'style.css');
if (!fs.existsSync(styleCssPath)) {
    console.error('style.css not found!');
    process.exit(1);
}

const styleContent = fs.readFileSync(styleCssPath, 'utf8');

// Tách lấy phần core styles (bên dưới marker CORE_STYLES_START)
const marker = '/* --- CORE_STYLES_START --- */';
const parts = styleContent.split(marker);
if (parts.length < 2) {
    console.error('Marker not found in style.css! Please run sync script first.');
    process.exit(1);
}

const coreStylesContent = parts[1];

// Phân tách các section lớn
const sectionRegex = /\/\* =+\r?\n\s*([^\n]+)\r?\n\s*=+\s*\*\/([\s\S]*?)(?=\/\* =+|$)/g;

let match;
const sectionList = [];
while ((match = sectionRegex.exec(coreStylesContent)) !== null) {
    const title = match[1].trim();
    const content = match[2];
    sectionList.push({ title, content });
}

let styleCore = '';
let landingStyles = '';
let loginStyles = '';
let dashboardStyles = '';

sectionList.forEach(sec => {
    const titleLower = sec.title.toLowerCase();
    const fullSec = `/* ==========================================================================\n   ${sec.title}\n   ========================================================================== */\n${sec.content}\n`;
    
    if (titleLower.includes('header & navigation')) {
        styleCore += fullSec;
    } else if (titleLower.includes('cute ui enhancements') || titleLower.includes('branch & maps') || titleLower.includes('grid layout responsive fixes') || titleLower.includes('new cro elements')) {
        styleCore += fullSec;
    } else if (titleLower.includes('hero section') || 
               titleLower.includes('features strip') || 
               titleLower.includes('services section') || 
               titleLower.includes('process section') || 
               titleLower.includes('shopping showcase') || 
               titleLower.includes('experts section') || 
               titleLower.includes('testimonials section') || 
               titleLower.includes('faq section') || 
               titleLower.includes('membership section') || 
               titleLower.includes('safety & commitment') || 
               titleLower.includes('pet id showcase') ||
               titleLower.includes('shop features inline') ||
               titleLower.includes('secondary sub-filters') ||
               titleLower.includes('real-time tracker')) {
        landingStyles += fullSec;
    } else if (titleLower.includes('multi-page dedicated layouts')) {
        // Tách login & dashboard page layouts
        const contentLines = sec.content.split('\n');
        let currentPart = 'common';
        let authPart = '';
        let dashPart = '';
        
        contentLines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.includes('Login Page')) {
                currentPart = 'auth';
            } else if (trimmed.includes('Dashboard')) {
                currentPart = 'dash';
            }
            
            if (currentPart === 'auth') {
                authPart += line + '\n';
            } else if (currentPart === 'dash') {
                dashPart += line + '\n';
            }
        });
        
        loginStyles += `/* ==========================================================================\n   Auth Page Dedicated Layouts\n   ========================================================================== */\n${authPart}\n`;
        dashboardStyles += `/* ==========================================================================\n   Dashboard Dedicated Layouts\n   ========================================================================== */\n${dashPart}\n`;
    } else if (titleLower.includes('authentication, dashboard modals')) {
        const contentLines = sec.content.split('\n');
        let currentSubSection = '';
        let currentSubContent = '';
        
        contentLines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('/* ') && trimmed.endsWith(' */')) {
                distributeSubSection(currentSubSection, currentSubContent);
                currentSubSection = trimmed;
                currentSubContent = '';
            } else {
                currentSubContent += line + '\n';
            }
        });
        distributeSubSection(currentSubSection, currentSubContent);
    } else {
        styleCore += fullSec;
    }
});

function distributeSubSection(subSec, content) {
    if (!subSec) return;
    const subSecLower = subSec.toLowerCase();
    const fullContent = `${subSec}\n${content}\n`;
    
    if (subSecLower.includes('dashboard modal content') || subSecLower.includes('dashboard-specific')) {
        dashboardStyles += fullContent;
    } else if (subSecLower.includes('base modal wrapper') || 
               subSecLower.includes('modal content') || 
               subSecLower.includes('close buttons') || 
               subSecLower.includes('auth tabs') || 
               subSecLower.includes('forms layout') || 
               subSecLower.includes('form actions') || 
               subSecLower.includes('otp') || 
               subSecLower.includes('activation modal') || 
               subSecLower.includes('lock overlay') || 
               subSecLower.includes('welcome gift') ||
               subSecLower.includes('auth-specific')) {
        loginStyles += fullContent;
    } else {
        styleCore += fullContent;
    }
}

// 1. Lưu đè style.css phần lõi (dưới marker)
const newStyleContent = `${parts[0]}${marker}\n\n${styleCore.trim()}\n`;
fs.writeFileSync(styleCssPath, newStyleContent, 'utf8');
console.log('Successfully updated style.css core!');

// 2. Lưu/Cập nhật landing.css
const landingCssPath = path.join(cssDir, 'public', 'landing.css');
fs.writeFileSync(landingCssPath, landingStyles.trim() + '\n', 'utf8');
console.log('Successfully updated landing.css!');

// 3. Tạo/Cập nhật login.css
const loginCssPath = path.join(cssDir, 'public', 'login.css');
fs.writeFileSync(loginCssPath, loginStyles.trim() + '\n', 'utf8');
console.log('Successfully created login.css!');

// 4. Cập nhật dashboard.css
const dashboardCssPath = path.join(cssDir, 'user', 'dashboard.css');
let originalDash = '';
// Chúng ta muốn giữ nguyên phần CSS dashboard cũ nếu có, nhưng ở đây ta ghi đè phần bổ sung sạch sẽ
fs.writeFileSync(dashboardCssPath, dashboardStyles.trim() + '\n', 'utf8');
console.log('Successfully updated dashboard.css!');
