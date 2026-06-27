const fs = require('fs');
let c = fs.readFileSync('scripts/api/api.js', 'utf8');
c = c.replace(/await this\.getJSON\(\/data\/returns\.json\?v=\)/, 'await this.getJSON(`/data/returns.json?v=${this.DATA_VERSION}`)');
c = c.replace(/await this\.getJSON\(\/data\/care-logs\.json\?v=\)/, 'await this.getJSON(`/data/care-logs.json?v=${this.DATA_VERSION}`)');
c = c.replace(/DATA_VERSION: '2026-06-25-v2-add-4-users-data'/, "DATA_VERSION: '2026-06-27-v3-fix-vietnamese'");
fs.writeFileSync('scripts/api/api.js', c);
console.log('Fixed api.js');
