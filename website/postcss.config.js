module.exports = {
  plugins: [
    require('postcss-custom-media')({
      extensions: {
        '--xs': '(min-width: 375px)',
        '--sm': '(min-width: 480px)',
        '--ms': '(min-width: 680px)',
        '--md': '(min-width: 768px)',
        '--lg': '(min-width: 1024px)',
        '--xl': '(min-width: 1200px)',
      }
    }),
    require('autoprefixer')({
      browsers: ['ie >= 8', 'last 3 versions']
    })
  ]
};
