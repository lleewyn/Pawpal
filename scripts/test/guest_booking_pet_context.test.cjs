const {test}=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../../pages/services/booking/booking-guest-pets.mjs');
test('Guest breed picker excludes inactive species and meaningless autocomplete labels',async()=>{
 const {cleanGuestBreeds}=await load();const valid={id:'breed',breed_name:'Poodle',species_id:'dog',pet_species:{is_active:true,species_name:'Chó'}};
 const rows=[valid,...['','  ','7','unknown','null','undefined','Chưa rõ','Chưa cập nhật'].map(breed_name=>({...valid,breed_name})),{...valid,pet_species:{is_active:false}}];assert.deepEqual(cleanGuestBreeds(rows),[valid]);
});
test('Guest pet mapping uses catalog species and does not invent a weight or expose arbitrary context fields',async()=>{
 const {guestPetFromContext}=await load();const pet={id:'pet',name:'Same name',breedId:'breed',gender:'nam',customer_id:'private-owner',phone:'private-phone',weight:99};
 const result=guestPetFromContext(pet,[{id:'breed',breed_name:'Poodle',species_id:'dog',pet_species:{species_name:'Chó'}}]);
 assert.equal(result.species_id,'dog');assert.equal(result.name,'Same name');assert.equal(result.weight,undefined);assert.equal(result.customer_id,undefined);assert.equal(result.phone,undefined);
});
