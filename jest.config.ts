import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^firebase/firestore$': '<rootDir>/__mocks__/firebase/firestore.ts',
    '^firebase/app$': '<rootDir>/__mocks__/firebase/app.ts',
    '^@googlemaps/js-api-loader$': '<rootDir>/__mocks__/@googlemaps/js-api-loader.ts',
    '^next/navigation$': '<rootDir>/__mocks__/next/navigation.ts',
    '^next-auth/react$': '<rootDir>/__mocks__/next-auth/react.ts',
    '^next-auth$': '<rootDir>/__mocks__/next-auth.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(t|j)sx?$': 'babel-jest',
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/src/app/\\(auth\\)/',
    '/src/app/layout.tsx',
    '/src/middleware.ts',
  ],
  collectCoverageFrom: [
    'src/components/ui/**/*.tsx',
    'src/store/**/*.ts',
    'src/lib/simulation.ts',
    'src/lib/firebase.ts',
    'src/app/api/**/*.ts',
    'src/types/**/*.ts',
  ],
};

export default config;
