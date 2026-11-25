import {createIntakeMediaEditor} from './intake-media.mjs';
export const createHandoverMediaEditor=options=>createIntakeMediaEditor({...options,purpose:'handover_image',labelText:'Ảnh bàn giao'});
