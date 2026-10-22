// Generates a synthetic 50k-file repo (LF) at argv[2].
const fs = require('fs'), path = require('path')
const root = process.argv[2]
let n = 0
function body(i) {
  const lines = [`// file ${i}`, `export const id${i} = ${i}`]
  for (let k = 0; k < 8; k++) lines.push(`export function f${k}_${i}(x: number) { return x + ${k * i} }`.slice(0, 44))
  if (i % 500 === 0) lines.push(`// ORCA_NEEDLE marker ${i}`)
  return lines.join('\n') + '\n'
}
function w(rel, s) { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); n++ }
for (let i = 0; i < 10000; i++) w(`src/big/f${String(i).padStart(5, '0')}.ts`, body(n))
for (let p = 0; p < +(process.argv[3] || 40); p++) for (const d of 'abcdefghij') for (let i = 0; i < 100; i++) w(`pkgs/p${String(p).padStart(2, '0')}/${d}/m${i}.ts`, body(n))
let big = ''; let j = 0
while (big.length < 5 * 1024 * 1024) big += `line ${j++} lorem ipsum dolor sit amet consectetur adipiscing elit sed do\n`
w('assets/big.txt', big)
w('README.md', '# bench\n')
console.log('files', n)
