module.exports = {
  presets: [require('@vercel/examples-ui/tailwind')],
  // `ui.content` includes a path to the components that are using tailwind in @acme/ui
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './node_modules/@vercel/examples-ui/**/*.js'
  ]
};
