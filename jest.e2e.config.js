module.exports = {
  displayName: 'e2e',
  rootDir: './test',
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage/e2e',
  testEnvironment: 'node',
  testTimeout: 30000,
};
