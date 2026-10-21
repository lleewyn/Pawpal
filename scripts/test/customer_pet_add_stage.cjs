const assert=require('node:assert/strict');const h=require('./customer_completion_helpers.cjs');
(async()=>{const {browser,page}=await h.browserPage();try{
 const c=await h.customer('Pet add verification');await h.showProfile(page,c.id);
 await page.locator('.drawer-tab-btn[data-drawertab="dtab-pets"]').click();
 await page.locator('#btnOpenAddPetModal').click();await page.locator('#btnSubmitAddPet').click();await page.locator('#addPetNameError').filter({hasText:/Nhập tên/}).waitFor();
 const breeds=await h.ok(h.service.from('pet_breed').select('id,breed_name,species:species_id(id,species_name)').eq('is_active',true));const breed=breeds.find(b=>b.species&&!/chưa/i.test(b.breed_name));
 await page.locator('#addPetName').fill('Pet UI verification');await page.locator('#addPetSpecies').fill(breed.species.species_name);await page.locator(`#addPetSpeciesDropdown [data-id="${breed.species.id}"]`).click();
 await page.locator('#addPetBreed').fill(breed.breed_name);await page.locator(`#addPetBreedDropdown [data-id="${breed.id}"]`).click();
 await page.locator('#addPetWeight').fill('4.5');await page.locator('#addPetAllergy').fill('Independent allergy');await page.locator('#addPetRoutine').fill('Independent routine');await page.locator('#addPetAlert').fill('Independent safety');
 assert.equal(await page.locator('#addPetVaccine').count(),0);
 await page.screenshot({path:h.infra+'/verification/v1-customer-pet-add.png',fullPage:true});
 await page.evaluate(()=>{const b=document.getElementById('btnSubmitAddPet');b.click();b.click();});await page.locator('#modalAddPet').waitFor({state:'hidden'});
 const pet=await h.ok(h.service.from('pet_profile').select('*').eq('customer_id',c.id).single());assert.equal(pet.breed_id,breed.id);assert.equal(pet.safety_note,'Independent safety');assert.equal(pet.allergy,'Independent allergy');assert.equal(pet.routine,'Independent routine');
 const weights=await h.ok(h.service.from('pet_weight_history').select('weight,recorded_by').eq('pet_id',pet.id));assert.equal(weights.length,1);assert.equal(Number(weights[0].weight),4.5);assert(weights[0].recorded_by);
 console.log('PASS customer pet add modal, real taxonomy, separate personal notes, one creation/weight and no vaccination field');
}finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
