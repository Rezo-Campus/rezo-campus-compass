
-- =====================================================================
-- ENUMS
-- =====================================================================
create type public.file_status as enum ('nouveau', 'en_cours', 'soumis', 'accepte', 'refuse', 'archive');
create type public.document_type as enum ('identite', 'diplome', 'releve_notes', 'lettre_motivation', 'cv', 'autre');
create type public.document_status as enum ('en_attente', 'valide', 'rejete');
create type public.appointment_status as enum ('programme', 'termine', 'annule');

-- =====================================================================
-- STUDENT FILES (dossiers étudiants)
-- =====================================================================
create table public.student_files (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique,
  advisor_id uuid,
  status public.file_status not null default 'nouveau',
  target_country text,
  target_level text,
  target_program text,
  bio text,
  progress smallint not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_student_files_advisor on public.student_files(advisor_id);
create index idx_student_files_status on public.student_files(status);

grant select, insert, update, delete on public.student_files to authenticated;
grant all on public.student_files to service_role;
alter table public.student_files enable row level security;

-- Helper: conseiller assigné ?
create or replace function public.is_assigned_advisor(_student uuid, _advisor uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.student_files
    where student_id = _student and advisor_id = _advisor
  )
$$;

create policy "Etudiant voit son dossier" on public.student_files
  for select to authenticated using (auth.uid() = student_id);
create policy "Conseiller voit dossiers assignés" on public.student_files
  for select to authenticated using (auth.uid() = advisor_id);
create policy "Admin voit tous les dossiers" on public.student_files
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "Etudiant met à jour son dossier" on public.student_files
  for update to authenticated using (auth.uid() = student_id) with check (auth.uid() = student_id);
create policy "Conseiller met à jour dossiers assignés" on public.student_files
  for update to authenticated using (auth.uid() = advisor_id) with check (auth.uid() = advisor_id);
create policy "Admin gère tous les dossiers" on public.student_files
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Création auto du dossier à l'inscription d'un étudiant
create or replace function public.handle_new_student_file()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'etudiant' then
    insert into public.student_files (student_id) values (new.user_id)
    on conflict (student_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_user_role_create_student_file
  after insert on public.user_roles
  for each row execute function public.handle_new_student_file();

create trigger set_student_files_updated_at
  before update on public.student_files
  for each row execute function public.set_updated_at();

-- Backfill: créer dossier pour étudiants existants
insert into public.student_files (student_id)
select ur.user_id from public.user_roles ur
where ur.role = 'etudiant'
on conflict (student_id) do nothing;

-- =====================================================================
-- DOCUMENTS
-- =====================================================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  name text not null,
  type public.document_type not null default 'autre',
  storage_path text not null,
  size_bytes integer,
  mime_type text,
  status public.document_status not null default 'en_attente',
  notes text,
  uploaded_at timestamptz not null default now(),
  reviewed_by uuid,
  reviewed_at timestamptz
);

create index idx_documents_student on public.documents(student_id);
create index idx_documents_status on public.documents(status);

grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;

create policy "Etudiant voit ses documents" on public.documents
  for select to authenticated using (auth.uid() = student_id);
create policy "Conseiller voit documents assignés" on public.documents
  for select to authenticated using (public.is_assigned_advisor(student_id, auth.uid()));
create policy "Admin voit tous les documents" on public.documents
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "Etudiant téléverse ses documents" on public.documents
  for insert to authenticated with check (auth.uid() = student_id);
create policy "Etudiant supprime ses documents en attente" on public.documents
  for delete to authenticated using (auth.uid() = student_id and status = 'en_attente');

create policy "Conseiller valide documents assignés" on public.documents
  for update to authenticated
  using (public.is_assigned_advisor(student_id, auth.uid()))
  with check (public.is_assigned_advisor(student_id, auth.uid()));
create policy "Admin gère tous les documents" on public.documents
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- MESSAGES
-- =====================================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  recipient_id uuid not null,
  body text not null check (length(body) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_messages_pair on public.messages(sender_id, recipient_id, created_at desc);
create index idx_messages_recipient on public.messages(recipient_id, read_at);

grant select, insert, update on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;

create policy "Voir ses messages" on public.messages
  for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id or public.has_role(auth.uid(), 'admin'));
create policy "Envoyer un message" on public.messages
  for insert to authenticated with check (auth.uid() = sender_id);
create policy "Marquer comme lu" on public.messages
  for update to authenticated
  using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

alter publication supabase_realtime add table public.messages;

-- =====================================================================
-- APPOINTMENTS (rendez-vous)
-- =====================================================================
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  advisor_id uuid not null,
  scheduled_at timestamptz not null,
  duration_min smallint not null default 30 check (duration_min between 10 and 240),
  location text,
  status public.appointment_status not null default 'programme',
  notes text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_appointments_student on public.appointments(student_id, scheduled_at);
create index idx_appointments_advisor on public.appointments(advisor_id, scheduled_at);

grant select, insert, update, delete on public.appointments to authenticated;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;

create policy "Voir ses rendez-vous" on public.appointments
  for select to authenticated
  using (auth.uid() = student_id or auth.uid() = advisor_id or public.has_role(auth.uid(), 'admin'));
create policy "Conseiller/Admin crée un RDV" on public.appointments
  for insert to authenticated
  with check (
    (auth.uid() = advisor_id or public.has_role(auth.uid(), 'admin'))
    and auth.uid() = created_by
  );
create policy "Participants modifient le RDV" on public.appointments
  for update to authenticated
  using (auth.uid() = advisor_id or auth.uid() = student_id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = advisor_id or auth.uid() = student_id or public.has_role(auth.uid(), 'admin'));
create policy "Conseiller/Admin supprime un RDV" on public.appointments
  for delete to authenticated
  using (auth.uid() = advisor_id or public.has_role(auth.uid(), 'admin'));

create trigger set_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- =====================================================================
-- STORAGE: bucket privé pour documents
-- =====================================================================
insert into storage.buckets (id, name, public) values ('student-documents', 'student-documents', false)
on conflict (id) do nothing;

create policy "Etudiant voit ses fichiers" on storage.objects
  for select to authenticated
  using (bucket_id = 'student-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Etudiant téléverse dans son dossier" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'student-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Etudiant supprime ses fichiers" on storage.objects
  for delete to authenticated
  using (bucket_id = 'student-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Conseiller voit fichiers étudiants assignés" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'student-documents'
    and public.is_assigned_advisor(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create policy "Admin voit tous les fichiers" on storage.objects
  for select to authenticated
  using (bucket_id = 'student-documents' and public.has_role(auth.uid(), 'admin'));
