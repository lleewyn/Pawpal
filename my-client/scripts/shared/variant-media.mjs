import { createProductMediaEditor } from './product-media.mjs';

export function buildVariantMediaFields(root,id) {
    const make=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
    root.style.cssText='display:flex;flex-direction:column;gap:6px;min-width:220px';
    const modes=make('div');modes.style.cssText='display:flex;gap:12px;flex-wrap:wrap';
    for(const [value,text]of [['url','Dùng đường dẫn'],['upload','Tải ảnh lên']]){
        const label=make('label'),radio=make('input');radio.type='radio';radio.name='variant-media-'+id;radio.value=value;radio.dataset.mediaMode='';radio.checked=value==='url';label.append(radio,document.createTextNode(' '+text));modes.append(label);
    }
    const links=make('input');links.type='text';links.className='admin-input variant-img-input';links.dataset.mediaLinks='';links.placeholder='Đường dẫn ảnh';links.setAttribute('aria-label','Đường dẫn ảnh biến thể');
    const upload=make('div');upload.dataset.mediaUpload='';upload.hidden=true;
    const pick=make('button','Chọn ảnh');pick.type='button';pick.className='admin-btn admin-btn-secondary';pick.dataset.mediaPick='';
    const files=make('input');files.type='file';files.multiple=true;files.hidden=true;files.dataset.mediaFiles='';files.accept='image/jpeg,image/png,image/webp';files.setAttribute('aria-label','Chọn ảnh biến thể');
    upload.append(pick,files);const hint=make('span','Tối đa 10 ảnh, mỗi ảnh 3 MiB');hint.style.cssText='font-size:11px;color:#4F7A65';
    const status=make('div');status.dataset.mediaStatus='';status.setAttribute('role','status');status.style.color='#DC2626';
    const gallery=make('div');gallery.dataset.mediaGallery='';gallery.style.cssText='display:flex;gap:6px;flex-wrap:wrap';
    root.append(modes,links,upload,hint,status,gallery);
}

// A row may be rebuilt when attributes change; move the existing editor DOM to retain its draft and stable ID.
export function createVariantMediaRegistry({db,editorFactory=createProductMediaEditor}) {
    const entries=new Map();let productId,existing=false;
    function clear(){for(const entry of entries.values())void entry.editor.close();entries.clear();}
    return {
        reset({id,isExisting=false}){clear();productId=id;existing=isExisting;},
        sync(specs){
            const active=new Set(specs.map(row=>row.id));
            for(const [id,entry]of entries)if(!active.has(id)){void entry.editor.close();entries.delete(id);}
            for(const spec of specs){
                let entry=entries.get(spec.id);
                if(!entry){
                    const root=document.createElement('div');buildVariantMediaFields(root,spec.id);
                    const editor=editorFactory({root,db,purpose:'product_variant_image'});
                    const media=spec.media||String(spec.legacy||'').split(',').map(url=>url.trim()).filter(Boolean).map(image_url=>({image_url}));
                    editor.reset({id:productId,variant:spec.id,isExisting:existing,media});
                    entry={root,editor};entries.set(spec.id,entry);
                }
                spec.host.replaceChildren(entry.root);
            }
        },
        async prepare(ids){const result=new Map();for(const id of ids){const entry=entries.get(id);if(!entry)throw Error('Ảnh biến thể chưa sẵn sàng. Mở lại sản phẩm và thử lại.');result.set(id,await entry.editor.prepare());}return result;},
        newFileCount(ids){return ids.reduce((sum,id)=>sum+(entries.get(id)?.editor.newFileCount()||0),0);},
        saved(){for(const entry of entries.values())entry.editor.saved();},
        remove(id){const entry=entries.get(id);if(entry){void entry.editor.close();entries.delete(id);}},
        close:clear
    };
}
