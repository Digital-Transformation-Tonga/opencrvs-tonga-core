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

import { errorMessages } from '@opencrvs/commons/events'
import { getInvalidUpdateKeys, isMigratedRecord } from './utils'

describe('isMigratedRecord()', () => {
  it('returns true only for the stored migration flag value', () => {
    expect(isMigratedRecord({ 'legacyInfo.isMigrated': 'true' })).toBe(true)
    expect(isMigratedRecord({ 'legacyInfo.isMigrated': 'false' })).toBe(false)
    expect(isMigratedRecord({})).toBe(false)
  })
})

describe('getInvalidUpdateKeys()', () => {
  it('flags keys present in update but missing from cleaned', () => {
    const errors = getInvalidUpdateKeys({
      update: {
        'deceased.dob': '1995-01-26',
        'deceased.age': 30
      },
      cleaned: {
        'deceased.age': 30
      }
    })

    expect(errors).toEqual([
      {
        message: errorMessages.hiddenField.defaultMessage,
        id: 'deceased.dob',
        value: '1995-01-26'
      }
    ])
  })

  it('allows hidden keys when the migrated-record correction exception is enabled', () => {
    const errors = getInvalidUpdateKeys({
      update: {
        'deceased.dob': '1995-01-26',
        'deceased.dobUnknown': true,
        'deceased.age': 30,
        'marriageDetails.church': 'FREE WESLEYAN CHURCH',
        'marriageDetails.minister': 'ROGER C.G PAGE'
      },
      cleaned: {
        'deceased.dobUnknown': true,
        'deceased.age': 30
      },
      allowHiddenFieldValues: true
    })

    expect(errors).toEqual([])
  })

  it('still flags hidden keys when allowHiddenFieldValues is false', () => {
    const errors = getInvalidUpdateKeys({
      update: {
        'marriageDetails.church': 'FREE WESLEYAN CHURCH'
      },
      cleaned: {},
      allowHiddenFieldValues: false
    })

    expect(errors).toEqual([
      {
        message: errorMessages.hiddenField.defaultMessage,
        id: 'marriageDetails.church',
        value: 'FREE WESLEYAN CHURCH'
      }
    ])
  })
})
