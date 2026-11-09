import {createProductMediaEditor} from './product-media.mjs';
import {mediaSource} from './media-source.mjs';
export function createContentMediaEditor({root,db,purpose,fetchImpl}){
 if(!['banner_image','blog_thumbnail'].includes(purpose))throw Error('invalid_content_media_purpose');
 const node=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
 root.style.cssText='display:flex;flex-direction:column;gap:8px';
 const title=node('label',purpose==='banner_image'?'Ảnh banner':'Ảnh đại diện bài viết');title.className='form-label-clean';
 if(purpose==='banner_image'){const required=node('span',' *');required.style.color='#DC2626';title.append(required);}
 const modes=node('div'),name='content-media-'+crypto.randomUUID();modes.style.cssText='display:flex;gap:16px;flex-wrap:wrap';
 for(const [value,text]of [['url','Dùng đường dẫn ảnh'],['upload','Tải ảnh lên']]){const label=node('label'),radio=node('input');radio.type='radio';radio.name=name;radio.value=value;radio.dataset.mediaMode='';radio.checked=value==='url';label.append(radio,document.createTextNode(' '+text));modes.append(label);}
 const links=node('input');links.type='text';links.className='admin-input';links.placeholder='Đường dẫn ảnh';links.dataset.mediaLinks='';links.setAttribute('aria-label','Đường dẫn ảnh');
 const upload=node('div');upload.dataset.mediaUpload='';upload.hidden=true;
 const pick=node('button','Chọn ảnh');pick.type='button';pick.className='admin-btn admin-btn-secondary';pick.dataset.mediaPick='';
 const file=node('input');file.type='file';file.hidden=true;file.accept='image/jpeg,image/png,image/webp';file.dataset.mediaFiles='';file.setAttribute('aria-label','Chọn ảnh');upload.append(pick,file);
 const hint=node('p','Một ảnh JPEG, PNG hoặc WebP, tối đa 3 MiB');hint.style.cssText='font-size:12px;color:#4F7A65;margin:0';
 const status=node('p');status.dataset.mediaStatus='';status.setAttribute('role','status');status.style.cssText='color:#DC2626;margin:0';
 const gallery=node('div');gallery.dataset.mediaGallery='';gallery.style.cssText='display:flex;gap:8px;flex-wrap:wrap';root.append(title,modes,links,upload,hint,status,gallery);
 const editor=createProductMediaEditor({root,db,purpose,fetchImpl,maxFiles:1,imageLabel:purpose==='banner_image'?'Ảnh banner':'Ảnh đại diện bài viết'});
 return {
  reset:({id,asset,url})=>editor.reset({id,media:asset?[{media_asset_id:asset}]:url?[{image_url:url}]:[]}),
  async prepare(){const sources=await editor.prepare();if(sources.length>1)throw Error('Mỗi vị trí chỉ chọn một ảnh.');const source=sources[0];return source?.asset_id?{url:null,asset:source.asset_id}:source?.url?{url:mediaSource(source).url,asset:null}:{url:null,asset:null};},
  saved:()=>editor.saved(),close:()=>editor.close()
 };
}
