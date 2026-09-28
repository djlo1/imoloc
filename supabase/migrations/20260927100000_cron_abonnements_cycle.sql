-- Planifie l appel quotidien de l Edge Function abonnements-cycle (relance
-- de paiement a la fin de l essai, puis suspension apres 15 jours de grace
-- sans paiement). Premiere utilisation de pg_net + Vault dans ce projet :
-- pg_cron ne peut appeler une Edge Function qu via une requete HTTP sortante
-- (pg_net), et le secret partage (verifie par la fonction) est stocke dans
-- Vault plutot qu en clair dans une colonne.

create extension if not exists pg_net;

-- Le secret partage lui-meme (verifie par l Edge Function) n est PAS ecrit
-- ici : il est cree separement dans Vault via une commande ponctuelle, pour
-- ne jamais apparaitre en clair dans un fichier de migration versionne.
-- Voir vault.decrypted_secrets, name = 'cron_secret_abonnements'.

do $do$
begin
  if not exists (select 1 from cron.job where jobname = 'abonnements-cycle-quotidien') then
    perform cron.schedule(
      'abonnements-cycle-quotidien',
      '0 3 * * *', -- tous les jours a 3h du matin
      $cron$
      select net.http_post(
        url := 'https://zecyfnurrcslukxvmpca.supabase.co/functions/v1/abonnements-cycle',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret_abonnements')
        ),
        body := '{}'::jsonb
      );
      $cron$
    );
  end if;
end;
$do$;
