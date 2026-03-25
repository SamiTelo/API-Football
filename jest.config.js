"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1',
    },
    testMatch: ['**/*.spec.ts', '**/*.test.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    collectCoverage: true,
    collectCoverageFrom: ['<rootDir>/src/**/*.(t|j)s'],
    coverageDirectory: '<rootDir>/coverage',
    verbose: true,
};
exports.default = config;
//# sourceMappingURL=jest.config.js.map