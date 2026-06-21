const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const dichvuPath = path.join(dataDir, 'dichvu.csv');

let lines = fs.readFileSync(dichvuPath, 'utf-8').split('\n');
const header = lines[0];
let updateCount = 0;

const updatedLines = lines.slice(1).map(line => {
    if (!line.trim()) return line;
    let cols = line.split('\t');
    let serviceId = cols[1]; // e.g. SPA01, HTL01

    if (serviceId.startsWith('HTL')) {
        let htlMap = {
            'HTL01': 'htl-htl01.jpg',
            'HTL02': 'htl-htl02.jpg',
            'HTL03': 'htl-deluxe.jpg',
            'HTL05': 'htl-htl05.jpg'
        };
        if (htlMap[serviceId]) {
            cols[15] = `assets/images/services/hotel/${htlMap[serviceId]}`;
            updateCount++;
        }
    } else if (serviceId.startsWith('SPA')) {
        // Just point to a process image for now, or gallery image
        cols[15] = `assets/images/services/spa/gallery/cust_cust1_avt.jpg`;
        updateCount++;
    } else if (serviceId.startsWith('TXI')) {
        cols[15] = `assets/images/banners/banner_taxi_banner.webp`;
        updateCount++;
    }

    return cols.join('\t');
});

fs.writeFileSync(dichvuPath, [header, ...updatedLines].join('\n'));
console.log(`Updated ${updateCount} image paths in dichvu.csv.`);
