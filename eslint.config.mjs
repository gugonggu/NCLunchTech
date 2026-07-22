import nextConfig from "eslint-config-next";

const eslintConfig = [{ ignores: [".worktrees/**"] }, ...nextConfig];

export default eslintConfig;
