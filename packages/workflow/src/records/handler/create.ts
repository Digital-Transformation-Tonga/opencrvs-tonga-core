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
import * as Hapi from '@hapi/hapi'
import { effect, logger, saga } from '@opencrvs/commons'
import { getAuthHeader } from '@opencrvs/commons/http'
import {
  BirthRegistration,
  buildFHIRBundle,
  Bundle,
  changeState,
  DeathRegistration,
  EVENT_TYPE,
  getComposition,
  getTaskFromSavedBundle,
  getTrackingId as getTrackingIdFromRecord,
  InProgressRecord,
  isComposition,
  isInProgress,
  isReadyForReview,
  isRejected,
  isTask,
  isValidated,
  isWaitingExternalValidation,
  MarriageRegistration,
  ReadyForReviewRecord,
  TransactionResponse,
  ValidatedRecord,
  ValidRecord,
  WaitingForValidationRecord
} from '@opencrvs/commons/types'
import { uploadBase64AttachmentsToDocumentsStore } from '@workflow/documents'
import { getTrackingId } from '@workflow/features/registration/fhir/fhir-utils'
import {
  generateTrackingIdForEvents,
  isInProgressDeclaration
} from '@workflow/features/registration/utils'
import {
  auditEventWithTransaction,
  revertAuditEvent
} from '@workflow/records/audit'
import {
  findTaskFromIdentifier,
  mergeBundles,
  revertHearthTransaction,
  sendBundleToHearth,
  toSavedBundle,
  withPractitionerDetails
} from '@workflow/records/fhir'
import {
  isNotificationEnabled,
  sendNotification
} from '@workflow/records/notification'
import {
  deleteRecordFromSearchIndex,
  indexBundle
} from '@workflow/records/search'
import {
  initiateRegistration,
  toValidated,
  toWaitingForExternalValidationState
} from '@workflow/records/state-transitions'
import { validateRequest } from '@workflow/utils'
import {
  getToken,
  hasRegisterScope,
  hasValidateScope
} from '@workflow/utils/auth-utils'
import {
  findDuplicateIds,
  updateCompositionWithDuplicateIds,
  updateTaskWithDuplicateIds
} from '@workflow/utils/duplicate-checker'
import { z } from 'zod'
import { RecordEvent } from '../record-events'

const requestSchema = z.object({
  event: z.custom<EVENT_TYPE>(),
  record: z.custom<
    BirthRegistration | DeathRegistration | MarriageRegistration
  >()
})

function findTask(bundle: Bundle) {
  const task = bundle.entry.map((e) => e.resource).find(isTask)
  if (!task) {
    throw new Error('Task not found in bundle')
  }
  return task
}

async function findExistingDeclarationIds(draftId: string) {
  const taskBundle = await findTaskFromIdentifier(draftId)
  if (taskBundle.entry.length > 0) {
    const trackingId = getTrackingId(taskBundle)
    if (!trackingId) {
      throw new Error('No trackingID found for existing declaration')
    }
    return {
      compositionId: taskBundle.entry[0].resource.focus.reference.split('/')[1],
      trackingId
    }
  }
  return null
}

function createInProgressOrReadyForReviewTask(
  previousTask: ReturnType<typeof findTask>,
  event: EVENT_TYPE,
  trackingId: Awaited<ReturnType<typeof generateTrackingIdForEvents>>,
  inProgress: boolean
): ReturnType<typeof findTask> {
  return {
    ...previousTask,
    identifier: [
      ...previousTask.identifier,
      {
        system: `http://opencrvs.org/specs/id/${
          event.toLowerCase() as Lowercase<EVENT_TYPE>
        }-tracking-id`,
        value: trackingId
      }
    ],
    code: {
      coding: [
        {
          system: `http://opencrvs.org/specs/types`,
          code: event
        }
      ]
    },
    businessStatus: {
      coding: [
        {
          system: `http://opencrvs.org/specs/reg-status`,
          code: inProgress ? 'IN_PROGRESS' : 'DECLARED'
        }
      ]
    }
  }
}

async function createRecord(
  recordDetails: z.TypeOf<typeof requestSchema>['record'],
  event: z.TypeOf<typeof requestSchema>['event'],
  token: string,
  duplicateIds: Array<{ id: string; trackingId: string }>
): Promise<[InProgressRecord | ReadyForReviewRecord, TransactionResponse]> {
  const inputBundle = buildFHIRBundle(recordDetails, event)
  const trackingId = await generateTrackingIdForEvents(
    event,
    inputBundle,
    token
  )
  const composition = getComposition(inputBundle)
  const inProgress = isInProgressDeclaration(inputBundle)

  composition.identifier = {
    system: 'urn:ietf:rfc:3986',
    value: trackingId
  }

  const task = createInProgressOrReadyForReviewTask(
    findTask(inputBundle),
    event,
    trackingId,
    inProgress
  )

  const [taskWithLocation, practitionerResourcesBundle] =
    await withPractitionerDetails(task, token)

  inputBundle.entry = inputBundle.entry.map((e) => {
    if (isComposition(e.resource) && duplicateIds.length > 0) {
      logger.info(
        `Workflow/service:createRecord: ${duplicateIds.length} duplicate composition(s) found`
      )
      return {
        ...e,
        resource: updateCompositionWithDuplicateIds(e.resource, duplicateIds)
      }
    }
    if (e.resource.resourceType !== 'Task') {
      return e
    }
    return {
      ...e,
      resource: taskWithLocation
    }
  })

  const responseBundle = await sendBundleToHearth(inputBundle)
  const savedBundle = toSavedBundle(inputBundle, responseBundle)
  const record = inProgress
    ? changeState(savedBundle, 'IN_PROGRESS')
    : changeState(savedBundle, 'READY_FOR_REVIEW')

  return [mergeBundles(record, practitionerResourcesBundle), responseBundle]
}

