import {test} from 'node:test';
import assert from 'node:assert/strict';
import {petArchiveDeadline,petArchiveCountdown,petArchiveCanRestore} from '../shared/pet-archive.mjs';
test('archive clock uses the persisted timestamp across reloads and reaches expiry without negative time',()=>{
 const start='2026-11-09T03:00:00Z',deadline=petArchiveDeadline(start);
 assert.equal(deadline,Date.parse('2026-12-09T03:00:00Z'));
 assert.equal(petArchiveCountdown(deadline,Date.parse(start)),'Còn 30 ngày');
 assert.equal(petArchiveCountdown(petArchiveDeadline(start),Date.parse('2026-11-10T05:01:00Z')),'Còn 28 ngày 21 giờ 59 phút');
 assert.equal(petArchiveCountdown(deadline,deadline-1),'Còn 1 phút');
 assert.equal(petArchiveCountdown(deadline,deadline),'Còn 0 phút');
 assert.equal(petArchiveCountdown(deadline,deadline+1),'Đã quá thời hạn khôi phục 30 ngày');
 assert.equal(petArchiveCountdown(petArchiveDeadline(null)),'Chưa ghi nhận thời điểm lưu trữ');
});
test('restore is allowed on day 29, during day 30 and at the exact deadline, then denied',()=>{
 const start=Date.parse('2026-11-09T03:00:00Z'),deadline=petArchiveDeadline(new Date(start));
 for(const elapsed of [29*86400000,30*86400000-1,30*86400000])assert.equal(petArchiveCanRestore(deadline,start+elapsed),true);
 for(const elapsed of [30*86400000+1,31*86400000])assert.equal(petArchiveCanRestore(deadline,start+elapsed),false);
 assert.equal(petArchiveCanRestore(null,start),false);
});
