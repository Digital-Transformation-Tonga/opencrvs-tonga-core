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

import { Clause } from '@opencrvs/commons/events'

export function and(clauses: Clause[]): Clause {
  return {
    type: 'and',
    clauses
  }
}

export function or(clauses: Clause[]): Clause {
  return {
    type: 'or',
    clauses
  }
}

export function field(fieldId: string) {
  return {
    fuzzyMatches: (
      options: { fuzziness?: string | number; boost?: number } = {}
    ) =>
      ({
        fieldId,
        type: 'fuzzy',
        options: {
          fuzziness: options.fuzziness ?? 'AUTO:4,7',
          boost: options.boost ?? 1
        }
      } as const),
    strictMatches: (options: { boost?: number } = {}) =>
      ({
        fieldId,
        type: 'strict',
        options: {
          boost: options.boost ?? 1
        }
      } as const),
    dateRangeMatches: (options: {
      days: number
      origin: string
      boost?: number
    }) =>
      ({
        fieldId,
        type: 'dateRange',
        options: {
          days: options.days,
          origin: options.origin,
          boost: options.boost ?? 1
        }
      } as const),
    dateDistanceMatches: (options: {
      days: number
      origin: string
      boost?: number
    }) =>
      ({
        fieldId,
        type: 'dateDistance',
        options: {
          days: options.days,
          origin: options.origin,
          boost: options.boost ?? 1
        }
      } as const)
  }
}