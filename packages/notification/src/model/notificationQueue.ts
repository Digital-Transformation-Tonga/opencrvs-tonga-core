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
import { model, Schema } from 'mongoose'

const errorSchema = {
  statusCode: { type: Number },
  message: { type: String, required: true },
  error: { type: String }
}
const notificationQueueSchema = new Schema({
  subject: { type: String, required: true },
  body: { type: String, required: true },
  bcc: { type: [String], required: true },
  status: {
    type: String,
    enum: ['success', 'failed']
  },
  createdAt: { type: Number, default: Date.now },
  error: { type: errorSchema }
})

export default model('NotificationQueue', notificationQueueSchema)