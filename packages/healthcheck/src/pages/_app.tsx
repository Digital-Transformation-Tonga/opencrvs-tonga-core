/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * OpenCRVS is also distributed under the terms of the Civil Registration
 * & Healthcare Disclaimer located at http://opencrvs.org/license.
 *
 * Copyright (C) The OpenCRVS Authors. OpenCRVS and the OpenCRVS
 * graphic logo are (registered/a) trademark(s) of Plan International.
 */
import type { AppProps } from 'next/app'
import { GlobalStyle } from '@/components/GlobalStyle'
import { ThemeProvider } from 'styled-components'
import { getTheme } from '@opencrvs/components/lib/theme'
import React from 'react'
import Layout from '../components/Layout'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider theme={getTheme()}>
      <Layout>
        <GlobalStyle />
        <Component {...pageProps} />
      </Layout>
    </ThemeProvider>
  )
}
