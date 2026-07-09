-- =====================================================================
-- RÉZO CAMPUS — Migration v2 (2026-07-05)
-- Toutes les fonctionnalités ajoutées depuis la mise en production initiale
-- Ce fichier est idempotent : peut être rejoué sans risque
-- =====================================================================


-- =====================================================================
-- SECTION 1 — ENUMS (extensions)
-- =====================================================================

-- Ajout des nouveaux rôles au type app_role
do $$ begin
  alter type public.app_role add value if not exists 'comptable';
exception when others then null; end $$;
do $$ begin
  alter type public.app_role add value if not exists 'chef_projet';
exception when others then null; end $$;
do $$ begin
  alter type public.app_role add value if not exists 'commercial';
exception when others then null; end $$;
do $$ begin
  alter type public.app_role add value if not exists 'rh';
exception when others then null; end $$;
do $$ begin
  alter type public.app_role add value if not exists 'ecole';
exception when others then null; end $$;
do $$ begin
  alter type public.app_role add value if not exists 'secretaire';
exception when others then null; end $$;


-- =====================================================================
-- SECTION 2 — MISES À JOUR DES TABLES EXISTANTES
-- =====================================================================

-- Profiles : photo de profil + rattachement école + blocage compte
alter table public.profiles
  add column if not exists photo_url text,
  add column if not exists school_id uuid,
  add column if not exists blocked_at timestamptz;

-- Student applications : colonnes ajoutées au fil des fonctionnalités
alter table public.student_applications
  add column if not exists notes_to_school      text,
  add column if not exists ecole_validated_at   timestamptz,
  add column if not exists ecole_cachet_url     text,
  add column if not exists frais_inscription_recus boolean not null default false;

-- Client appointments : champs de suivi des rendez-vous
alter table public.client_appointments
  add column if not exists a_eu_lieu      boolean,
  add column if not exists sujet_discute  text,
  add column if not exists resolutions    text,
  add column if not exists perspectives   text,
  add column if not exists motif_echec    text;

-- Projects : logo partenaire
alter table public.projects
  add column if not exists partner_logo_url text;


-- =====================================================================
-- SECTION 3 — ÉCOLES ET FORMATIONS
-- =====================================================================

