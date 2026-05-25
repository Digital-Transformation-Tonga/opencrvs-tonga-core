ARG  BRANCH=develop
ARG  DOCKER_ORGID=opencrvs
FROM ${DOCKER_ORGID}/ocrvs-base:${BRANCH}

USER node

WORKDIR /app/packages/notification
COPY --chown=node:node packages/notification /app/packages/notification
RUN yarn install --frozen-lockfile && yarn build

CMD [ "yarn", "start:prod" ]
