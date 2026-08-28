# mathieu-mont.fr

Site personnel statique, servi par nginx dans un conteneur, prêt pour un déploiement sur **Dokploy** auto-hébergé (Traefik + Let's Encrypt gérés par Dokploy).

## Structure

```
.
├── public/                   # mathieu-mont.fr
│   ├── index.html
│   ├── cv/ · cv-en/
│   ├── furan/index.html      # note de projet Furan
│   └── fonts/
├── releve/                   # releve.mathieu-mont.fr (side project)
│   ├── public/
│   ├── nginx.conf
│   ├── Dockerfile
│   └── docker-compose.yml
├── nginx.conf
├── Dockerfile
└── docker-compose.yml        # PROD Dokploy : portfolio
```

## Modifier le site

Les pages vivent dans `public/`. Les styles communs sont dans `public/site.css`.

- **Accueil** (`index.html`) : une carte de visite. La section « Sélection »
  contient des blocs `<a class="work">` à garder, supprimer ou dupliquer.
  L'ordre des blocs = l'ordre d'affichage.
- **Relève** (`releve/`) : side project à part, comme Furan. Adresse
  `https://releve.mathieu-mont.fr/` (DNS A/AAAA `releve` vers le serveur).
  Le portfolio ne fait que pointer dessus. Détail : `releve/README.md`.
- **Parcours** (`cv/index.html` / `cv-en/index.html`) : le CV long, dans la
  même direction visuelle. Les deux versions se tiennent à jour ensemble.
- **Furan** (`furan/index.html`) : le texte du projet. Le lien vers l'app
  (`furan.run`) est sur cette page, pas sur l'accueil.

## Tester en local

Avec Docker :

```bash
docker compose -f docker-compose.local.yml up --build
# portfolio : http://localhost:8080
# Relève    : http://localhost:8081
```

Sans Docker, n'importe quel serveur statique fait l'affaire :

```bash
cd public && python3 -m http.server 8080
```

Pour Relève seul, avec les en-têtes CSP/caméra :

```bash
python3 scripts/serve-local.py
# http://127.0.0.1:8081/
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

## Relève (deuxième compose Dokploy)

Même serveur, autre hostname — comme Furan. DNS : `releve.mathieu-mont.fr`
en A/AAAA vers l’IP. Puis **Create → Compose**, Compose Path :
`releve/docker-compose.yml`. Détail dans `releve/README.md`.

Un nom à toi (`releve.run`, etc.) : change le `Host` dans
`releve/docker-compose.yml` et le canonical dans `releve/public/index.html`.

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
