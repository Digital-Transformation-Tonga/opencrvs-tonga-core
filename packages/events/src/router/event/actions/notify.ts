/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * OpenCRVS is also distributed under the terms of the Civil Registration
 * & Healthcare Disclaimer located at http://opencrvs.org/license.
 *
 * Copyright (C) The OpenCRVS Authors located at https://github.com/opencrvs/opencrvs-core/blob/master/AUTHORS.
 */
import {
  ActionType,
  ActionStatus,
  EventDocument,
  NotifyActionInput,
  ACTION_SCOPE_MAP,
  getCurrentEventState
} from '@opencrvs/commons/events'
import * as middleware from '@events/router/middleware'
import { requiresAnyOfScopes } from '@events/router/middleware'
import { systemProcedure } from '@events/router/trpc'
import { getEventById, processAction } from '@events/service/events/events'
import {
  defaultRequestHandler,
  getDefaultActionProcedures
} from '@events/router/event/actions'
import { getInMemoryEventConfigurations } from '@events/service/config/config'
import { searchForDuplicates } from '@events/service/deduplication/deduplication'

/**
 * MoH / health notifications use NOTIFY. Unlike VALIDATE/REGISTER, duplicates
 * must not block the notification — the record should still land in the
 * Notifications workqueue, flagged as a potential duplicate.
 *
 * Deduplication config is only defined on DECLARE/VALIDATE/REGISTER actions,
 * so we reuse the DECLARE rules after accepting the NOTIFY.
 */
export function notifyActionProcedures() {
  const requireScopesMiddleware = requiresAnyOfScopes(
    [],
    ACTION_SCOPE_MAP[ActionType.NOTIFY]
  )

  const defaultProcedures = getDefaultActionProcedures(ActionType.NOTIFY)

  return {
    ...defaultProcedures,
    request: systemProcedure
      .meta({
        openapi: {
          summary: 'Notify an event',
          method: 'POST',
          path: '/events/notifications',
          tags: ['events'],
          protect: true
        }
      })
      .use(requireScopesMiddleware)
      .input(NotifyActionInput)
      .use(middleware.eventTypeAuthorization)
      .use(middleware.requireAssignment)
      .use(middleware.validateAction)
      .use(middleware.requireLocationForSystemUserAction)
      .output(EventDocument)
      .mutation(async ({ ctx, input }) => {
        const { token, user, existingAction } = ctx

        if (
          existingAction &&
          existingAction.status !== ActionStatus.Requested
        ) {
          return ctx.event
        }

        const configs = await getInMemoryEventConfigurations(token)
        const event = await getEventById(input.eventId)

        const config = configs.find((c) => c.id === event.type)

        if (!config) {
          throw new Error(
            `Event configuration not found with type: ${event.type}`
          )
        }

        const notifiedEvent = await defaultRequestHandler(
          input,
          user,
          token,
          event,
          config,
          NotifyActionInput
        )

        const dedupConfig = config.actions.find(
          (action) => action.type === ActionType.DECLARE
        )?.deduplication

        if (!dedupConfig) {
          return notifiedEvent
        }

        const notifiedEventState = getCurrentEventState(notifiedEvent, config)
        const duplicates = await searchForDuplicates(
          notifiedEventState,
          dedupConfig,
          config
        )

        const updatedEvent = await getEventById(input.eventId)

        if (duplicates.length > 0) {
          return processAction(
            {
              type: ActionType.DUPLICATE_DETECTED,
              transactionId: input.transactionId,
              eventId: input.eventId,
              declaration: {},
              annotation: {},
              keepAssignment: true,
              content: {
                duplicates: duplicates.map(({ event: { id, trackingId } }) => ({
                  id,
                  trackingId
                }))
              }
            },
            {
              event: updatedEvent,
              user,
              token,
              status: ActionStatus.Accepted,
              configuration: config
            }
          )
        }
        return notifiedEvent
      })
  }
}
