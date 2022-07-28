module.exports = {
    plugins: ["@typescript-eslint", "eslint-comments", "import", "promise"],
    extends: [
        "airbnb-typescript/base",
        "plugin:@typescript-eslint/recommended",
        "plugin:eslint-comments/recommended",
        "plugin:promise/recommended",
        "prettier",
    ],
    env: {
        node: true,
        browser: false,
        jest: false,
        mocha: true,
    },
    parserOptions: {
        project: "./tsconfig.json",
    },
    rules: {
        // Too restrictive, writing ugly code to defend against a very unlikely scenario: https://eslint.org/docs/rules/no-prototype-builtins
        "no-prototype-builtins": "off",
        // https://basarat.gitbooks.io/typescript/docs/tips/defaultIsBad.html
        "import/prefer-default-export": "off",
        "import/no-default-export": "error",
        // Too restrictive: https://github.com/yannickcr/eslint-plugin-react/blob/master/docs/rules/destructuring-assignment.md
        "react/destructuring-assignment": "off",
        // No jsx extension: https://github.com/facebook/create-react-app/issues/87#issuecomment-234627904
        "react/jsx-filename-extension": "off",
        // Use function hoisting to improve code readability
        "no-use-before-define": ["error", { functions: false, classes: true, variables: true }],
        // Makes no sense to allow type inferrence for expression parameters, but require typing the response
        "@typescript-eslint/explicit-function-return-type": [
            "error",
            { allowExpressions: true, allowTypedFunctionExpressions: true },
        ],
        "@typescript-eslint/no-use-before-define": [
            "error",
            { functions: false, classes: true, variables: true, typedefs: true },
        ],
        "class-methods-use-this": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/lines-between-class-members": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "consistent-return": "off",
    },
};
