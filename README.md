# mathieu-mont.fr

Site personnel statique, servi par nginx dans un conteneur, prêt pour un déploiement sur **Dokploy** auto-hébergé (Traefik + Let's Encrypt gérés par Dokploy).

## Structure

```
.
├── public/
│   ├── index.html            # accueil (sélection)
│   ├── cv/index.html         # parcours (FR)
│   ├── cv-en/index.html      # CV (EN)
│   ├── 404.html
│   ├── site.css              # styles partagés
│   └── fonts/                # Fraunces + IBM Plex Mono (.woff2, licence OFL)
├── nginx.conf                # config nginx : gzip, cache, en-têtes de sécurité, /health
├── Dockerfile                # nginx:alpine + le contenu de public/
├── docker-compose.yml        # PROD : à utiliser dans Dokploy
├── docker-compose.local.yml  # DEV  : test local sur http://localhost:8080
├── .dockerignore
├── .gitignore
└── .editorconfig
```

## Modifier le site

Les pages vivent dans `public/`. Les styles communs sont dans `public/site.css`.

- **Accueil** (`index.html`) : une carte de visite. La section « Sélection »
  contient des blocs `<a class="work">` à garder, supprimer ou dupliquer.
  L'ordre des blocs = l'ordre d'affichage.
- **Relève** (`releve/`) : démo d'extraction documentaire (FDS, COA, BL,
  plaque constructeur). Tout tourne dans le navigateur (pdf.js + Tesseract),
  sans CDN. Les PDF d'exemple se régénèrent avec
  `python3 scripts/generate-releve-samples.py`.
  Parsers : `node scripts/test-releve-parsers.mjs`.
- **Parcours** (`cv/index.html` / `cv-en/index.html`) : le CV long, dans la
  même direction visuelle. Les deux versions se tiennent à jour ensemble.

## Tester en local

Avec Docker :

```bash
docker compose -f docker-compose.local.yml up --build
# puis http://localhost:8080
```

Sans Docker, n'importe quel serveur statique fait l'affaire :

```bash
cd public && python3 -m http.server 8080
```

## Déployer sur Dokploy

Prérequis : une instance Dokploy en place, et le DNS du domaine
(`mathieu-mont.fr` + `www`) pointant en A/AAAA vers l'IP du serveur.

1. **Pousser ce dépôt** sur GitHub / GitLab (voir plus bas).
2. Dans Dokploy : **Create → Compose**.
3. Source : connecte le dépôt Git (ou colle le compose en mode "Raw").
4. **Compose Path** : `docker-compose.yml`.
5. Vérifie que le domaine dans les labels Traefik du compose correspond bien au
   tien. Sinon, édite `docker-compose.yml` (la ligne `...routers.mathieu-mont.rule`).
6. **Deploy**. Dokploy build l'image, lance le conteneur et demande le
   certificat Let's Encrypt automatiquement.

Le service se branche sur le réseau `dokploy-network` (déjà créé par Dokploy) et
expose le port 80 en interne ; Traefik s'occupe du HTTPS.

> **Domaine via l'UI Dokploy plutôt que via les labels ?**
> Possible aussi : supprime le bloc `labels:` du compose, laisse le service sur
> `dokploy-network`, puis ajoute le domaine depuis l'onglet **Domains** du
> service dans Dokploy (port 80). N'utilise pas les deux méthodes en même temps,
> elles se marcheraient dessus.

## Mettre à jour le site

Commit + push, puis **Redeploy** dans Dokploy (ou active l'auto-deploy sur push).
Le HTML et le CSS ne sont pas mis en cache dur côté nginx, la mise à jour est
donc visible immédiatement après redéploiement.

## Polices (auto-hébergées, RGPD-friendly)

Les polices Fraunces et IBM Plex Mono sont servies **localement** depuis
`public/fonts/` (fichiers `.woff2` issus de Fontsource, sous-ensemble latin qui
couvre tout le français : accents, œ, €, guillemets). Aucun appel à un CDN
externe, aucun transfert d'IP vers Google : c'est propre côté RGPD et la CSP de
`nginx.conf` interdit d'ailleurs toute source externe.

Pour changer de police : remplace les `.woff2` dans `public/fonts/`, ajuste les
règles `@font-face` dans `public/site.css`, et c'est tout.
