// .prettierrc.cjs
module.exports = {
  semi: true, // Add semicolons at the end of statements
  singleQuote: true, // Use single quotes instead of double quotes
  trailingComma: 'es5', // Add trailing commas where valid in ES5 (objects, arrays, etc.)
  printWidth: 80, // Specify the line length that the printer will wrap on
  tabWidth: 2, // Specify the number of spaces per indentation-level
  useTabs: false, // Indent lines with spaces instead of tabs
  bracketSpacing: true, // Print spaces between brackets in object literals
  arrowParens: 'always', // Include parentheses around a sole arrow function parameter
  endOfLine: 'lf', // Use 'lf' line endings
  // If using TailwindCSS, ensure the plugin is correctly configured
  // plugins: [require('prettier-plugin-tailwindcss')], // Example if needed
};
