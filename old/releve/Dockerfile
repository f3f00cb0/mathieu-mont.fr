FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="Relève" \
      org.opencontainers.image.description="Dossier de réception : FDS, COA, BL, plaque constructeur" \
      org.opencontainers.image.source="https://github.com/f3f00cb0/mathieu-mont.fr"

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
