# Audit — schéma réel vs architecture validée (Diagnostic imoloc, onglet Architecture)

Date: 2026-09-13. Lecture seule, aucune modification de code/DB. Source: `supabase db query --linked` (projet zecyfnurrcslukxvmpca) + grep/lecture du code réel dans `/home/djlo/Documents/imoloc`.

## Méthode
1. Colonnes réelles de chaque table (information_schema.columns)
2. Row counts réels
3. FK constraints
4. RLS policies (pg_policies)
5. Grep `from('table')` dans src/ et supabase/functions/ pour savoir si une table est lue/écrite pour de vrai, ou juste déclarée
6. Lecture des fichiers clés : AddUserModal.jsx, AddTeamModal.jsx, Utilisateurs.jsx, Loci.jsx, ResetPasswordPanel.jsx, Securite.jsx

## Colonnes réelles (extrait complet)

Voir capture brute dans la conversation — résumé par table ci-dessous dans les verdicts.

## Row counts réels (production)

| table | n |
|---|---|
| appareils_utilisateurs | 0 |
| champs_personnalises | 0 |
| connexions_bloquees | 0 |
| contacts | 0 |
| country_field_schemas | 21 |
| driveloc_fichiers | 0 |
| driveloc_stats | 0 |
| equipe_membres | 0 |
| equipes | 0 |
| historique | 1 |
| historique_recherches | 0 |
| invitations | 5 |
| licences | 4 |
| licences_utilisateurs | 0 |
| mfa_configs | 0 |
| notifications | 8 |
| nouveautes | 4 |
| nouveautes_vues | 4 |
| opportunites_vente | 0 |
| parametres_organisation | 2 |
| parametres_utilisateur | 0 |
| pawapay_transactions | 4 |
| prestataires | 1 |
| signatures | 5 |
| utilisateurs_invites | 0 |

## RLS — trouvailles critiques

**Policies `qual = true` (ouvertes à TOUT utilisateur authentifié, tous tenants confondus)** — même classe de bug que A8 (déjà corrigé pour baux/paiements/plaintes), jamais réauditée ailleurs jusqu'ici :
- `prestataires` (`authenticated_all_prestataires`) — table tenant réelle (agence_id NOT NULL), noms/téléphones/emails de prestataires exposés cross-tenant.
- `champs_personnalises` (`champs_personnalises_all_authenticated`) — tenant réelle.
- `historique` (`authenticated_all_historique`) — tenant réelle, **c'est le journal d'audit** — n'importe qui peut le lire ET l'écrire/l'altérer.
- `opportunites_vente` (`authenticated_all_opportunites_vente`) — tenant réelle (via bien_id).
- `parametres_organisation` (`auth_params_org`) — tenant réelle, contient `politique_mdp_longueur`/`politique_session_duree` (paramètres de sécurité !) modifiables par n'importe qui.
- `country_field_schemas` — `qual=true` mais table SANS agence_id (référentiel pays partagé) → pas un problème, lecture globale légitime ; l'écriture ouverte reste à resserrer mais moins urgent.

**Pattern B4 (déjà connu, mais généralisé ici à 9 tables)** : `is_my_agence(agence_id)` ne matche que `agences.profile_id = auth.uid()` — **le propriétaire du compte agence, jamais un membre d'équipe** (agence_users). Un collaborateur non-propriétaire obtient 0 ligne sur : `equipes`, `equipe_membres`, `invitations`, `licences`, `licences_utilisateurs`, `utilisateurs_invites`, `contacts`, `driveloc_fichiers`, `driveloc_stats`, `appareils_utilisateurs`, `pawapay_transactions`. `signatures` fait ça correctement (inclut `agence_users`) — modèle à copier partout ailleurs.

## Le triple doublon "licences"

1. `licences` (catalogue, scope par agence) + `licences_utilisateurs` (assignation) — **relationnel, propre, mais jamais alimenté par le flux réel d'onboarding**. Contient pourtant 4 lignes seed cohérentes : Imoloc Pro (25000), Imoloc Standard (10000), Loci IA (5000), Imoloc Lecteur (2000) — un embryon quasi identique à notre `types_licence` (domaine D), juste scopé par agence au lieu d'être un catalogue plateforme.
2. `invitations.licences` / `invitations.apps` (jsonb, tableaux de chaînes libres : `gestion_biens`, `gestion_locataires`, `paiements`) — choisi dans `AddUserModal.jsx`, **aucune FK vers `licences`**.
3. `agence_users.licences` (jsonb, trouvé lors du diagnostic B3) — présumé synchronisé depuis `invitations.licences` à l'acceptation, jamais vérifié.

Trois représentations différentes de "quelle licence a cet utilisateur", aucune ne parle aux deux autres.

## Le triple rôle

- `profiles.role` — valeurs de routage (`proprietaire`,`locataire`,`super_admin`) **+** valeurs RBAC dupliquées (`global_admin`,`user_admin`,`billing_admin`,`security_admin`,`password_admin`,`agent`,`comptable`,`lecteur`). Lu par `App.jsx` (PrivateRoute), `is_super_admin()`, `is_agence()` (morte, jamais utilisée en policy).
- `agence_users.role` — même liste RBAC, mais par relation utilisateur↔agence (le bon niveau, celui que le domaine E formalise en `agence_users_roles`).
- `equipe_membres.role` — 'membre' par défaut, un TROISIÈME axe (rôle dans l'équipe : propriétaire d'équipe vs membre), jamais discuté dans l'architecture, jamais lu dans le code au-delà de l'insert initial (`AddTeamModal.jsx` insère le créateur avec un rôle et les invités avec un autre — pas de lecture différenciée trouvée ensuite).

## Fichiers lus pour confirmer les usages réels
`src/pages/agence/pages/Utilisateurs.jsx` (appareils, connexions_bloquees, driveloc, licences_utilisateurs, utilisateurs_invites — tout en lecture, sauf connexions_bloquees et utilisateurs_invites qui ont un vrai insert/update/delete), `src/pages/agence/components/AddUserModal.jsx` (écrit `invitations` avec licences/apps en jsonb libre), `src/pages/agence/components/AddTeamModal.jsx` (écrit `equipes`+`equipe_membres`), `src/pages/agence/pages/Loci.jsx` (lit équipes+invitations pour donner du contexte à l'assistant IA — Loci AI existe donc déjà partiellement, pas un stub complet contrairement à ce que dit le diagnostic B10 pour la route `/loci/chat` — nuance : B10 visait une route stub, Loci.jsx dashboard-side semble avoir une vraie logique de stats+contexte), `src/pages/agence/pages/Securite.jsx` (91 lignes, **aucun appel Supabase** — confirme que la sécurité (MFA, policies mdp/session) est un pur habillage, cohérent avec ce que dit l'architecture).
