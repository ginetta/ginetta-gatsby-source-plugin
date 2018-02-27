module.exports = function(wallaby) {
  // Babel, jest-cli and some other modules may be located under
  // react-scripts/node_modules, so need to let node.js know about it
  var path = require('path');
  process.env.NODE_PATH +=
    path.delimiter + path.join(__dirname, 'node_modules');

  require('module').Module._initPaths();

  return {
    files: [
      'src/**/*.+(js|jsx|json|snap|css|less|sass|scss|jpg|jpeg|gif|png|svg)',
      '!src/**/*.test.js?(x)',
      '!src/store.js',
      '!src/index.js',
      '!src/quokkaPlayground.js',
    ],

    tests: ['src/**/*.test.js?(x)'],

    env: {
      type: 'node',
      runner: 'node',
    },

    compilers: {
      '**/*.js?(x)': wallaby.compilers.babel({}),
    },

    hints: {
      ignoreCoverage: 'istanbul ignore',
    },

    setup: wallaby => {},

    testFramework: 'jest',
  };
};
