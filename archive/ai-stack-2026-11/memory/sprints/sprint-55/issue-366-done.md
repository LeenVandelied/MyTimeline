RETOUR :
- commits: (voir git log, commit créé après ce fichier)
- resume: ajout bloc `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` dans `.env.example`
  (racine), inséré après `EXPORT_TOKEN_SECRET` (même ordre que
  `backend/src/main/resources/application.properties.example`). Placeholder manifestement faux
  (`xkeysib-REMPLACER-PAR-VOTRE-CLE`). Seul fichier touché : `.env.example`.
- verif:
  - [x] `grep -n BREVO .env.example` retourne 3 lignes (clé + sender email + sender name)
  - [x] valeur manifestement placeholder (`xkeysib-REMPLACER-PAR-VOTRE-CLE`, jamais une clé réelle)
  - [x] commentaire dit explicitement : vide = NO-OP SILENCIEUX (juste un warning log), le flux
        « mot de passe oublié » répond 200 mais aucun email ne part
  - [x] bloc respecte le format des autres blocs (`# --- Titre (#issue) ---` + commentaires FR +
        `NOM_VARIABLE=valeur`)
- [MEMORY:*] signaux: aucun
- recommandations suite: RECOMMAND_FOLLOWUP : `docker-compose.yml` ne propage pas encore
  BREVO_API_KEY/BREVO_SENDER_EMAIL/BREVO_SENDER_NAME au service backend — renseigner ces variables
  dans `.env.example` seul ne les active pas sous `docker compose up`. Signalé, non traité ici
  (fichier réservé à l'agent #376 en parallèle). Mentionné dans le commentaire du bloc ajouté.
STATUS: COMPLETED
