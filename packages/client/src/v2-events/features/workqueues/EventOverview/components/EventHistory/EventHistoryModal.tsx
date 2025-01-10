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
import React from 'react'
import { useIntl } from 'react-intl'
import format from 'date-fns/format'
import { ResponsiveModal, Stack } from '@opencrvs/components'
import { Text } from '@opencrvs/components/lib/Text'
import { ResolvedActionDocument } from '@opencrvs/commons/client'

import {
  getUsersFullName,
  HUMAN_READABLE_FULL_DATE_TIME,
  joinValues
} from '@client/v2-events/utils'

/**
 * Detailed view of single Action, showing the history of the event.
 *
 * @TODO: Add more details to the modal and ability to diff changes when more events are specified.s
 */
export function EventHistoryModal({
  history,
  close
}: {
  history: ResolvedActionDocument
  close: (result: boolean | null) => void
}) {
  const intl = useIntl()

  const name = getUsersFullName(history.createdBy.name, intl.locale)
  return (
    <ResponsiveModal
      autoHeight
      actions={[]}
      handleClose={() => close(null)}
      responsive={true}
      show={true}
      title={history.type}
      width={1024}
    >
      <Stack>
        <Text color="grey500" element="p" variant="reg19">
          {joinValues(
            [
              name,
              format(new Date(history.createdAt), HUMAN_READABLE_FULL_DATE_TIME)
            ],
            ' — '
          )}
        </Text>
      </Stack>
    </ResponsiveModal>
  )
}
