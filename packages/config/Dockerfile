ARG  BRANCH=develop
ARG  DOCKER_ORGID=opencrvs
FROM ${DOCKER_ORGID}/ocrvs-base:${BRANCH}

USER node

WORKDIR /app/packages/config
COPY --chown=node:node packages/config/*.json /app/packages/config/
RUN yarn install --frozen-lockfile
COPY --chown=node:node packages/config /app/packages/config
RUN yarn build

CMD [ "yarn", "start" ]
