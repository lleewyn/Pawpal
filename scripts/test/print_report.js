const fs = require('fs');
const path = require('path');

const reportPath = path.resolve(__dirname, 'schema_comparison_report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

console.log('================================================================================');
console.log('BÁO CÁO CHI TIẾT ĐỐI SOÁT SCHEMA: FILE CDSLfinal.md VS SUPABASE');
console.log('================================================================================\n');

console.log(`- Tổng số bảng trong CDSLfinal.md: ${report.tablesInMdCount}`);
console.log(`- Tổng số bảng trên Supabase: ${report.tablesInSbCount}`);
console.log(`- Số bảng thiếu hoàn toàn trên Supabase: ${report.missingTablesInSb.length}`);
console.log(`- Số bảng có cả 2 bên nhưng LỆCH CỘT: ${report.tableDifferences.length}`);
console.log(`- Số bảng có trên Supabase nhưng KHÔNG CÓ trong CDSLfinal.md: ${report.extraTablesInSb.length}\n`);

console.log('================================================================================');
console.log('PHẦN 1: CÁC BẢNG LỆCH CỘT GIỮA FILE MD VÀ SUPABASE (19 BẢNG)');
console.log('================================================================================');

report.tableDifferences.forEach(t => {
    console.log(`\n[STT ${t.stt}] Bảng: "${t.table}"`);
    console.log(`  - Số cột trong MD: ${t.mdColsCount} | Số cột trên Supabase: ${t.sbColsCount}`);
    if (t.missingInSb.length > 0) {
        console.log(`  [!] MD CÓ nhưng SUPABASE THIẾU (${t.missingInSb.length} cột):`);
        t.missingInSb.forEach(col => console.log(`      + ${col}`));
    }
    if (t.extraInSb.length > 0) {
        console.log(`  [+] SUPABASE CÓ nhưng MD KHÔNG CÓ (${t.extraInSb.length} cột):`);
        t.extraInSb.forEach(col => console.log(`      + ${col}`));
    }
});

console.log('\n================================================================================');
console.log('PHẦN 2: CÁC BẢNG CÓ TRÊN SUPABASE NHƯNG CHƯA CÓ TRONG CDSLfinal.md (19 BẢNG)');
console.log('================================================================================');

report.extraTablesInSb.forEach((t, idx) => {
    console.log(`${idx + 1}. Bảng "${t.table}" (${t.columns.length} cột):`);
    console.log(`   Cột: ${t.columns.join(', ')}`);
});
