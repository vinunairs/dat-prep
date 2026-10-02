# Database

DAT Prep uses Test Prep Hub's Supabase project. The migration `dat_prep_learner_codes` (applied Oct 2, 2026) created
`dat_learners`, `dat_progress`, and the functions `dat_code_hash`, `dat_load`, `dat_save` and `dat_admin_overview`.

Add a learner (admin, SQL editor):

    insert into public.dat_learners (code_hash, first_name)
    values (public.dat_code_hash('NAME-XXXX-XXXX'), 'First name');

Their personal link is `https://vinunairs.github.io/dat-prep/?code=NAME-XXXX-XXXX`. Add an email later with
`update public.dat_learners set email = '…' where first_name = '…';`
