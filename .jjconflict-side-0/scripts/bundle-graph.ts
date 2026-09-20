import { relative } from 'node:path'
import type { Plugin } from 'vite'

// Inspect actual emitted chunks, including shared dependencies, not source sizes.
export function bundleGraph(): Plugin {
  return {
    name: 'bundle-graph',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((entry) => entry.type === 'chunk')
      this.emitFile({
        type: 'asset',
        fileName: '.vite/bundle-graph.json',
        source: JSON.stringify(chunks.map((chunk) => ({
          file: chunk.fileName,
          entry: chunk.isEntry,
          imports: chunk.imports,
          dynamic_imports: chunk.dynamicImports,
          modules: Object.keys(chunk.modules).map((id) => relative(process.cwd(), id).replaceAll('\\', '/')),
        }))),
      })
    },
  }
}
