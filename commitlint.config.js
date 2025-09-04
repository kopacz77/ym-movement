/**
 * Commitlint Configuration
 *
 * Enforces conventional commit messages for consistent Git history
 *
 * @version 3.0.0
 * @since Phase 3 Architecture Optimizations
 */

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Type restrictions
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation only changes
        "style", // Changes that do not affect the meaning of the code
        "refactor", // Code change that neither fixes a bug nor adds a feature
        "perf", // Performance improvement
        "test", // Adding missing tests or correcting existing tests
        "build", // Changes that affect the build system or external dependencies
        "ci", // Changes to CI configuration files and scripts
        "chore", // Other changes that don't modify src or test files
        "revert", // Reverts a previous commit
        "security", // Security fixes
        "optim", // Performance optimizations
      ],
    ],

    // Subject line restrictions
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "subject-max-length": [2, "always", 72],
    "subject-min-length": [2, "always", 3],

    // Header restrictions
    "header-max-length": [2, "always", 100],

    // Body restrictions
    "body-leading-blank": [1, "always"],
    "body-max-line-length": [2, "always", 100],

    // Footer restrictions
    "footer-leading-blank": [1, "always"],
    "footer-max-line-length": [2, "always", 100],

    // Type restrictions
    "type-case": [2, "always", "lower-case"],
    "type-empty": [2, "never"],

    // Scope restrictions
    "scope-case": [2, "always", "lower-case"],
  },

  // Custom parser options
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w*)(?:\(([^)]*)\))?!?: (.*)$/,
      headerCorrespondence: ["type", "scope", "subject"],
    },
  },

  // Help message for invalid commits
  helpUrl: "https://github.com/conventional-changelog/commitlint/#what-is-commitlint",

  // Custom plugins for additional rules
  plugins: [
    {
      rules: {
        "security-keywords": (parsed) => {
          const { subject, body } = parsed;
          const securityKeywords = ["password", "secret", "key", "token", "api-key"];
          const text = `${subject} ${body || ""}`.toLowerCase();

          const hasSecurityKeyword = securityKeywords.some((keyword) => text.includes(keyword));

          if (hasSecurityKeyword) {
            return [
              false,
              "Commit message contains potential security-sensitive keywords. Please review carefully.",
            ];
          }

          return [true];
        },
      },
    },
  ],

  // Additional rules for our specific project
  rules: {
    ...{}, // Spread existing rules
    "security-keywords": [1, "always"], // Warning for security keywords
  },
};
