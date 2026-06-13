import test from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'

import { QuickCaptureWindow } from './QuickCaptureWindow'

test('quick capture window renders a close control for the native window shell', () => {
  const markup = renderToStaticMarkup(<QuickCaptureWindow />)

  assert.match(markup, /aria-label="Close quick capture"/)
})
