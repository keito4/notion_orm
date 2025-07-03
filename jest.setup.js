// Mock chalk to avoid ESM import issues
jest.mock('chalk', () => {
  const createColorFunc = () => {
    const fn = (str) => str;
    // Create a separate function for each color to avoid circular references
    fn.red = (str) => str;
    fn.green = (str) => str;
    fn.yellow = (str) => str;
    fn.blue = (str) => str;
    fn.cyan = (str) => str;
    fn.magenta = (str) => str;
    fn.white = (str) => str;
    fn.gray = (str) => str;
    fn.bold = (str) => str;
    fn.dim = (str) => str;
    fn.underline = (str) => str;
    return fn;
  };
  
  const mockChalk = createColorFunc();
  
  return {
    default: mockChalk,
    red: mockChalk.red,
    green: mockChalk.green,
    yellow: mockChalk.yellow,
    blue: mockChalk.blue,
    cyan: mockChalk.cyan,
    magenta: mockChalk.magenta,
    white: mockChalk.white,
    gray: mockChalk.gray,
    bold: mockChalk.bold,
    dim: mockChalk.dim,
    underline: mockChalk.underline,
  };
});

// Set up test environment - suppress console output unless CI or VERBOSE is set
if (!process.env.CI && !process.env.VERBOSE) {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}