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
import { createTestClient } from '@events/tests/utils'
import { payloadGenerator } from '@events/tests/generators'

const client = createTestClient()
const generator = payloadGenerator()

test('Returns 404 when not found', async () => {
  await expect(
    client.event.get('id-not-persisted')
  ).rejects.toThrowErrorMatchingSnapshot()
})

test('Returns event', async () => {
  const event = await client.event.create(generator.event.create())

  const fetchedEvent = await client.event.get(event.id)

  expect(fetchedEvent).toEqual(event)
})