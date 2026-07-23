-- Folders table (logical grouping like "Fifth Settlement")
CREATE TABLE public.unconfirmed_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unconfirmed_folders_pkey PRIMARY KEY (id),
  CONSTRAINT unconfirmed_folders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- Files table (a site/compound within a folder, e.g. "The Brooks")
CREATE TABLE public.unconfirmed_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL,
  name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unconfirmed_files_pkey PRIMARY KEY (id),
  CONSTRAINT unconfirmed_files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.unconfirmed_folders(id) ON DELETE CASCADE,
  CONSTRAINT unconfirmed_files_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- Add file_id to existing records
ALTER TABLE public.unconfirmed_records
  ADD COLUMN file_id uuid REFERENCES public.unconfirmed_files(id) ON DELETE SET NULL;
