/**
 * Inlined at build time. A production build folds this to `false`, so demo credentials and the
 * demo workspace are removed from the bundle and cannot be switched on from the browser.
 */
export const DEMO_ENABLED = process.env.NEXT_PUBLIC_APP_ENV !== 'production';
