import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// FlatCompat is a deliberate, temporary shim (#907). eslint-config-next 15.x
// (15.5.22 in yarn.lock) still ships only legacy `extends` configs, so they
// must be wrapped. Migrate when eslint-config-next is upgraded to a version
// that exports native flat configs (16.x), and drop @eslint/eslintrc:
//
//   import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
//   import nextTypescript from "eslint-config-next/typescript";
//   export default [...nextCoreWebVitals, ...nextTypescript, { rules: { ... } }];
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // #707: eslint-config-next turns this rule off. Re-enable it so every
      // target="_blank" link (and form) must carry rel="noopener noreferrer",
      // closing reverse tabnabbing via window.opener. Dynamic hrefs are
      // checked too, since explorer URLs are built from runtime values.
      "react/jsx-no-target-blank": [
        "error",
        {
          allowReferrer: false,
          enforceDynamicLinks: "always",
          links: true,
          forms: true,
        },
      ],
      // #495: this codebase has no components/ui barrel file today — every
      // component is already imported directly by filename. This rule keeps
      // it that way by rejecting any future `@/components/ui` (or a nested
      // barrel under it) import before it can reintroduce the tree-shaking
      // problem #495 was filed against.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/ui", "@/components/ui/index"],
              message:
                "Import directly from the component's own file (e.g. '@/components/ui/Button'), not a barrel — barrel imports defeat tree-shaking (#495).",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
