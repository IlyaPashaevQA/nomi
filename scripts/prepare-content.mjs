import ts from 'typescript';
import {readFileSync, writeFileSync, rmSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

// This export deliberately excludes schoolbook passages and unpublished packs.
// Remove catalogue payloads while retaining the shared planners/renderers.
const replacements = {
  'safa-context-catalog.mjs': {
    SAFA_CONTEXT: "Object.freeze({version:'portfolio-no-reading-v1',tasks:[],phrases:[],source:[],sentences:[],readyVersion:'unavailable',legacyVersion:'unavailable'})",
  },
  'safa-cave-full-cards.mjs': {
    SAFA_FULL_CARD_CATALOG: "Object.freeze({schema:'nomi-safa-full-cards-v1',version:'unavailable',cards:[]})",
  },
  'karmel-page15-activities.mjs': {
    KARMEL_PAGE15: "Object.freeze({packId:'omitted-school-content',version:'unavailable',source:'',sourcePages:{},questions:[]})",
  },
  'reading-unit-catalog.mjs': {
    READING_UNITS: 'Object.freeze([])', KARMEL_READING_EXCERPTS: 'Object.freeze({})',
    KARMEL_ORDER_THREE: 'Object.freeze([])', KARMEL_READING_TASKS: 'Object.freeze([])',
  },
  'source37-sentence-data.mjs': {SOURCE37_SENTENCE_A: 'Object.freeze([])'},
};

for (const [name, variables] of Object.entries(replacements)) {
  const path = `web/languages-v05/${name}`;
  let text = readFileSync(path, 'utf8');
  const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const edits = [];
  const visit = node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && variables[node.name.text]) {
      edits.push({start: node.initializer.getStart(ast), end: node.initializer.getEnd(), value: variables[node.name.text]});
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  if (edits.length !== Object.keys(variables).length) throw Error(`Catalogue shape changed: ${name}`);
  for (const edit of edits.sort((a,b) => b.start-a.start)) text = text.slice(0,edit.start)+edit.value+text.slice(edit.end);
  writeFileSync(path, text);
}

// Simple original geometric artwork; no production picture or character pack.
const drawings = {
  house: '<path d="M30 94 100 32l70 62" fill="#d99562" stroke="#425d51" stroke-width="7"/><path d="M49 91h102v81H49z" fill="#f4dcaa" stroke="#425d51" stroke-width="6"/><path d="M87 127h29v45H87z" fill="#638d9a"/><path d="M62 109h19v20H62zm65 0h14v20h-14z" fill="#fff"/>',
  book: '<path d="M28 49q37-13 72 10 35-23 72-10v111q-37-13-72 10-35-23-72-10z" fill="#fff7df" stroke="#456b68" stroke-width="7"/><path d="M100 59v111M45 78l36 9m-36 20 36 9m38-29 36-9m-36 38 36-9" stroke="#78a6a1" stroke-width="5"/>',
  tree: '<path d="M86 87h28v94H86z" fill="#936241"/><path d="m100 136-28-25m28 9 29-29" stroke="#936241" stroke-width="12"/><circle cx="100" cy="66" r="42" fill="#4b8962"/><circle cx="65" cy="94" r="35" fill="#6fa779"/><circle cx="134" cy="95" r="36" fill="#568e60"/>',
  fish: '<path d="m40 100-23-31v62z" fill="#e5b15d"/><ellipse cx="105" cy="100" rx="65" ry="42" fill="#eaa75c" stroke="#946840" stroke-width="5"/><path d="m89 101 27-22v43z" fill="#d78443"/><circle cx="145" cy="90" r="6" fill="#263e35"/><circle cx="176" cy="47" r="8" fill="none" stroke="#86b7c5" stroke-width="4"/>',
  flower: '<path d="M100 96v86m0-35q-43-3-38-33 34-1 38 33m0 19q39-1 37-29-31-2-37 29" fill="#6a9b68" stroke="#4b7650" stroke-width="5"/><g fill="#e7a2b6">'+[0,72,144,216,288].map(a=>`<ellipse cx="100" cy="47" rx="21" ry="29" transform="rotate(${a} 100 80)"/>`).join('')+'</g><circle cx="100" cy="80" r="23" fill="#ebc35e"/>',
  water: '<path d="M100 24Q42 98 48 128a53 53 0 0 0 104 0q6-30-52-104" fill="#72b7cd" stroke="#407f9c" stroke-width="6"/><path d="M70 120q-6 31 25 37" fill="none" stroke="#d3edf3" stroke-width="9" stroke-linecap="round"/>',
  dog: '<path d="M62 54 26 57q-7 66 35 69m77-72 36 3q7 66-35 69" fill="#855b40" stroke="#543e30" stroke-width="5"/><ellipse cx="100" cy="107" rx="57" ry="65" fill="#c99764"/><ellipse cx="100" cy="135" rx="35" ry="25" fill="#eed1a8"/><circle cx="78" cy="99" r="6" fill="#263e35"/><circle cx="122" cy="99" r="6" fill="#263e35"/><path d="m89 124 11 12 11-12z" fill="#493f38"/><path d="M100 136v13m-14-2q14 17 28 0" fill="none" stroke="#493f38" stroke-width="4"/>',
  cat: '<path d="m48 79-1-49 43 31m62 18 1-49-43 31" fill="#aebac5" stroke="#526370" stroke-width="5"/><ellipse cx="100" cy="113" rx="63" ry="58" fill="#bbc7ce"/><path d="m58 59-1-16 17 17m68-1 1-16-17 17" fill="#d99aab"/><ellipse cx="77" cy="104" rx="6" ry="9" fill="#4b735e"/><ellipse cx="123" cy="104" rx="6" ry="9" fill="#4b735e"/><path d="m92 124 8 8 8-8z" fill="#b17f8a"/><path d="m44 124 32 7m-35 11 35-3m80-15-32 7m35 11-35-3M100 132v12m-13 0q13 13 26 0" fill="none" stroke="#526370" stroke-width="3"/>',
};
mkdirSync('web/languages-v05/assets/demo', {recursive:true});
for (const [name, drawing] of Object.entries(drawings)) {
  writeFileSync(`web/languages-v05/assets/demo/${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${drawing}</svg>\n`);
}
const catalogue = JSON.parse(readFileSync('demo-catalog.json','utf8'));
for (const word of catalogue.catalog[0].words) {
  word.image = `./assets/demo/${word.meaning}.svg`;
  delete word.contentSha256;
  word.contentSha256 = createHash('sha256').update(JSON.stringify(word)).digest('hex');
}
writeFileSync('demo-catalog.json', JSON.stringify(catalogue,null,2)+'\n');
rmSync('web/languages-v05/assets/uploaded', {recursive:true,force:true});
writeFileSync('web/languages-v05/luni-art.mjs', `// Original neutral leaf for the portable edition.\nexport function luni(state='idle'){return '<button class="luni-mascot" data-state="'+state+'" type="button" aria-label="Nomi"><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="88" fill="#e3ebdc"/><path d="M51 136Q39 57 146 46q27 100-95 90m2 0 71-64" fill="#87ab78" stroke="#426c4b" stroke-width="7"/></svg></button>'}\n`);
const manifest = JSON.parse(readFileSync('docs/source-manifest.json','utf8'));
manifest.files = manifest.files.filter(row => !row.path.startsWith('web/languages-v05/assets/uploaded/'));
for (const row of manifest.files) {
  const hash = createHash('sha256').update(readFileSync(row.path)).digest('hex');
  if (hash !== row.export_sha256) {
    row.export_sha256 = hash;
    row.transformation = row.path.endsWith('luni-art.mjs') ? 'Original neutral leaf artwork replaces private character design' : 'School-reading catalogue payload omitted from portable edition';
  }
}
writeFileSync('docs/source-manifest.json', JSON.stringify(manifest,null,2)+'\n');
