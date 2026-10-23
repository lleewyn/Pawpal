const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

// 1. Parse CDSLfinal.md
const mdPath = path.resolve(__dirname, '../../docs/archive/database/CDSLfinal.md');
const mdContent = fs.readFileSync(mdPath, 'utf8');

const mdTables = {};
let currentTable = null;

const lines = mdContent.split('\n');
for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const parts = line.split('\t');
    
    // Check if new table definition
    const stt = parts[0] ? parts[0].trim() : '';
    const tableName = parts[1] ? parts[1].trim() : '';
    const colName = parts[3] ? parts[3].trim() : '';

    if (tableName) {
        currentTable = tableName;
        if (!mdTables[currentTable]) {
            mdTables[currentTable] = {
                stt: stt,
                columns: []
            };
        }
    }

    if (currentTable && colName) {
        if (!mdTables[currentTable].columns.includes(colName)) {
            mdTables[currentTable].columns.push(colName);
        }
    }
}

console.log(`Parsed ${Object.keys(mdTables).length} tables from CDSLfinal.md.`);

// 2. Fetch OpenAPI schema from Supabase
const url = new URL(process.env.SUPABASE_URL + '/rest/v1/?apikey=' + (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY));

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const schema = JSON.parse(data);
            const sbDefinitions = schema.definitions || {};
            const sbTables = {};

            for (const [tName, tDef] of Object.entries(sbDefinitions)) {
                sbTables[tName] = Object.keys(tDef.properties || {});
            }

            console.log(`Fetched ${Object.keys(sbTables).length} definitions from Supabase.`);

            // 3. Comparison
            const report = {
                tablesInMdCount: Object.keys(mdTables).length,
                tablesInSbCount: Object.keys(sbTables).length,
                missingTablesInSb: [],
                extraTablesInSb: [],
                tableDifferences: []
            };

            for (const [tName, tData] of Object.entries(mdTables)) {
                if (!sbTables[tName]) {
                    report.missingTablesInSb.push({
                        stt: tData.stt,
                        table: tName,
                        columnsInMd: tData.columns
                    });
                } else {
                    const mdCols = tData.columns;
                    const sbCols = sbTables[tName];

                    const missingInSb = mdCols.filter(c => !sbCols.includes(c));
                    const extraInSb = sbCols.filter(c => !mdCols.includes(c));

                    if (missingInSb.length > 0 || extraInSb.length > 0) {
                        report.tableDifferences.push({
                            stt: tData.stt,
                            table: tName,
                            missingInSb,
                            extraInSb,
                            mdColsCount: mdCols.length,
                            sbColsCount: sbCols.length
                        });
                    }
                }
            }

            for (const tName of Object.keys(sbTables)) {
                if (!mdTables[tName]) {
                    report.extraTablesInSb.push({
                        table: tName,
                        columns: sbTables[tName]
                    });
                }
            }

            fs.writeFileSync(path.resolve(__dirname, 'schema_comparison_report.json'), JSON.stringify(report, null, 2), 'utf8');
            console.log('Comparison complete! Results written to schema_comparison_report.json');

            // Log quick summary
            console.log('\n--- TÓM TẮT KẾT QUẢ ---');
            console.log(`- Bảng có trong MD nhưng THIẾU HOÀN TOÀN trên Supabase: ${report.missingTablesInSb.length}`);
            report.missingTablesInSb.forEach(t => console.log(`  * [STT ${t.stt}] ${t.table} (${t.columnsInMd.length} cột)`));

            console.log(`\n- Bảng tồn tại ở cả 2 bên nhưng CÓ LỆCH CỘT: ${report.tableDifferences.length}`);
            report.tableDifferences.forEach(t => {
                console.log(`  * [STT ${t.stt}] ${t.table}: Thiếu trên SB [${t.missingInSb.join(', ')}] | Thừa trên SB [${t.extraInSb.join(', ')}]`);
            });

            console.log(`\n- Bảng CÓ TRÊN SUPABASE nhưng KHÔNG CÓ TRONG MD: ${report.extraTablesInSb.length}`);
            console.log(`  * ${report.extraTablesInSb.map(t => t.table).join(', ')}`);

        } catch (e) {
            console.error('Lỗi phân tích OpenAPI:', e);
        }
    });
}).on('error', err => {
    console.error('Lỗi kết nối Supabase:', err);
});
