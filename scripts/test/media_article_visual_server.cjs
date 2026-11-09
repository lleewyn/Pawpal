'use strict';
// Reuse the isolated settings shell while loading the actual article module.
const fs=require('node:fs');
const original=fs.readFileSync('scripts/test/media_banner_visual_server.cjs','utf8');
const script=original.replaceAll('3136','3137').replaceAll('BANNER_MEDIA_ISOLATED_READY','ARTICLE_MEDIA_ISOLATED_READY').replaceAll('tab-settings-banners.js','tab-settings-content.js').replace('bannersList:[],vouchersList:[]',"articlesList:[],blogCategoriesList:[{id:'95000000-0000-0000-0000-000000000001',category_name:'Danh mục kiểm thử riêng'}],bannersList:[],vouchersList:[]").replace("PawpalSettings.subtabs.banners.openBannerModal();","document.addEventListener('DOMContentLoaded',()=>document.getElementById('btnOpenCreateArticleModal').click());").replace("PawpalSettings.closeModal('bannerModalOverlay');","PawpalSettings.closeModal('articleModalOverlay');");
// All generated content is an isolated local server; no runtime application file is rewritten.
new Function('require',script)(require);
