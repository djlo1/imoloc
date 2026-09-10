-- Bug trouve en testant la liste de villes : le moteur pays a ete seede
-- avec 'Benin' (sans accent) depuis la Phase 0, mais la vraie valeur
-- stockee dans agences.pays est 'Bénin' (avec accent). Consequence :
-- tous les schemas specifiques au Benin (adresse, cadastre, fiscalite)
-- etaient invisibles depuis le debut, l'app retombait silencieusement
-- sur le schema generique sans que ca se voie.
update country_field_schemas set pays = 'Bénin' where pays = 'Benin';
update villes                set pays = 'Bénin' where pays = 'Benin';
update agence_pays_actifs    set pays = 'Bénin' where pays = 'Benin';
