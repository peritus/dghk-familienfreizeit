import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import MarkdownIt from 'markdown-it'
import GithubSlugger from 'github-slugger'

const markdown = new MarkdownIt({ html: true })
const excluded = new Set(['.git', '.jj', 'node_modules', 'dist', '.wrangler', 'coverage'])

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (excluded.has(entry.name) || entry.isSymbolicLink()) continue
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await markdownFiles(filename))
    else if (entry.name.endsWith('.md')) files.push(filename)
  }
  return files
}

function inspectMarkdown(source) {
  const tokens = markdown.parse(source, {})
  const slugger = new GithubSlugger()
  const anchors = new Set()
  const links = []
  function inlineText(children) {
    return children.map((token) => {
      if (token.type === 'image') return inlineText(token.children ?? [])
      if (token.type === 'text' || token.type === 'code_inline') return token.content
      if (token.type === 'softbreak' || token.type === 'hardbreak') return ' '
      return ''
    }).join('')
  }
  function inspect(token, line) {
    if (token.type === 'link_open') links.push({ destination: token.attrGet('href'), line })
    if (token.type === 'image') links.push({ destination: token.attrGet('src'), line })
    if (token.type === 'html_inline' || token.type === 'html_block') {
      // Only actual tags carry anchors/links; ignore comments and their contents.
      const html = token.content.replace(/<!--[\s\S]*?-->/g, '')
      for (const tag of html.matchAll(/<[a-z][^>]*>/gi)) {
        for (const attribute of tag[0].matchAll(/\s(id|name|href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
          const value = attribute[2] ?? attribute[3] ?? attribute[4]
          if (/^(id|name)$/i.test(attribute[1])) anchors.add(value)
          else links.push({ destination: value, line })
        }
      }
    }
    for (const child of token.children ?? []) inspect(child, line)
  }
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (token.type === 'heading_open') {
      anchors.add(slugger.slug(inlineText(tokens[index + 1].children ?? [])))
    }
    inspect(token, (token.map?.[0] ?? 0) + 1)
  }
  return { anchors, links }
}

export async function checkDocLinks(directory) {
  const root = path.resolve(directory)
  const files = await markdownFiles(root)
  const documents = new Map()
  for (const file of files) documents.set(file, inspectMarkdown(await readFile(file, 'utf8')))
  const errors = []
  let checked = 0
  for (const [file, document] of documents) {
    for (const { destination, line } of document.links) {
      if (!destination || /^[a-z][\w+.-]*:/i.test(destination) || destination.startsWith('//')) continue
      checked++
      const fail = (reason) => errors.push(`${path.relative(root, file)}:${line}: ${destination}: ${reason}`)
      let pathname, fragment
      try {
        const hash = destination.indexOf('#')
        const resource = hash < 0 ? destination : destination.slice(0, hash)
        pathname = decodeURIComponent(resource.split('?')[0])
        fragment = hash < 0 ? '' : decodeURIComponent(destination.slice(hash + 1))
      } catch {
        fail('invalid URL encoding')
        continue
      }
      const target = pathname ? path.resolve(pathname.startsWith('/') ? root : path.dirname(file), pathname.replace(/^\/+/, '')) : file
      if (path.relative(root, target).split(path.sep)[0] === '..') {
        fail('target escapes repository')
        continue
      }
      try {
        await stat(target)
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error
        fail('target does not exist')
        continue
      }
      if (fragment && target.endsWith('.md') && !documents.get(target)?.anchors.has(fragment)) {
        fail('heading or explicit anchor does not exist')
      }
    }
  }
  return { files: files.length, checked, errors }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await checkDocLinks(process.cwd())
  if (result.errors.length) {
    process.stderr.write(`${result.errors.join('\n')}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write(`Documentation links: ${result.checked} local links in ${result.files} Markdown files passed.\n`)
  }
}
