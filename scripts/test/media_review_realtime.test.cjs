'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
function fixture(){
 const state={busy:false,fields:[],editors:null};
 class EditorMap extends Map{constructor(...args){super(...args);state.editors=this;}}
 const form={querySelector:()=>state.busy?{}:null,querySelectorAll:()=>state.fields};
 const window={};
 vm.runInNewContext(fs.readFileSync('pages/user/modules/orders/review-handler.js','utf8'),{window,Map:EditorMap,document:{getElementById:()=>form}});
 return {state,handler:window.ReviewHandler};
}
test('an image-only review draft remains dirty during background refresh, even without typed text',()=>{
 const {state,handler}=fixture();state.editors.set('line',{hasDraft:()=>true});assert.equal(handler.hasDraft(),true);
 state.editors.clear();assert.equal(handler.hasDraft(),false);
});
test('ratings, comments and an in-flight review all preserve the form; an untouched form may refresh',()=>{
 const {state,handler}=fixture();assert.equal(handler.hasDraft(),false);
 state.fields=[{value:'5'}];assert.equal(handler.hasDraft(),true);
 state.fields=[{value:'Nội dung đang soạn'}];assert.equal(handler.hasDraft(),true);
 state.fields=[];state.busy=true;assert.equal(handler.hasDraft(),true);
});
