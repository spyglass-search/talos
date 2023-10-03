import { readFileSync } from 'fs';
import { resolve } from 'path';
import { cwd } from 'process';
import { defineConfig } from 'rollup';
import resolvePlugin from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';

const pkg = JSON.parse(readFileSync(resolve(cwd(), './package.json')));
const isProd = process.env.NODE_ENV === 'production';

const defaultPlugins = [
  resolvePlugin(),
  commonjs({
    include: /node_modules/,
  }),
  postcss({
    config: {
      path: './postcss.config.js',
    },
    extensions: ['.css'],
    minimize: true,
    inject: {
      insertAt: 'top',
    },
  }),
];

const onwarn = (warning, rollupWarn) => {
  if (warning.code !== 'CIRCULAR_DEPENDENCY') {
    rollupWarn(warning);
  }
};

const getEsmConfig = (format) => ({
  input: pkg.source,
  output: {
    file: format === 'js' ? pkg.module : pkg.module.replace('.js', '.mjs'),
    format: 'esm',
  },
  onwarn,
  plugins: [
    peerDepsExternal({
      includeDependencies: true,
    }),
    ...defaultPlugins,
    typescript({tsconfig: './tsconfig.json'}),
  ],
});

export const esmJsConfig = defineConfig(getEsmConfig('js'));
export const esmMjsConfig = defineConfig(getEsmConfig('mjs'));

const globals = {
  react: 'React',
  'react-dom': 'ReactDOM',
  ...(pkg.rollup?.globals || {}),
};

export const umdConfig = defineConfig({
  input: pkg.source,
  output: {
    file: pkg.main,
    format: 'umd',
    exports: 'named',
    name: pkg.rollup?.name || 'Talos',
    globals,
  },
  onwarn,
  plugins: [
    peerDepsExternal(),
    ...defaultPlugins,
    typescript({tsconfig: './tsconfig.json'}),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
    terser(),
  ],
});

export default isProd ? [esmJsConfig, esmMjsConfig] : [esmMjsConfig];