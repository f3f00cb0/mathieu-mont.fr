# mathieu-mont.fr

Site personnel statique, servi par nginx dans un conteneur, prêt pour un déploiement sur **Dokploy** auto-hébergé (Traefik + Let's Encrypt gérés par Dokploy).

## Structure

```
.
├── public/
│   └── index.html            # le site (à éditer librement)
├── nginx.conf                # config nginx : gzip, cache, en-têtes de sécurité, /health
├── Dockerfile                # nginx:alpine + le contenu de public/
├── docker-compose.yml        # PROD : à utiliser dans Dokploy
├── docker-compose.local.yml  # DEV  : test local sur http://localhost:8080
├── .dockerignore
├── .gitignore
└── .editorconfig
```

## Modifier le site

Tout se passe dans `public/index.html`. La section « Sélection » contient des
blocs `<a class="work">` à garder, supprimer ou dupliquer selon ce que tu veux
mettre en avant. L'ordre des blocs = l'ordre d'affichage.

Pense à remplacer l'adresse mail placeholder `bonjour@mathieu-mont.fr` et les
trois liens du bas.

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
Le HTML n'est pas mis en cache dur côté nginx, la mise à jour est donc visible
immédiatement après redéploiement.

## Note RGPD sur les polices

`index.html` charge actuellement Fraunces et IBM Plex Mono depuis Google Fonts
(CDN). En France, servir Google Fonts depuis leur CDN est juridiquement discuté
(transfert d'IP vers Google). Pour être tranquille en prod, tu peux héberger les
polices toi-même : télécharge les `.woff2`, place-les dans `public/fonts/`,
remplace le `<link>` Google par un `@font-face` local, et ajuste la directive
`font-src` de la CSP dans `nginx.conf`.
