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

import * as React from 'react'
import { useIntl } from 'react-intl'
import { FullDocumentPath, joinUrlPaths } from '@opencrvs/commons/client'
import { getToken } from '@client/utils/authUtils'
import { precacheFile } from '@client/v2-events/features/files/useFileUpload'

async function loadPdfJs() {
  if (!('document' in globalThis)) {
    return
  }

  const pdfjsLib: typeof import('pdfjs-dist') | null = await import(
    'pdfjs-dist'
  )
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'

  return pdfjsLib
}

const pdfLoadErrorMessage = {
  id: 'error.pdf',
  defaultMessage: 'Failed to load PDF',
  description: 'PDF loading error message'
}

function clearRenderedCanvases(
  container: HTMLDivElement | null,
  canvases: HTMLCanvasElement[]
) {
  canvases.forEach((canvas) => {
    if (container?.contains(canvas)) {
      container.removeChild(canvas)
    }
  })
  canvases.length = 0
}

async function fetchPdfArrayBuffer(pdfUrl: string): Promise<ArrayBuffer> {
  // Prefer cached/unsigned MinIO URL (same path images use).
  const direct = await fetch(pdfUrl)
  if (direct.ok) {
    return direct.arrayBuffer()
  }

  // Cache miss / AccessDenied: download via same-origin proxy, then retry.
  const path = decodeURIComponent(new URL(pdfUrl).pathname) as FullDocumentPath
  await precacheFile(path)

  const cached = await fetch(pdfUrl)
  if (cached.ok) {
    return cached.arrayBuffer()
  }

  const proxied = await fetch(joinUrlPaths('/api/content', path), {
    headers: { Authorization: `Bearer ${getToken()}` }
  })
  if (!proxied.ok) {
    throw new Error(
      `Failed to fetch PDF: ${proxied.status} ${proxied.statusText}`
    )
  }
  return proxied.arrayBuffer()
}

/* Hook to fetch and render PDF */
export function usePreviewPdf(pdfUrl: string) {
  const i18n = useIntl()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const hasBeenCancelled = () => cancelled
    const canvases: HTMLCanvasElement[] = []
    const container = containerRef.current

    async function loadPdf() {
      setLoading(true)
      setError(null)
      clearRenderedCanvases(container, canvases)

      const arrayBuffer = await fetchPdfArrayBuffer(pdfUrl)
      if (hasBeenCancelled()) {
        return
      }

      const pdfjsLib = await loadPdfJs()
      if (!pdfjsLib) {
        setError(i18n.formatMessage(pdfLoadErrorMessage))
        setLoading(false)
        throw new Error(`Failed to load pdfjsLib`)
      }

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      if (hasBeenCancelled()) {
        return
      }

      if (!container) {
        return
      }

      clearRenderedCanvases(container, canvases)

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (hasBeenCancelled()) {
          return
        }

        const page = await pdf.getPage(pageNum)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) {
          continue
        }

        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.display = 'block'
        canvas.style.margin = '0 auto 16px'

        container.appendChild(canvas)
        canvases.push(canvas)

        page.render({ canvasContext: context, viewport, canvas })
      }

      setLoading(false)
    }

    loadPdf().catch((err) => {
      if (!hasBeenCancelled()) {
        // eslint-disable-next-line no-console
        console.error(err)
        setError(i18n.formatMessage(pdfLoadErrorMessage))
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
      clearRenderedCanvases(container, canvases)
    }
  }, [pdfUrl, i18n])

  return { containerRef, loading, error }
}
