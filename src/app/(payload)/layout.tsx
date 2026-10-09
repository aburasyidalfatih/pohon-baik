/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from '@payload-config'
import '@payloadcms/next/css'
import type { ServerFunctionClient } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'

import { importMap } from './admin/importMap.js'
import './custom.scss'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Args) => (
  <RootLayout
    config={config}
    htmlProps={{ suppressHydrationWarning: true }}
    importMap={importMap}
    serverFunction={serverFunction}
  >
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              // 1. Hook Element.prototype untuk bis_skin_checked agar tidak mengotori DOM attributes
              var origSet = Element.prototype.setAttribute;
              var origGet = Element.prototype.getAttribute;
              var origHas = Element.prototype.hasAttribute;

              Element.prototype.setAttribute = function(name, value) {
                if (name === 'bis_skin_checked') {
                  this.__bis_skin_checked = value || '1';
                  return;
                }
                return origSet.apply(this, arguments);
              };

              Element.prototype.getAttribute = function(name) {
                if (name === 'bis_skin_checked') {
                  return this.__bis_skin_checked !== undefined ? this.__bis_skin_checked : null;
                }
                return origGet.apply(this, arguments);
              };

              Element.prototype.hasAttribute = function(name) {
                if (name === 'bis_skin_checked') {
                  return this.__bis_skin_checked !== undefined;
                }
                return origHas.apply(this, arguments);
              };

              // 2. Cegah error dari ekstensi browser agar tidak memicu Next.js Dev Overlay
              window.addEventListener('error', function(e) {
                var src = (e.filename || '') + ' ' + ((e.error && e.error.stack) || '') + ' ' + (e.message || '');
                if (
                  src.indexOf('chrome-extension://') !== -1 ||
                  src.indexOf('moz-extension://') !== -1 ||
                  src.indexOf('M_ID') !== -1 ||
                  src.indexOf('bis_') !== -1 ||
                  src.indexOf('eppiocemhmnlbhjplcgkofciiegomcon') !== -1
                ) {
                  e.stopImmediatePropagation();
                  e.preventDefault();
                  return true;
                }
              }, true);

              window.addEventListener('unhandledrejection', function(e) {
                var reason = e.reason;
                var str = ((reason && reason.stack) || '') + ' ' + ((reason && reason.message) || String(reason || ''));
                if (
                  str.indexOf('chrome-extension://') !== -1 ||
                  str.indexOf('moz-extension://') !== -1 ||
                  str.indexOf('M_ID') !== -1 ||
                  str.indexOf('eppiocemhmnlbhjplcgkofciiegomcon') !== -1
                ) {
                  e.stopImmediatePropagation();
                  e.preventDefault();
                }
              }, true);

              // 3. Redam log hydration mismatch React 19 yang disebabkan oleh atribut ekstensi browser
              if (typeof console !== 'undefined' && console.error) {
                var origErr = console.error;
                console.error = function() {
                  var allArgs = '';
                  for (var i = 0; i < arguments.length; i++) {
                    try {
                      allArgs += (typeof arguments[i] === 'string' ? arguments[i] : JSON.stringify(arguments[i])) + ' ';
                    } catch(err) {
                      allArgs += String(arguments[i]) + ' ';
                    }
                  }
                  if (
                    (allArgs.indexOf('hydrated') !== -1 || allArgs.indexOf('Hydration') !== -1 || allArgs.indexOf('hydration-mismatch') !== -1) &&
                    (allArgs.indexOf('bis_skin_checked') !== -1 || allArgs.indexOf('bis_register') !== -1 || allArgs.indexOf('__processed_') !== -1)
                  ) {
                    return;
                  }
                  if (allArgs.indexOf('chrome-extension://') !== -1 && allArgs.indexOf('M_ID') !== -1) {
                    return;
                  }
                  return origErr.apply(console, arguments);
                };
              }
            } catch(err) {}
          })();
        `,
      }}
    />
    {children}
  </RootLayout>
)

export default Layout
