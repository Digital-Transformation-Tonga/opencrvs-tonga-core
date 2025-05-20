ARG  BRANCH=develop
ARG  DOCKER_ORGID=opencrvs
FROM ${DOCKER_ORGID}/ocrvs-base:${BRANCH}

USER node

WORKDIR /app/packages/data-seeder
COPY --chown=node:node packages/data-seeder/*.json /app/packages/data-seeder/
RUN yarn install --frozen-lockfile
COPY --chown=node:node packages/data-seeder /app/packages/data-seeder
ENTRYPOINT [ "yarn","seed" ]