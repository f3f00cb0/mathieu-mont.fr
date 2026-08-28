# Relève

Dossier de réception pour l’entrée usine : FDS (CLP / REACH), certificat
d’analyse, bon de livraison, plaque constructeur. Un dépôt, un JSON.

Site à part, comme [Furan](https://furan.run/). Adresse prévue :
**https://releve.mathieu-mont.fr/**

La démo tourne 100 % dans le navigateur (pdf.js + Tesseract, sans CDN).
En production chez un client : S3 → Textract → Lambda, file d’exceptions.

## Local

```bash
python3 scripts/serve-local.py
# http://127.0.0.1:8081/
```

Ou Docker, depuis ce dossier :

```bash
docker compose -f docker-compose.local.yml up --build
# http://localhost:8081
```

Parsers : `node scripts/test-releve-parsers.mjs` (à la racine du dépôt).
PDF d’exemple : `python3 scripts/generate-releve-samples.py`.

## Dokploy

1. DNS : `releve.mathieu-mont.fr` en A/AAAA vers le serveur.
2. Create → Compose, **Compose Path** : `releve/docker-compose.yml`.
3. Deploy. Traefik + Let’s Encrypt comme pour mathieu-mont.fr.

Un autre nom de domaine : édite le `Host(\`…\`)` dans `docker-compose.yml`.
