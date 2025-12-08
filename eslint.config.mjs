import { createRequire } from "module";
const require = createRequire(import.meta.url);
const nextConfig = require("eslint-config-next");

const eslintConfig = [...nextConfig];

export default eslintConfig;
