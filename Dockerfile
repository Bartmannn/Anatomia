# Statyczna strona atlasu serwowana przez nginx.
# Budowanie i uruchomienie:  docker build -t anatomia .  &&  docker run --rm -p 8080:80 anatomia
# Do pracy nad poprawkami wygodniej użyć:  docker compose up   (zmiany w plikach widać od razu)
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
EXPOSE 80
