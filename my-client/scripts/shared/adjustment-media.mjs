import {createIntakeMediaEditor} from './intake-media.mjs';
export const createAdjustmentMediaEditor=options=>createIntakeMediaEditor({...options,purpose:'adjustment_image',labelText:'Ảnh bằng chứng phụ phí'});
