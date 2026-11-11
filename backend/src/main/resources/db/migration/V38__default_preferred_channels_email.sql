-- Les relances automatiques (créances impayées, tranches en retard) doivent
-- partir vers la VRAIE adresse email du contribuable : EMAIL devient un canal
-- par défaut, en plus de la boîte interne IN_APP.
--
-- Les contribuables qui ont explicitement choisi autre chose que la valeur
-- par défaut 'IN_APP' ne sont pas touchés.
ALTER TABLE taxpayers ALTER COLUMN preferred_channels SET DEFAULT 'IN_APP,EMAIL';

UPDATE taxpayers
   SET preferred_channels = 'IN_APP,EMAIL'
 WHERE preferred_channels = 'IN_APP';
