FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="mathieu-mont.fr" \
      org.opencontainers.image.description="Site statique de Mathieu Mont" \
      org.opencontainers.image.source="https://github.com/f3f00cb0/mathieu-mont.fr"

# Config nginx
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# New site at the repo root (index.html and any files next to it).
# /old is excluded by .dockerignore and is not the live site.
COPY . /usr/share/nginx/html/
RUN rm -f /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/nginx.conf

EXPOSE 80

# Healthcheck : interroge l'endpoint /health défini dans nginx.conf
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
