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
import { ValidRecord } from '@opencrvs/commons/types'
import { METRICS_URL } from '@workflow/constants'
import { getEventType } from '@workflow/features/registration/utils'
import fetch from 'node-fetch'
import { RecordEvent } from './record-events'

export async function revertAuditEvent(
  authToken: string,
  transactionId: string
) {
  const res = await fetch(
    new URL(`/audit/events/${transactionId}`, METRICS_URL).href,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      }
    }
  )
  if (!res.ok) {
    throw new Error(
      `Deleting audit events for transaction id ${transactionId} failed failed with [${
        res.status
      }] body: ${await res.text()}`
    )
  }
  return res
}
export async function auditEvent(
  action: RecordEvent,
  bundle: ValidRecord,
  authToken: string
) {
  const eventType = getEventType(bundle).toLowerCase()
  const res = await fetch(
    new URL(`/events/${eventType}/${action}`, METRICS_URL).href,
    {
      method: 'POST',
      body: JSON.stringify(bundle),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      }
    }
  )
  if (!res.ok) {
    throw new Error(
      `Writing an audit event to metrics failed with [${
        res.status
      }] body: ${await res.text()}`
    )
  }
  return res
}

export async function auditEventWithTransaction(
  action: RecordEvent,
  bundle: ValidRecord,
  authToken: string,
  transactionId: string
) {
  const eventType = getEventType(bundle).toLowerCase()
  const res = await fetch(
    new URL(`/events/${eventType}/${action}`, METRICS_URL).href,
    {
      method: 'POST',
      body: JSON.stringify(bundle),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'x-correlation-id': transactionId
      }
    }
  )
  if (!res.ok) {
    throw new Error(
      `Writing an audit event to metrics failed with [${
        res.status
      }] body: ${await res.text()}`
    )
  }
  return res
}

export async function createNewAuditEvent(
  bundle: ValidRecord,
  authToken: string
) {
  const eventType = getEventType(bundle).toLowerCase()

  const res = await fetch(
    new URL(`/events/${eventType}/request-correction`, METRICS_URL).href,
    {
      method: 'POST',
      body: JSON.stringify(bundle),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      }
    }
  )
  if (!res.ok) {
    throw new Error(
      `Writing an audit event to metrics failed with [${
        res.status
      }] body: ${await res.text()}`
    )
  }

  return res
}
