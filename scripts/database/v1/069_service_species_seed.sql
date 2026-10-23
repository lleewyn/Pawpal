BEGIN;
-- Initial business configuration approved by the user, per service.
-- Existing manual associations are preserved; no blanket 'Khac' association.
CREATE TEMP TABLE service_species_seed(service_code text PRIMARY KEY,species_names text[]) ON COMMIT DROP;
INSERT INTO service_species_seed VALUES
 ('SPA01',ARRAY['Chó','Mèo']),('SPA02',ARRAY['Chó','Mèo']),('SPA03',ARRAY['Chó']),
 ('SPA04',ARRAY['Chó','Mèo']),('SPA05',ARRAY['Chó','Mèo']),('SPA06',ARRAY['Chó','Mèo']),
 ('SPA07',ARRAY['Chó']),('SPA08',ARRAY['Chó']),('SPA09',ARRAY['Mèo']),('SPA11',ARRAY['Chó']),
 ('SPA12',ARRAY['Chó','Mèo']),('SPA13',ARRAY['Thỏ']),('SPA14',ARRAY['Thỏ','Chuột Hamster']),
 ('HTL01',ARRAY['Chó','Mèo']),('HTL02',ARRAY['Chó','Mèo']),('HTL03',ARRAY['Chó','Mèo']),
 ('HTL04',ARRAY['Mèo']),('HTL05',ARRAY['Chó','Mèo']),('HTL06',ARRAY['Chó']),
 ('HTL07',ARRAY['Chó','Mèo']),('HTL08',ARRAY['Thỏ','Chuột Hamster']),
 ('TXI01',ARRAY['Chó','Mèo','Thỏ','Chuột Hamster']);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM service_species_seed seed LEFT JOIN public.service s ON s.service_code=seed.service_code
  WHERE s.id IS NULL OR s.status<>'active') THEN RAISE EXCEPTION 'Expected active service missing'; END IF;
 IF EXISTS(SELECT 1 FROM service_species_seed seed CROSS JOIN LATERAL unnest(seed.species_names) n(name)
  LEFT JOIN public.pet_species p ON p.species_name=n.name AND p.is_active WHERE p.id IS NULL) THEN
  RAISE EXCEPTION 'Expected active species missing'; END IF;
END $$;
INSERT INTO public.service_supported_species(service_id,species_id)
SELECT s.id,p.id FROM service_species_seed seed JOIN public.service s ON s.service_code=seed.service_code
CROSS JOIN LATERAL unnest(seed.species_names) n(name) JOIN public.pet_species p ON p.species_name=n.name
ON CONFLICT(service_id,species_id) DO NOTHING;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM service_species_seed seed JOIN public.service s ON s.service_code=seed.service_code
  CROSS JOIN LATERAL unnest(seed.species_names) n(name) JOIN public.pet_species p ON p.species_name=n.name
  WHERE NOT EXISTS(SELECT 1 FROM public.service_supported_species x WHERE x.service_id=s.id AND x.species_id=p.id)) THEN
  RAISE EXCEPTION 'Incomplete service species mapping'; END IF;
END $$;
COMMIT;
