const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('pages/public/return-guest/return-guest.js','utf8');
const context={};vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function fmtDate('),source.indexOf('function resolveBookingStatus(')),context);
test('lookup formats local and ISO dates and rejects invalid dates',()=>{
 assert.equal(context.fmtDate('16/10/2026'),'16/10/2026');
 assert.equal(context.fmtDate('2/3/2026'),'02/03/2026');
 assert.equal(context.fmtDate('2026-10-16'),'16/10/2026');
 assert.equal(context.fmtDate('31/02/2026'),'Chưa có ngày');
 assert.equal(context.fmtDate('bad-date'),'Chưa có ngày');
 assert.equal(context.fmtDate(null),'');
});
test('lookup removes operational blocks and retains surrounding customer notes',()=>{
 const value='Lưu ý dị ứng. [Pawpal handover v1] qualityAccepted true [/Pawpal handover] [Pawpal intake v1] staffName encoded%20name [/Pawpal intake] Đón bé lúc 17 giờ.';
 assert.equal(context.guestVisibleBookingNote(value),'Lưu ý dị ứng. Đón bé lúc 17 giờ.');
 assert.equal(context.guestVisibleBookingNote('[Pawpal intake v1] incomplete internal record'),'');
 assert.equal(context.guestVisibleBookingNote('Lý do hủy: khách đổi kế hoạch'),'Lý do hủy: khách đổi kế hoạch');
 assert.equal(context.guestVisibleBookingNote('<script>text</script>'),'<script>text</script>'); // Escaped by the card renderer, never interpreted as HTML.
});
