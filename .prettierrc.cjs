module.exports = {
  ...require('@linzjs/style/.prettierrc.cjs'),
  printWidth: 200,
  overrides: [
    {
      files: ["config/style/*.json"],
      options: {
        plugins: ["prettier-plugin-sort-json"],
        jsonRecursiveSort: true
      }
    },
  ]
};
