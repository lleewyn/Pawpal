import {createIntakeMediaEditor} from './intake-media.mjs';

// A stable draft message/return ID is required before upload and reused by the business RPC.
export function styleEvidenceMediaEditor(root){
    root.classList.add('evidence-media-editor');
    if(!document.getElementById('evidence-media-editor-style')){
        const style=document.createElement('style');style.id='evidence-media-editor-style';
        style.textContent='.evidence-media-editor button{border:1px solid #ECF2EE;border-radius:9px;padding:7px 12px;background:#fff;color:#236B48;font:inherit;font-size:13px;cursor:pointer}.evidence-media-editor button:disabled{opacity:.5;cursor:default}.evidence-media-editor label{color:#236B48;font-weight:600}';document.head.append(style);
    }
}
export function createEvidenceMediaEditor({root,db,purpose,fetchImpl}) {
    if(!['ticket_image','return_image'].includes(purpose))throw Error('invalid_evidence_purpose');
    styleEvidenceMediaEditor(root);
    const editor=createIntakeMediaEditor({root,db,purpose,fetchImpl,maxFiles:5,labelText:'Ảnh bằng chứng'});
    return {
        reset:({target,context})=>editor.reset({record:target,appointment:context,loadExisting:false}),
        prepare:()=>editor.prepare(),saved:()=>editor.saved(),close:()=>editor.close()
    };
}
