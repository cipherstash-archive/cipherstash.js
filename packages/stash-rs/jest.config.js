/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: [
    "js",
    "ts",
    "node",
    "d.ts",
    "json"
  ],
  testMatch: [
    "**/*.test.ts"
  ],
};
