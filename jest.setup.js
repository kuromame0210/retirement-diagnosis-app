import '@testing-library/jest-dom'

// ResizeObserver のモック
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// IntersectionObserver のモック
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// matchMedia のモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// crypto.randomUUID のモック
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substring(7),
  },
})

// コンソールエラーとwarningを抑制（テスト中の不要な警告を防ぐ）
const originalWarn = console.warn
const originalError = console.error
const originalLog = console.log

beforeAll(() => {
  console.warn = jest.fn()
  console.error = jest.fn()
  console.log = jest.fn()
})

afterAll(() => {
  console.warn = originalWarn
  console.error = originalError
  console.log = originalLog
})

// fetch のグローバルモック
global.fetch = jest.fn()