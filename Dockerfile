FROM codeberg.org/readeck/readeck:0.23.4@sha256:fc34b2e9bc766422a4265dc253d1a3e95e0608ee08e86c7e3dda8773ec906fdc AS upstream
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1
COPY --from=upstream /bin/readeck /usr/local/bin/readeck
RUN mkdir -p /usr/share/readeck && wget -q https://codeberg.org/readeck/readeck/archive/0.23.4.tar.gz -O /usr/share/readeck/corresponding-source.tar.gz && echo '9b4b418c2ed6e0528b5a6808830ee7890f401e06b04c5f9f8762af9932bab9ca  /usr/share/readeck/corresponding-source.tar.gz' | sha256sum -c -
WORKDIR /readeck
COPY LICENSE /opt/template/LICENSE
COPY runtime.sh /opt/template/runtime.sh
COPY proxy.mjs /opt/template/proxy.mjs
COPY crawler-proxy.mjs /opt/template/crawler-proxy.mjs
COPY media-authorization.mjs /opt/template/media-authorization.mjs
ENTRYPOINT ["/bin/sh", "/opt/template/runtime.sh"]
CMD []
