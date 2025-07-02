// Mock for chalk to avoid ES module issues in Jest
const chalk = {
  red: (str) => str,
  green: (str) => str,
  yellow: (str) => str,
  blue: (str) => str,
  magenta: (str) => str,
  cyan: (str) => str,
  white: (str) => str,
  gray: (str) => str,
  grey: (str) => str,
  black: (str) => str,
  bold: (str) => str,
  dim: (str) => str,
  italic: (str) => str,
  underline: (str) => str,
  strikethrough: (str) => str,
  inverse: (str) => str,
  hidden: (str) => str,
  visible: (str) => str,
  reset: (str) => str,
  bgRed: (str) => str,
  bgGreen: (str) => str,
  bgYellow: (str) => str,
  bgBlue: (str) => str,
  bgMagenta: (str) => str,
  bgCyan: (str) => str,
  bgWhite: (str) => str,
  bgBlack: (str) => str,
  bgGray: (str) => str,
  bgGrey: (str) => str,
};

// Support chaining
Object.keys(chalk).forEach(key => {
  chalk[key] = new Proxy(chalk[key], {
    get(target, prop) {
      if (typeof chalk[prop] === 'function') {
        return chalk[prop];
      }
      return target;
    }
  });
});

module.exports = chalk;
module.exports.default = chalk;