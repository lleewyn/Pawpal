const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const dichvuPath = path.join(baseDir, 'data/dichvu.csv');

let lines = fs.readFileSync(dichvuPath, 'utf-8').split('\n');
const header = lines[0];

const mapping = {
    'SPA01': ['assets/images/services/spa/process/process_tam_tam.jpg', 'assets/images/services/spa/process/process_say_say_long.jpg', 'assets/images/services/spa/process/process_chai_long_chai_long.jpg'],
    'SPA02': ['assets/images/services/spa/process/process_tam_tam_cho5.jpg', 'assets/images/services/spa/process/process_massage_massage.jpg', 'assets/images/services/spa/process/process_nghi_ngoi_nghi_ngoi.jpg'],
    'SPA03': ['assets/images/services/spa/process/process_tam_tam_cho.jpg', 'assets/images/services/spa/process/process_lau_kho_lau_kho.jpg'],
    'SPA04': ['assets/images/services/spa/process/process_ve_sinh_chan_ve_sinh_chan.jpg', 'assets/images/services/spa/process/process_lau_kho_lau_kho1.jpg'],
    'SPA05': ['assets/images/services/spa/process/process_cat_mong_cat_mong.jpg', 'assets/images/services/spa/process/process_ve_sinh_tai_ray_tai.jpg'],
    'SPA06': ['assets/images/services/spa/process/process_xit_khu_mui_-_xit_kho_xit_khu_mui.jpg', 'assets/images/services/spa/process/process_xit_khu_mui_-_xit_kho_vs-xit-07_2.jpg'],
    'SPA07': ['assets/images/services/spa/process/process_cat_long_cat_long.jpg', 'assets/images/services/spa/process/process_chai_long_chai_long1.jpg'],
    'SPA08': ['assets/images/services/spa/process/process_cat_long_cao_long.jpg', 'assets/images/services/spa/process/process_chai_long_chai_long2.jpg'],
    'SPA09': ['assets/images/services/spa/process/process_tam_tam_meo.jpg', 'assets/images/services/spa/process/process_cat_long_cat_long_meo.jpg', 'assets/images/services/spa/process/process_cat_mong_cat_mong_meo.jpg'],
    'SPA10': ['assets/images/services/spa/process/process_tam_tam_cho4.jpg', 'assets/images/services/spa/process/process_say_say_long2.jpg'],
    'SPA11': ['assets/images/services/spa/process/process_cat_long_cat_long1.jpg'],
    'SPA12': ['assets/images/services/spa/process/process_ve_sinh_chan_rua_chan.jpg', 'assets/images/services/spa/process/process_ve_sinh_chan_lau_chan.jpg', 'assets/images/services/spa/process/process_ve_sinh_chan_cao_chan.jpg'],
    'SPA13': ['assets/images/services/spa/process/process_tam_tam.jpg', 'assets/images/services/spa/process/process_say_say_long3.jpg'],
    'SPA14': ['assets/images/services/spa/process/process_cat_mong_cat_mong.jpg']
};

let count = 0;
let newLines = lines.map((line, index) => {
    if (index === 0) return line;
    if (!line.trim()) return line;
    let cols = line.split('\t');
    let sku = cols[1];
    
    if (mapping[sku]) {
        cols[15] = mapping[sku].join(',');
        count++;
    }
    
    return cols.join('\t');
});

fs.writeFileSync(dichvuPath, newLines.join('\n'));
console.log(`Updated ${count} SPA services.`);
