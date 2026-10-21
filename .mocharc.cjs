const showActiveHandles = require('./support/show-active-handles.cjs');

process.env.TS_NODE_PROJECT = __dirname + '/tsconfig-test.json';
process.env.NODE_ENV = 'test';

/** @type {import('mocha').MochaOptions} */
module.exports = {
  require: ['@swc-node/register/esm-register'],
  extension: ['ts'],
  /* Every module's tests from the root; a module's own from its directory,
   * where its test script names this file */
  spec:
    process.cwd() === __dirname
      ? './packages/*/test/**/*.*spec.ts'
      : './test/**/*.*spec.ts',
  ignore: ['**/node_modules/**'],
  timeout: 30000,
  rootHooks: {
    /* A test leaving a socket or timer open keeps the run from ending:
     * report what is still open, and fail rather than hang */
    afterAll: async () => {
      setTimeout(() => {
        showActiveHandles();
        process.exit(1);
      }, 5000).unref();
    },
  },
};
