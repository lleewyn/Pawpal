import {createIntakeMediaEditor} from './intake-media.mjs';
import {styleEvidenceMediaEditor} from './evidence-media.mjs';
export function createReviewMediaEditor({root,db,kind,fetchImpl}){
 if(!['sales','service'].includes(kind))throw Error('invalid_review_kind');
 styleEvidenceMediaEditor(root);
 const editor=createIntakeMediaEditor({root,db,fetchImpl,purpose:'review_image',reviewKind:kind,maxFiles:5,labelText:'Ảnh đánh giá'});
 return {reset:({review,line})=>editor.reset({record:review,appointment:line,loadExisting:false}),hasDraft:()=>editor.hasDraft(),prepare:()=>editor.prepare(),saved:()=>editor.saved(),close:()=>editor.close()};
}