type CreatedRecord =
  | InProgressRecord
  | ReadyForReviewRecord
  | ValidatedRecord
  | WaitingForValidationRecord

function getEventAction(record: CreatedRecord) {
  if (isInProgress(record)) {
    return 'sent-notification'
  }
  if (isReadyForReview(record)) {
    return 'sent-notification-for-review'
  }
  if (isValidated(record)) {
    return 'sent-for-approval'
  }
  if (isWaitingExternalValidation(record)) {
    return 'waiting-external-validation'
  }
  // type assertion
  record satisfies never
  // this should never be reached
  return 'sent-notification'
}

export function createAuditEffect(
  event: RecordEvent,
  bundle: ValidRecord,
  token: string,
  transactionId: string
) {
  return effect(
    () => auditEventWithTransaction(event, bundle, token, transactionId),
    () => revertAuditEvent(token, transactionId),
    `audit event: ${event}`
  )
}

export default async function createRecordHandler(
  request: Hapi.Request,
  _: Hapi.ResponseToolkit
) {
  const token = getToken(request)
  const transactionId = request.headers['x-correlation-id']

  const { record: recordDetails, event } = validateRequest(
    requestSchema,
    request.payload
  )

  const existingDeclarationIds =
    recordDetails.registration?.draftId &&
    (await findExistingDeclarationIds(recordDetails.registration.draftId))
  if (existingDeclarationIds) {
    return {
      ...existingDeclarationIds,
      isPotentiallyDuplicate: false
    }
  }
  const duplicateIds = await findDuplicateIds(
    recordDetails,
    { Authorization: token },
    event
  )
  const recordInputWithUploadedAttachments =
    await uploadBase64AttachmentsToDocumentsStore(
      recordDetails,
      getAuthHeader(request)
    )

  return saga(async (run) => {
    const [newRecord]: [CreatedRecord, TransactionResponse] = await run(
      effect(
        () =>
          createRecord(
            recordInputWithUploadedAttachments,
            event,
            token,
            duplicateIds
          ),
        ([_, transaction]) => revertHearthTransaction(transaction),
        'create record'
      )
    )

    await run(
      createAuditEffect(
        isInProgress(newRecord)
          ? 'sent-notification'
          : 'sent-notification-for-review',
        newRecord,
        token,
        transactionId
      )
    )
    let record: CreatedRecord = newRecord

    if (duplicateIds.length) {
      await run(
        effect(
          () => indexBundle(record, token),
          () => deleteRecordFromSearchIndex(record, token),
          'index record'
        )
      )

      const task = updateTaskWithDuplicateIds(
        getTaskFromSavedBundle(record),
        duplicateIds
      )

      await run(
        effect(
          () => sendBundleToHearth({ ...record, entry: [{ resource: task }] }),
          (transaction) => revertHearthTransaction(transaction),
          'update task with duplicate ids'
        )
      )

      return {
        compositionId: getComposition(record).id,
        trackingId: getTrackingIdFromRecord(record),
        isPotentiallyDuplicate: true
      }
    }

    if (hasValidateScope(request)) {
      /*
       * Record is being validated
       */
      record = await toValidated(record, token)
      await run(
        createAuditEffect('sent-for-approval', record, token, transactionId)
      )
    } else if (hasRegisterScope(request) && !isInProgress(record)) {
      /*
       * Record is being registered
       */
      record = await toWaitingForExternalValidationState(record, token)
      await run(
        createAuditEffect(
          'waiting-external-validation',
          record,
          token,
          transactionId
        )
      )
    }
    const eventAction = getEventAction(record)

    await run(
      effect(
        () => indexBundle(record, token),
        () => deleteRecordFromSearchIndex(record, token),
        'index record'
      )
    )

    /*
     * We need to initiate registration for a
     * record in waiting validation state
     */
    if (isWaitingExternalValidation(record)) {
      const rejectedOrWaitingValidationRecord = await initiateRegistration(
        record,
        request.headers,
        token
      )

      if (isRejected(rejectedOrWaitingValidationRecord)) {
        await run(
          effect(
            () => indexBundle(rejectedOrWaitingValidationRecord, token),
            () =>
              deleteRecordFromSearchIndex(
                rejectedOrWaitingValidationRecord,
                token
              ),
            'index record'
          )
        )
        await run(
          createAuditEffect('sent-for-updates', record, token, transactionId)
        )
      }
    } else {
      // Notification not implemented for marriage yet
      const notificationDisabled =
        eventAction === 'waiting-external-validation' ||
        !(await isNotificationEnabled(eventAction, event, token))

      if (!notificationDisabled) {
        await run(
          effect(
            () => sendNotification(eventAction, record, token),
            () => Promise.resolve(),
            'send notification'
          )
        )
      }
    }

    return {
      compositionId: getComposition(record).id,
      trackingId: getTrackingIdFromRecord(record),
      isPotentiallyDuplicate: false
    }
  })
}