create table if not exists public.schools (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  city         text,
  country      text,
  website      text,
  logo_url     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

grant select, insert, update, delete on public.schools to authenticated;
grant all on public.schools to service_role;
alter table public.schools enable row level security;

do $$ begin
  create policy "Tout le monde voit les écoles"
    on public.schools for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admin gère les écoles"
    on public.schools for all to authenticated
    using (public.has_role(auth.uid(), 'admin'))
    with check (public.has_role(auth.uid(), 'admin'));
exception when duplicate_object then null; end $$;

-- ---

create table if not exists public.school_programs (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  name       text not null,
  level      text,
  domain     text,
  language   text,
  duration   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_school_programs_school on public.school_programs(school_id);

grant select, insert, update, delete on public.school_programs to authenticated;
grant all on public.school_programs to service_role;
alter table public.school_programs enable row level security;

do $$ begin
  create policy "Tout le monde voit les formations"
    on public.school_programs for select to authenticated using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admin gère les formations"
    on public.school_programs for all to authenticated
    using (public.has_role(auth.uid(), 'admin'))
    with check (public.has_role(auth.uid(), 'admin'));
exception when duplicate_object then null; end $$;

-- École gère ses propres formations
do $$ begin
  create policy "Ecole gère ses formations"
    on public.school_programs for all to authenticated
    using (
      school_id in (
        select school_id from public.profiles where id = auth.uid()
      )
    )
    with check (
      school_id in (
        select school_id from public.profiles where id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;


-- =====================================================================
-- SECTION 4 — CANDIDATURES ÉTUDIANTS
-- =====================================================================

create table if not exists public.student_applications (
  id                       uuid primary key default gen_random_uuid(),
  student_id               uuid not null references auth.users(id) on delete cascade,
  program_id               uuid not null references public.school_programs(id) on delete cascade,
  school_id                uuid not null references public.schools(id) on delete cascade,
  status                   text not null default 'selection',
  motivation_letter        text,
  counselor_notes          text,
  notes_to_school          text,
  ecole_validated_at       timestamptz,
  ecole_cachet_url         text,
  frais_inscription_recus  boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists idx_student_applications_student on public.student_applications(student_id);
create index if not exists idx_student_applications_school  on public.student_applications(school_id);
create index if not exists idx_student_applications_status  on public.student_applications(status);

grant select, insert, update, delete on public.student_applications to authenticated;
grant all on public.student_applications to service_role;
alter table public.student_applications enable row level security;

do $$ begin
  create policy "Etudiant voit ses candidatures"
    on public.student_applications for select to authenticated
    using (auth.uid() = student_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Staff voit toutes les candidatures"
    on public.student_applications for select to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','conseiller','secretaire','rh','comptable','chef_projet','commercial')
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Ecole voit ses candidatures"
    on public.student_applications for select to authenticated
    using (
      school_id in (
        select school_id from public.profiles where id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Etudiant crée ses candidatures"
    on public.student_applications for insert to authenticated
    with check (auth.uid() = student_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Etudiant met à jour ses candidatures"
    on public.student_applications for update to authenticated
    using (auth.uid() = student_id)
    with check (auth.uid() = student_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Etudiant supprime ses candidatures en sélection"
    on public.student_applications for delete to authenticated
    using (auth.uid() = student_id and status = 'selection');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Staff met à jour les candidatures"
    on public.student_applications for update to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','conseiller','secretaire')
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Ecole valide ses candidatures"
    on public.student_applications for update to authenticated
    using (
      school_id in (
        select school_id from public.profiles where id = auth.uid()
      )
    )
    with check (
      school_id in (
        select school_id from public.profiles where id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;


-- =====================================================================
-- SECTION 5 — COURRIERS
-- =====================================================================

create table if not exists public.courriers (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  type         text not null default 'entrant',
  sender       text,
  recipient    text,
  date_courrier date,
  storage_path text,
  notes        text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

grant select, insert, update, delete on public.courriers to authenticated;
grant all on public.courriers to service_role;
alter table public.courriers enable row level security;

do $$ begin
  create policy "Staff voit les courriers"
    on public.courriers for select to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','secretaire','conseiller','rh','comptable','chef_projet','commercial')
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Staff gère les courriers"
    on public.courriers for all to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','secretaire')
    ))
    with check (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','secretaire')
    ));
exception when duplicate_object then null; end $$;


-- =====================================================================
-- SECTION 6 — CLIENTS ET RENDEZ-VOUS CLIENTS
-- =====================================================================

create table if not exists public.clients (
  id               uuid primary key default gen_random_uuid(),
  type             text not null default 'individuel',  -- individuel | entreprise
  prenom           text,
  nom              text,
  nom_entreprise   text,
  email            text,
  telephone        text,
  adresse_physique text,
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;
alter table public.clients enable row level security;

do $$ begin
  create policy "Staff lit tous les clients"
    on public.clients for select to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','secretaire','conseiller','rh','comptable','chef_projet','commercial')
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Staff gère les clients"
    on public.clients for all to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','secretaire','commercial')
    ))
    with check (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','secretaire','commercial')
    ));
exception when duplicate_object then null; end $$;

-- ---

create table if not exists public.client_appointments (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid references public.clients(id) on delete set null,
  scheduled_at   timestamptz not null,
  duration_min   smallint default 60,
  location       text,
  agenda         text,
  status         text not null default 'programme',
  notes          text,
  -- Champs suivi (renseignés après le RDV)
  a_eu_lieu      boolean,
  sujet_discute  text,
  resolutions    text,
  perspectives   text,
  motif_echec    text,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

grant select, insert, update, delete on public.client_appointments to authenticated;
grant all on public.client_appointments to service_role;
alter table public.client_appointments enable row level security;

do $$ begin
  create policy "Staff voit les RDV clients"
    on public.client_appointments for select to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','secretaire','conseiller','rh','comptable','chef_projet','commercial')
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Staff gère les RDV clients"
    on public.client_appointments for all to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','secretaire','commercial','rh')
    ))
    with check (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','secretaire','commercial','rh')
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Staff met à jour le suivi des RDV clients"
    on public.client_appointments for update to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','secretaire','conseiller','rh','commercial')
    ));
exception when duplicate_object then null; end $$;


-- =====================================================================
-- SECTION 7 — RÉUNIONS (planifiées par RH)
-- =====================================================================

create table if not exists public.meetings (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  scheduled_at timestamptz not null,
  duration_min smallint default 60,
  location     text,
  agenda       text,
  notes        text,
  status       text not null default 'planifie',  -- planifie | termine | annule
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

grant select, insert, update, delete on public.meetings to authenticated;
grant all on public.meetings to service_role;
alter table public.meetings enable row level security;

do $$ begin
  create policy "Tout le staff voit les réunions"
    on public.meetings for select to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','rh','conseiller','secretaire','comptable','chef_projet','commercial')
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admin et RH gèrent les réunions"
    on public.meetings for all to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','rh')
    ))
    with check (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','rh')
    ));
exception when duplicate_object then null; end $$;


-- =====================================================================
-- SECTION 8 — FACTURATION
-- =====================================================================

create table if not exists public.invoices (
  id           uuid primary key default gen_random_uuid(),
  numero       text not null,
  client_id    uuid references public.clients(id) on delete set null,
  date_facture date not null default current_date,
  status       text not null default 'brouillon',  -- brouillon | envoyee | payee | annulee
  conditions   text,
  notes        text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.invoice_lines (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  service     text not null,
  description text,
  montant     numeric(12,2) not null default 0,
  position    smallint not null default 0,
  created_at  timestamptz not null default now()
);

grant select, insert, update, delete on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;

grant select, insert, update, delete on public.invoice_lines to authenticated;
grant all on public.invoice_lines to service_role;
alter table public.invoice_lines enable row level security;

do $$ begin
  create policy "Staff voit les factures"
    on public.invoices for select to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','comptable','conseiller','secretaire','rh','chef_projet','commercial')
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admin et Comptable gèrent les factures"
    on public.invoices for all to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','comptable')
    ))
    with check (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','comptable')
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Staff voit les lignes de facture"
    on public.invoice_lines for select to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','comptable','conseiller','secretaire','rh','chef_projet','commercial')
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admin et Comptable gèrent les lignes"
    on public.invoice_lines for all to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','comptable')
    ))
    with check (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','comptable')
    ));
exception when duplicate_object then null; end $$;


-- =====================================================================
-- SECTION 9 — NOTIFICATIONS
-- =====================================================================

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  body       text,
  read       boolean not null default false,
  data       jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

do $$ begin
  create policy "Utilisateur lit ses notifications"
    on public.notifications for select to authenticated
    using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Tout authentifié peut insérer une notification"
    on public.notifications for insert to authenticated
    with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Utilisateur marque ses notifications lues"
    on public.notifications for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;


-- =====================================================================
-- SECTION 10 — DOCUMENTS OFFICIELS (école/admin → étudiant)
-- =====================================================================

create table if not exists public.official_documents (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.student_applications(id) on delete set null,
  uploaded_by    uuid references auth.users(id),
  source         text not null,   -- 'ecole' | 'admin'
  type           text not null,   -- convocation | lettre_admission | prise_en_charge | aevm | ...
  name           text not null,
  storage_path   text not null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_official_docs_student on public.official_documents(student_id);

grant select, insert, update, delete on public.official_documents to authenticated;
grant all on public.official_documents to service_role;
alter table public.official_documents enable row level security;

do $$ begin
  create policy "Etudiant lit ses documents officiels"
    on public.official_documents for select to authenticated
    using (student_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Staff lit les documents officiels"
    on public.official_documents for select to authenticated
    using (exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin','conseiller','secretaire','rh','ecole','comptable','chef_projet','commercial')
    ));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Staff et école insèrent des documents officiels"
    on public.official_documents for insert to authenticated
    with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "L uploadeur supprime ses documents officiels"
    on public.official_documents for delete to authenticated
    using (uploaded_by = auth.uid());
exception when duplicate_object then null; end $$;


-- =====================================================================
-- SECTION 11 — STORAGE BUCKETS
-- =====================================================================

-- Bucket public : photos de profil
insert into storage.buckets (id, name, public)
  values ('photos', 'photos', true)
  on conflict (id) do nothing;

-- Bucket public : logos partenaires et cachets
insert into storage.buckets (id, name, public)
  values ('partner-logos', 'partner-logos', true)
  on conflict (id) do nothing;

-- Bucket privé : courriers scannés
insert into storage.buckets (id, name, public)
  values ('courriers', 'courriers', false)
  on conflict (id) do nothing;


-- =====================================================================
-- SECTION 12 — POLICIES STORAGE
-- =====================================================================

-- ── Bucket photos ──────────────────────────────────────────────────
do $$ begin
  create policy "Etudiant uploade sa photo"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'photos');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Tout le monde voit les photos"
    on storage.objects for select to authenticated
    using (bucket_id = 'photos');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Propriétaire met à jour sa photo"
    on storage.objects for update to authenticated
    using (bucket_id = 'photos' and owner = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Propriétaire supprime sa photo"
    on storage.objects for delete to authenticated
    using (bucket_id = 'photos' and owner = auth.uid());
exception when duplicate_object then null; end $$;

-- ── Bucket partner-logos ────────────────────────────────────────────
do $$ begin
  create policy "Tout le monde voit les logos partenaires"
    on storage.objects for select to authenticated
    using (bucket_id = 'partner-logos');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admin uploade les logos partenaires"
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'partner-logos'
      and exists (
        select 1 from public.user_roles
        where user_id = auth.uid() and role = 'admin'
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admin met à jour les logos partenaires"
    on storage.objects for update to authenticated
    using (
      bucket_id = 'partner-logos'
      and exists (
        select 1 from public.user_roles
        where user_id = auth.uid() and role = 'admin'
      )
    );
exception when duplicate_object then null; end $$;

-- École et admin uploadent les cachets (dossier caches/)
do $$ begin
  create policy "Authentifié uploade un cachet"
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'partner-logos'
      and (storage.foldername(name))[1] = 'caches'
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Authentifié met à jour un cachet"
    on storage.objects for update to authenticated
    using (
      bucket_id = 'partner-logos'
      and (storage.foldername(name))[1] = 'caches'
    );
exception when duplicate_object then null; end $$;

-- ── Bucket student-documents (extensions) ──────────────────────────

-- Étudiants lisent leurs propres fichiers uploadés
do $$ begin
  create policy "Etudiant lit ses propres fichiers"
    on storage.objects for select to authenticated
    using (
      bucket_id = 'student-documents'
      and owner = auth.uid()
    );
exception when duplicate_object then null; end $$;

-- Étudiants lisent les docs officiels téléversés POUR EUX
do $$ begin
  create policy "Etudiant lit les docs officiels pour lui"
    on storage.objects for select to authenticated
    using (
      bucket_id = 'student-documents'
      and (
        (
          (storage.foldername(name))[1] = 'official'
          and (storage.foldername(name))[2] = auth.uid()::text
        )
        or (
          (storage.foldername(name))[1] = 'admin-docs'
          and (storage.foldername(name))[2] = auth.uid()::text
        )
      )
    );
exception when duplicate_object then null; end $$;

-- Tout le staff lit tous les fichiers du bucket
do $$ begin
  create policy "Staff lit tous les fichiers étudiants"
    on storage.objects for select to authenticated
    using (
      bucket_id = 'student-documents'
      and exists (
        select 1 from public.user_roles
        where user_id = auth.uid()
          and role in ('admin','conseiller','secretaire','ecole','rh','comptable','chef_projet','commercial')
      )
    );
exception when duplicate_object then null; end $$;

-- Staff uploade dans official/ et admin-docs/
do $$ begin
  create policy "Staff uploade docs officiels"
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'student-documents'
      and (
        (storage.foldername(name))[1] in ('official', 'admin-docs')
      )
    );
exception when duplicate_object then null; end $$;

-- École uploade dans official/
do $$ begin
  create policy "Ecole uploade docs officiels école"
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'student-documents'
      and (storage.foldername(name))[1] = 'official'
      and exists (
        select 1 from public.user_roles
        where user_id = auth.uid() and role in ('admin','ecole')
      )
    );
exception when duplicate_object then null; end $$;

-- ── Bucket courriers ────────────────────────────────────────────────
do $$ begin
  create policy "Staff voit les courriers scannés"
    on storage.objects for select to authenticated
    using (
      bucket_id = 'courriers'
      and exists (
        select 1 from public.user_roles
        where user_id = auth.uid()
          and role in ('admin','secretaire','conseiller','rh')
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Secrétaire et admin uploadent les courriers"
    on storage.objects for insert to authenticated
    with check (
      bucket_id = 'courriers'
      and exists (
        select 1 from public.user_roles
        where user_id = auth.uid()
          and role in ('admin','secretaire')
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Secrétaire et admin suppriment les courriers"
    on storage.objects for delete to authenticated
    using (
      bucket_id = 'courriers'
      and exists (
        select 1 from public.user_roles
        where user_id = auth.uid()
          and role in ('admin','secretaire')
      )
    );
exception when duplicate_object then null; end $$;


-- =====================================================================
-- SECTION 13 — SYSTÈME D'ENTRETIENS RH
-- =====================================================================

-- Sessions d'entretien (postes ouverts)
create table if not exists public.interview_sessions (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  position    text        not null,
  description text,
  created_by  uuid        references auth.users(id) on delete set null,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

alter table public.interview_sessions enable row level security;

-- Créneaux disponibles par session
create table if not exists public.interview_slots (
  id           uuid        primary key default gen_random_uuid(),
  session_id   uuid        not null references public.interview_sessions(id) on delete cascade,
  starts_at    timestamptz not null,
  duration_min smallint    not null default 30,
  mode         text        not null default 'presentiel',   -- 'presentiel' | 'en_ligne'
  location     text,                                         -- adresse ou lien Teams/Meet
  is_booked    boolean     not null default false,
  created_at   timestamptz not null default now()
);

alter table public.interview_slots enable row level security;

-- Réservations des candidats
create table if not exists public.interview_bookings (
  id               uuid        primary key default gen_random_uuid(),
  slot_id          uuid        not null references public.interview_slots(id) on delete cascade,
  session_id       uuid        not null references public.interview_sessions(id) on delete cascade,
  applicant_name   text        not null,
  applicant_email  text        not null,
  applicant_phone  text,
  google_uid       text,
  notes            text,
  created_at       timestamptz not null default now(),
  unique (session_id, applicant_email)   -- un seul entretien par email par session
);

alter table public.interview_bookings enable row level security;

-- ── Politiques interview_sessions ──

-- RH et admin gèrent leurs sessions
do $$ begin
  create policy "RH gère ses sessions"
    on public.interview_sessions for all to authenticated
    using (
      auth.uid() = created_by
      or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
    )
    with check (
      auth.uid() = created_by
      or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
    );
exception when duplicate_object then null; end $$;

-- Lecture publique des sessions actives (page de réservation)
do $$ begin
  create policy "Lecture publique des sessions actives"
    on public.interview_sessions for select
    using (is_active = true);
exception when duplicate_object then null; end $$;

-- ── Politiques interview_slots ──

-- RH et admin gèrent les créneaux de leurs sessions
do $$ begin
  create policy "RH gère ses créneaux"
    on public.interview_slots for all to authenticated
    using (
      exists (
        select 1 from public.interview_sessions s
        where s.id = session_id
          and (
            s.created_by = auth.uid()
            or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
          )
      )
    )
    with check (
      exists (
        select 1 from public.interview_sessions s
        where s.id = session_id
          and (
            s.created_by = auth.uid()
            or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
          )
      )
    );
exception when duplicate_object then null; end $$;

-- Lecture publique des créneaux disponibles
do $$ begin
  create policy "Lecture publique des créneaux disponibles"
    on public.interview_slots for select
    using (is_booked = false);
exception when duplicate_object then null; end $$;

-- Mise à jour publique (marquer comme réservé au moment de la réservation)
do $$ begin
  create policy "Réservation publique d un créneau"
    on public.interview_slots for update
    using (is_booked = false)
    with check (is_booked = true);
exception when duplicate_object then null; end $$;

-- ── Politiques interview_bookings ──

-- Insertion publique (les candidats réservent sans compte)
do $$ begin
  create policy "Candidats insèrent leur réservation"
    on public.interview_bookings for insert
    with check (true);
exception when duplicate_object then null; end $$;

-- Lecture par le RH/admin de toutes les réservations de leurs sessions
do $$ begin
  create policy "RH lit les réservations de ses sessions"
    on public.interview_bookings for select to authenticated
    using (
      exists (
        select 1 from public.interview_sessions s
        where s.id = session_id
          and (
            s.created_by = auth.uid()
            or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
          )
      )
    );
exception when duplicate_object then null; end $$;

-- Suppression par le RH/admin
do $$ begin
  create policy "RH supprime les réservations"
    on public.interview_bookings for delete to authenticated
    using (
      exists (
        select 1 from public.interview_sessions s
        where s.id = session_id
          and (
            s.created_by = auth.uid()
            or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
          )
      )
    );
exception when duplicate_object then null; end $$;
