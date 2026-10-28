// Only model-bound data is redacted. Stored business records are unchanged.
function redact(value){return String(value)
 .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,'[Thông tin xác thực đã ẩn]')
 .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,'[Token đã ẩn]')
 .replace(/\b(?:AIza[\w-]{20,}|sb_(?:secret|publishable)_[\w-]+)\b/g,'[Khóa đã ẩn]')
 .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[Email đã ẩn]')
 .replace(/(?:\+84|\b0)[ .-]?(?:\d[ .-]?){8,10}\b/g,'[Số điện thoại đã ẩn]')
 .replace(/\b\d(?:[ -]?\d){11,18}\b/g,'[Dãy số nhạy cảm đã ẩn]')
 .replace(/((?:mật khẩu|password|api[_ -]?key|secret|cccd|cmnd|số tài khoản|địa chỉ(?: chi tiết)?)\s*[:=]\s*)[^\n;]+/giu,'$1[Thông tin riêng đã ẩn]');}
function sanitizeModelData(data){let nodes=0;
 const visit=(v,depth)=>{if(++nodes>6000||depth>12)throw Error('model_context_too_large');
  if(typeof v==='string')return redact(v);
  if(Array.isArray(v))return v.map(item=>visit(item,depth+1));
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([key])=>!/(?:raw[_-]?content|internal[_-]?note|password|access[_-]?token|refresh[_-]?token|authorization|api[_-]?key|service[_-]?key|bank[_-]?account|address[_-]?detail|jwt[_-]?secret)/i.test(key)).map(([key,value])=>[key,visit(value,depth+1)]));return v;};
 return visit(data,0);
}
module.exports={redact,sanitizeModelData};
