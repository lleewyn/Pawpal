const fs = require('fs');
const content = fs.readFileSync('d:\\Aboutme\\MyProject\\Pawpal\\data\\dichvu.csv', 'utf8');
const lines = content.split('\n');

const newLines = [];
const header = lines[0].split('\t');

const idPhanKhuc = header.indexOf('Phân khúc cân nặng');
const idGiaNiemYet = header.indexOf('Giá niêm yết (VNĐ)');

header.splice(idPhanKhuc, 2, 'Giá <5kg (VNĐ)', 'Giá 5-10kg (VNĐ)', 'Giá 10-20kg (VNĐ)', 'Giá >20kg (VNĐ)');
newLines.push(header.join('\t'));

const updates = {
  'SPA01': ['120.000', '150.000', '200.000', '250.000'],
  'SPA02': ['220.000', '270.000', '350.000', '450.000'],
  'SPA03': ['320.000', '370.000', '450.000', '550.000'],
  'SPA04': ['80.000', '100.000', '120.000', '150.000'],
  'SPA05': ['60.000', '80.000', '100.000', '120.000'],
  'SPA06': ['90.000', '120.000', '150.000', '180.000'],
  'SPA07': ['350.000', '400.000', '500.000', '650.000'],
  'SPA08': ['450.000', '500.000', '600.000', '750.000'],
  'SPA09': ['380.000', '430.000', '500.000', '-'],
  'SPA10': ['280.000', '320.000', '400.000', '500.000'],
  'SPA11': ['300.000', '350.000', '450.000', '550.000'],
  'SPA12': ['120.000', '150.000', '180.000', '220.000'],
  'SPA13': ['150.000', '-', '-', '-'],
  'SPA14': ['80.000', '-', '-', '-'],
  'HTL01': ['180.000 / đêm', '200.000 / đêm', '-', '-'],
  'HTL02': ['250.000 / đêm', '250.000 / đêm', '300.000 / đêm', '-'],
  'HTL03': ['380.000 / đêm', '380.000 / đêm', '450.000 / đêm', '-'],
  'HTL04': ['290.000 / đêm', '320.000 / đêm', '-', '-'],
  'HTL05': ['520.000 / đêm', '520.000 / đêm', '650.000 / đêm', '800.000 / đêm'],
  'HTL06': ['-', '-', '-', '1.000.000 / đêm'],
  'HTL07': ['100.000', '120.000', '150.000', '200.000'],
  'HTL08': ['120.000 / đêm', '-', '-', '-'],
  'TXI01': ['150.000', '150.000', '200.000', '250.000']
};

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const cols = lines[i].split('\t');
  const serviceId = cols[1];
  
  if (updates[serviceId]) {
    cols.splice(idPhanKhuc, 2, ...updates[serviceId]);
  }
  
  // Update member discount string to be simpler
  const uuDaiIdx = header.indexOf('Giá ưu đãi thành viên (VNĐ)');
  if (uuDaiIdx !== -1) {
      cols[uuDaiIdx] = 'Bạc: -5%; Vàng: -10%; Kim cương: -15%';
  }
  
  newLines.push(cols.join('\t'));
}

fs.writeFileSync('d:\\Aboutme\\MyProject\\Pawpal\\data\\dichvu.csv', newLines.join('\n') + '\n');
console.log("Successfully updated dichvu.csv");
