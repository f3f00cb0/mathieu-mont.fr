# mathieu-mont.fr

The previous site now lives in [`/old`](old/).

Coolify deploys this repository with `docker compose -f ./docker-compose.yml up -d --build`. The image serves `index.html` and the other files at the repository root. `/old` is not part of the image.
