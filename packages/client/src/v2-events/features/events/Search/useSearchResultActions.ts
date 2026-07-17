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
import { WorkqueueActionsWithDefault } from '@opencrvs/commons/client'
import { useCountryConfigWorkqueueConfigurations } from '../useCountryConfigWorkqueueConfigurations'

const SEARCH_ACTIONS_WORKQUEUE_SLUGS = ['recent', 'assigned-to-you'] as const

/**
 * Table row actions for search results, aligned with configurable workqueues.
 */
export function useSearchResultActions(): WorkqueueActionsWithDefault[] {
  const workqueues = useCountryConfigWorkqueueConfigurations()
  const workqueue = SEARCH_ACTIONS_WORKQUEUE_SLUGS.map((slug) =>
    workqueues.find((w) => w.slug === slug)
  ).find(Boolean)

  return workqueue?.actions.map(({ type }) => type) ?? []
}
