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
    'src/components/ui/StampBadge.tsx',
    'src/components/ui/OfficialCard.tsx',
    'src/components/ui/FormField.tsx',
    'src/components/ui/BallotCounter.tsx',
    'src/components/ui/GeminiAdvisor.tsx',
    'src/components/ui/ElectionTimeline.tsx',
    'src/components/ui/DisputeModal.tsx',
    'src/components/ErrorBoundary.tsx',
    'src/lib/simulation.ts',
    'src/lib/firebase.ts',
    'src/store/simulation.store.ts',
    'src/app/api/gemini/route.ts',
    'src/app/api/google/sheets/route.ts',
    'src/app/api/google/slides/route.ts',
    'src/app/api/google/calendar/route.ts',
    'src/app/api/google/translate/route.ts',
    'src/app/api/simulation/validate-constituency/route.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 75,
      functions: 80,
      lines: 85,
    }
  }
};

export default config;
