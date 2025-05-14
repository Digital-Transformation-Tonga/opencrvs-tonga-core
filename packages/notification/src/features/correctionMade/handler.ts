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

import { Request, ResponseToolkit } from '@hapi/hapi'
import { messageKeys } from '@notification/i18n/messages'
import {
  getRegistrationNumber,
  getTrackingId,
  RegisteredRecord
} from '@opencrvs/commons/types'
import { sendNotification } from '@notification/features/sms/utils'
import {
  getContactEmail,
  getContactPhoneNo,
  getPersonName,
  getInformantName,
  getOfficeName,
  getRegistrationLocation
} from '@notification/features/utils'

export async function birthCorrectionMadeNotification(
  req: Request,
  h: ResponseToolkit
) {
  const registeredRecord = req.payload as RegisteredRecord
  await sendNotification(
    {
      sms: messageKeys.birthCorrectionMadeNotification,
      email: messageKeys.birthCorrectionMadeNotification
    },
    {
      sms: getContactPhoneNo(registeredRecord),
      email: getContactEmail(registeredRecord)
    },
    'informant',
    {
      trackingId: getTrackingId(registeredRecord),
      crvsOffice: getOfficeName(registeredRecord),
      registrationLocation: getRegistrationLocation(registeredRecord),
      name: getPersonName(registeredRecord, 'child'),
      informantName: getInformantName(registeredRecord),
      registrationNumber: getRegistrationNumber(registeredRecord)
    }
  )

  return h.response().code(200)
}
export async function deathCorrectionMadeNotification(
  req: Request,
  h: ResponseToolkit
) {
  const registeredRecord = req.payload as RegisteredRecord
  await sendNotification(
    {
      sms: messageKeys.deathCorrectionMadeNotification,
      email: messageKeys.deathCorrectionMadeNotification
    },
    {
      sms: getContactPhoneNo(registeredRecord),
      email: getContactEmail(registeredRecord)
    },
    'informant',
    {
      trackingId: getTrackingId(registeredRecord),
      crvsOffice: getOfficeName(registeredRecord),
      registrationLocation: getRegistrationLocation(registeredRecord),
      name: getPersonName(registeredRecord, 'deceased'),
      informantName: getInformantName(registeredRecord),
      registrationNumber: getRegistrationNumber(registeredRecord)
    }
  )

  return h.response().code(200)
}
