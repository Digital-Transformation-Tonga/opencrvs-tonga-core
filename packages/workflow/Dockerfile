ARG  BRANCH=develop
ARG  DOCKER_ORGID=opencrvs
FROM ${DOCKER_ORGID}/ocrvs-base:${BRANCH}

USER node

WORKDIR /app/packages/workflow
COPY --chown=node:node packages/workflow /app/packages/workflow
RUN yarn install --frozen-lockfile && yarn build

CMD [ "yarn", "start:prod" ]
