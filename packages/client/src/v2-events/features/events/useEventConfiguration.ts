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
import { trpc } from '@client/v2-events/trcp'

/**
 * Fetches configured events and finds a matching event
 * @returns a list of event configurations
 */
export function useEventConfigurations() {
  const [config] = trpc.config.get.useSuspenseQuery()
  return config
}

/**
 * Fetches configured events and finds a matching event
 * @param eventIdentifier e.g. 'birth', 'death', 'marriage' or any configured event
 * @returns event configuration
 */
export function useEventConfiguration(eventIdentifier: string) {
  const [config] = trpc.config.get.useSuspenseQuery()
  const event = config?.find((event) => event.id === eventIdentifier)

  return { event }
}