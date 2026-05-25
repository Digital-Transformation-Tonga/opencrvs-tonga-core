ARG  BRANCH=develop
ARG  DOCKER_ORGID=opencrvs
FROM ${DOCKER_ORGID}/ocrvs-base:${BRANCH}

USER node

WORKDIR /app/packages/webhooks
COPY --chown=node:node packages/webhooks /app/packages/webhooks
RUN yarn install --frozen-lockfile && yarn build

CMD [ "yarn", "start:prod" ]
