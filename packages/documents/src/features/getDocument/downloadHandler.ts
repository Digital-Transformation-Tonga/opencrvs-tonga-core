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

import { minioClient } from '@documents/minio/client'
import { MINIO_BUCKET } from '@documents/minio/constants'
import * as Hapi from '@hapi/hapi'
import { FullDocumentPath, toDocumentPath } from '@opencrvs/commons'

/**
 * Streams a MinIO object through the documents service so the browser can
 * fetch it same-origin (avoids MinIO CORS issues with PDF fetch()).
 */
export async function downloadDocumentHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const filePath = FullDocumentPath.parse(request.params.filePath)
  const documentPath = toDocumentPath(filePath)

  try {
    const stat = await minioClient.statObject(MINIO_BUCKET, documentPath)
    const stream = await minioClient.getObject(MINIO_BUCKET, documentPath)

    return h
      .response(stream)
      .type(stat.metaData?.['content-type'] || 'application/octet-stream')
      .header('Cache-Control', 'private, max-age=3600')
  } catch (error: any) {
    if (error?.code === 'NotFound' || error?.code === 'NoSuchKey') {
      return h
        .response(
          `request failed: document ${documentPath} does not exist in bucket ${MINIO_BUCKET}`
        )
        .code(404)
    }
    throw error
  }
}
