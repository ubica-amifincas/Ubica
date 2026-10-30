-- Activa Row Level Security en todas las tablas de "public".
-- Sin políticas, los roles anon/authenticated de la API REST de Supabase no pueden leer ni escribir nada.
-- El backend (FastAPI) conecta como "postgres", que tiene BYPASSRLS, así que sigue funcionando igual.
-- Ejecutar en Supabase > SQL Editor.

alter table public."aiconversation" enable row level security;
alter table public."favorite"       enable row level security;
alter table public."gamescore"      enable row level security;
alter table public."investment"     enable row level security;
alter table public."message"        enable row level security;
alter table public."property"       enable row level security;
alter table public."savedsearch"    enable row level security;
alter table public."tasadorguess"   enable row level security;  -- estas tres las crea el backend al arrancar (ensure_tables)
alter table public."portfolioproperty" enable row level security;
alter table public."portfolioitem"  enable row level security;
alter table public."user"           enable row level security;
