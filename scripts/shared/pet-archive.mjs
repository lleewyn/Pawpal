export const PET_ARCHIVE_DAYS=30;
export function petArchiveDeadline(archivedAt){
 const time=archivedAt?new Date(archivedAt).getTime():NaN;
 return Number.isFinite(time)?time+PET_ARCHIVE_DAYS*86400000:null;
}
export function petArchiveCanRestore(deadline,now=Date.now()){
 return Number.isFinite(deadline)&&now<=deadline;
}
export function petArchiveCountdown(deadline,now=Date.now()){
 if(!Number.isFinite(deadline))return 'Chưa ghi nhận thời điểm lưu trữ';
 if(now>deadline)return 'Đã quá thời hạn khôi phục 30 ngày';
 const minutes=Math.max(0,Math.ceil((deadline-now)/60000));
 if(!minutes)return 'Còn 0 phút';
 const days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),remaining=minutes%60;
 return ('Còn '+(days?days+' ngày ':'')+(hours?hours+' giờ ':'')+((!days||remaining)?remaining+' phút':'')).trim();
}
