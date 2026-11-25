-- A missing historical hire date is unknown, not the record creation date.
ALTER TABLE public.staff ALTER COLUMN hire_date DROP NOT NULL;
