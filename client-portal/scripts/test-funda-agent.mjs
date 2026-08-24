#!/usr/bin/env node
/**
 * Funda-tekst Test Agent — Volledig
 * Test drie endpoints: funda-tekst, funda-multi, verfijn-tekst
 *
 * Gebruik:
 *   node scripts/test-funda-agent.mjs
 *   BASE_URL=http://localhost:3000 node scripts/test-funda-agent.mjs
 *   SUITE=funda   node scripts/test-funda-agent.mjs   (alleen funda-tekst)
 *   SUITE=multi   node scripts/test-funda-agent.mjs   (alleen funda-multi)
 *   SUITE=verfijn node scripts/test-funda-agent.mjs   (alleen verfijn)
 */

const BASE_URL = process.env.BASE_URL || 'https://portal.brandiscode.com'
const SUITE   = process.env.SUITE   || 'all'

// ─── KLEUREN ────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m',
  cyan: '\x1b[36m', gray: '\x1b[90m', blue: '\x1b[34m', magenta: '\x1b[35m',
}
const ok   = (s) => `${C.green}✓${C.reset} ${s}`
const warn = (s) => `${C.yellow}⚠${C.reset}  ${s}`
const fail = (s) => `${C.red}✗${C.reset} ${s}`
const info = (s) => `${C.gray}${s}${C.reset}`
const section = (s) => `\n${C.bold}${C.cyan}── ${s} ──${C.reset}`

// ─── GEDEELD WONING FIXTURE ──────────────────────────────────────────────────
const VRIJSTAAND = {
  woningtype: 'Vrijstaande woning',
  adres: 'Schuttershof 4, Tholen',
  bouwjaar: '1985',
  woonoppervlakte: '145',
  perceeloppervlakte: '450',
  kamers: '6',
  slaapkamers: '4',
  ligging: 'rustige woonwijk nabij centrum Tholen',
  kenmerken: ['Garage', 'Tuin op het zuiden', 'Zonnepanelen', 'Vrijstaande schuur'],
  staat: 'Instapklaar',
  lengte: 'normaal',
}

// ─── TESTCASES FUNDA-TEKST ────────────────────────────────────────────────────
const FUNDA_CASES = [
  {
    name: '1 · Minimaal (alleen verplichte velden)',
    input: {
      woningtype: 'Tussenwoning',
      adres: 'Molenstraat 12, Sint-Maartensdijk',
      ligging: 'rustige straat, centrum Sint-Maartensdijk',
      kenmerken: [],
      staat: 'Goed onderhouden',
      lengte: 'normaal',
    },
  },
  {
    name: '2 · Volledig ingevuld vrijstaand',
    input: VRIJSTAAND,
  },
  {
    name: '3 · Appartement (geen tuin verwacht)',
    input: {
      woningtype: 'Appartement',
      adres: 'Havenstraat 8, Tholen',
      bouwjaar: '2005',
      woonoppervlakte: '78',
      kamers: '3',
      slaapkamers: '2',
      ligging: 'haven van Tholen, uitzicht op water',
      kenmerken: ['Airco', 'Dubbele beglazing'],
      staat: 'Instapklaar',
      lengte: 'normaal',
    },
  },
  {
    name: '4 · Historische boerderij Poortvliet',
    input: {
      woningtype: 'Boerderij',
      adres: 'Polderdijk 23, Poortvliet',
      bouwjaar: '1920',
      woonoppervlakte: '210',
      perceeloppervlakte: '2500',
      kamers: '8',
      slaapkamers: '5',
      ligging: 'buitengebied Poortvliet, vrij uitzicht over de polder',
      kenmerken: ['Balkenplafond', 'Vrijstaande schuur'],
      staat: 'Goed onderhouden',
      bijzonderheden: 'Authentieke details: originele luiken en eikenhouten vloeren.',
      lengte: 'uitgebreid',
    },
  },
  {
    name: '5 · Opknapper (geen instapklaar-taal verwacht)',
    input: {
      woningtype: 'Hoekwoning',
      adres: 'Kerkstraat 5, Scherpenisse',
      bouwjaar: '1965',
      woonoppervlakte: '95',
      kamers: '4',
      slaapkamers: '3',
      ligging: 'dorpscentrum Scherpenisse',
      kenmerken: [],
      staat: 'Opknapper',
      lengte: 'kort',
    },
  },
]

// ─── TESTCASES FUNDA-MULTI ────────────────────────────────────────────────────
const MULTI_CASES = [
  {
    name: 'M1 · Vrijstaand woning — alle 4 formats',
    input: VRIJSTAAND,
    checks: {
      funda:     { minWords: 150, mustNotContain: ['instagram', 'facebook', '#tholen'] },
      instagram: { minWords: 40,  mustContain: ['#'], maxWords: 200 },
      facebook:  { minWords: 80,  mustNotContain: ['#leunis', '##'] },
      brochure:  { minWords: 100, mustNotContain: ['!', 'droomwoning'] },
    },
  },
  {
    name: 'M2 · Appartement — geen tuin in alle formats',
    input: {
      woningtype: 'Appartement',
      adres: 'Havenstraat 8, Tholen',
      woonoppervlakte: '78',
      ligging: 'haven van Tholen',
      kenmerken: ['Airco'],
      staat: 'Instapklaar',
      lengte: 'normaal',
    },
    checks: {
      funda:     { noHallucination: ['garage', 'vrijstaande schuur', 'balkon'] },
      instagram: { noHallucination: ['garage', 'vrijstaande schuur'] },
      facebook:  { noHallucination: ['garage', 'vrijstaande schuur'] },
      brochure:  { noHallucination: ['garage', 'vrijstaande schuur'] },
    },
  },
  {
    name: 'M3 · Minimaal (geen kenmerken) — niets verzinnen',
    input: {
      woningtype: '2-onder-1-kapwoning',
      adres: 'Burgemeesterslaan 3, Oud-Vossemeer',
      ligging: 'rustige wijk Oud-Vossemeer',
      kenmerken: [],
      staat: 'Goed onderhouden',
      lengte: 'normaal',
    },
    checks: {
      funda:     { noHallucination: ['garage', 'airco', 'zonnepanelen', 'balkon', 'vloerverwarming'] },
      instagram: { noHallucination: ['garage', 'airco', 'zonnepanelen'] },
      facebook:  { noHallucination: ['garage', 'airco', 'zonnepanelen'] },
      brochure:  { noHallucination: ['garage', 'airco', 'zonnepanelen'] },
    },
  },
]

// ─── TESTCASES VERFIJN ────────────────────────────────────────────────────────
const VERFIJN_CASES = [
  {
    name: 'V1 · Maak opening sfeervoller',
    input: {
      tekst: 'Aan de Hoogstraat 5 in Tholen staat een rijtjeshuis. Het heeft 3 slaapkamers en een tuin.',
      instructie: 'Maak de opening sfeervoller in de stijl van Leunis Makelaars',
      format: 'funda',
    },
    check: (output) => {
      const words = output.trim().split(/\s+/).length
      if (words < 15) return `output te kort (${words} woorden)`
      if (output.trim() === 'Aan de Hoogstraat 5 in Tholen staat een rijtjeshuis.') return 'tekst niet aangepast'
      return null
    },
  },
  {
    name: 'V2 · Instagram hashtags toevoegen',
    input: {
      tekst: 'Prachtige woning in Tholen. Rustige ligging met grote tuin. Neem contact op!',
      instructie: 'Voeg relevante hashtags toe aan het einde',
      format: 'instagram',
    },
    check: (output) => {
      if (!output.includes('#')) return 'geen hashtags gevonden in output'
      return null
    },
  },
  {
    name: 'V3 · Brochure formeler maken',
    input: {
      tekst: 'Super gaaf huis!! Geweldige tuin en mega ruimte. Echt een aanrader voor families!',
      instructie: 'Maak de tekst formeler en professioneler voor een brochure',
      format: 'brochure',
    },
    check: (output) => {
      const informal = ['super', 'mega', 'gaaf', '!!']
      const found = informal.filter(w => output.toLowerCase().includes(w))
      if (found.length > 0) return `informele woorden nog aanwezig: ${found.join(', ')}`
      return null
    },
  },
  {
    name: 'V4 · Geen nieuwe feiten verzinnen bij verfijning',
    input: {
      tekst: 'Mooie woning aan de Molenstraat in Tholen. Lichte woonkamer en nette keuken. Bel ons voor een bezichtiging.',
      instructie: 'Voeg een zin over de badkamer toe',
      format: 'funda',
    },
    check: (output) => {
      // AI mag NIET een specifieke badkamer beschrijving verzinnen met details (inloopdouche etc.)
      const invented = ['inloopdouche', 'jacuzzi', 'ligbad', 'dubbele wastafel', 'vloerverwarming in de badkamer']
      const found = invented.filter(w => output.toLowerCase().includes(w))
      if (found.length > 0) return `AI verzint badkamer details: ${found.join(', ')}`
      return null
    },
  },
]

// ─── HALLUCINATION CHECKER (gedeeld) ─────────────────────────────────────────
const TRACKED_FEATURES = [
  { label: 'inloopdouche',     triggers: ['inloopdouche'] },
  { label: 'jacuzzi',          triggers: ['jacuzzi', 'whirlpool'] },
  { label: 'vloerverwarming',  triggers: ['vloerverwarming'] },
  { label: 'zonnepanelen',     triggers: ['zonnepanelen', 'zonnestroom'] },
  { label: 'airco',            triggers: ['airco', 'airconditioning'] },
  { label: 'laadpaal',         triggers: ['laadpaal'] },
  { label: 'dakkapel',         triggers: ['dakkapel'] },
  { label: 'garage',           triggers: ['garage'] },
  { label: 'balkon',           triggers: ['balkon'] },
  { label: 'zwembad',          triggers: ['zwembad'] },
  { label: 'sauna',            triggers: ['sauna'] },
  { label: 'tuin op het zuiden', triggers: ['op het zuiden', 'zuidgericht'] },
]
const INSTAPKLAAR_TRIGGERS = ['instapklaar', 'direct betrekken', 'kant-en-klaar', 'turn-key']

function checkHallucinations(input, text) {
  const lower = text.toLowerCase()
  const inputCtx = [...(input.kenmerken || []).map(k => k.toLowerCase()), (input.bijzonderheden || '').toLowerCase()].join(' ')
  const warnings = []

  for (const f of TRACKED_FEATURES) {
    const inOutput = f.triggers.some(t => lower.includes(t))
    const inInput  = f.triggers.some(t => inputCtx.includes(t))
    if (inOutput && !inInput) warnings.push(warn(`"${f.label}" in tekst maar niet opgegeven`))
  }
  if (input.staat === 'Opknapper') {
    const hit = INSTAPKLAAR_TRIGGERS.find(t => lower.includes(t))
    if (hit) warnings.push(warn(`Opknapper maar "${hit}" gevonden`))
  }
  if (input.woningtype === 'Appartement') {
    const tuinInInput = inputCtx.includes('tuin')
    if (!tuinInInput && (lower.includes('achtertuin') || lower.includes('grote tuin'))) {
      warnings.push(warn('"tuin" in appartement-tekst maar niet opgegeven'))
    }
  }
  return warnings
}

// ─── API helpers ─────────────────────────────────────────────────────────────
async function callFunda(input) {
  const res = await fetch(`${BASE_URL}/api/ai/funda-tekst`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`) }
  return res.json()
}
async function callMulti(input) {
  const res = await fetch(`${BASE_URL}/api/ai/funda-multi`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`) }
  return res.json()
}
async function callVerfijn(body) {
  const res = await fetch(`${BASE_URL}/api/ai/verfijn-tekst`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`) }
  return res.json()
}

// ─── SUITE: FUNDA-TEKST ───────────────────────────────────────────────────────
async function runFundaSuite() {
  console.log(section('SUITE 1 — funda-tekst (enkelvoudig)'))
  const results = []

  for (const tc of FUNDA_CASES) {
    process.stdout.write(`  ${C.blue}▶${C.reset} ${tc.name} `)
    const start = Date.now()
    try {
      const data = await callFunda(tc.input)
      const hallucinations = checkHallucinations(tc.input, data.tekst)
      const passed = hallucinations.length === 0
      console.log(`— ${passed ? ok(`${data.woorden}w`) : fail(`${data.woorden}w`)} ${info(`${Date.now()-start}ms`)}`)
      hallucinations.forEach(w => console.log(`     ${w}`))
      results.push({ name: tc.name, passed, warnings: hallucinations })
    } catch (e) {
      console.log(`— ${fail(e.message)}`)
      results.push({ name: tc.name, passed: false, error: e.message })
    }
  }
  return results
}

// ─── SUITE: FUNDA-MULTI ───────────────────────────────────────────────────────
const FORMATS = ['funda', 'instagram', 'facebook', 'brochure']

async function runMultiSuite() {
  console.log(section('SUITE 2 — funda-multi (4 formats in 1 call)'))
  const results = []

  for (const tc of MULTI_CASES) {
    process.stdout.write(`  ${C.blue}▶${C.reset} ${tc.name} `)
    const start = Date.now()
    try {
      const data = await callMulti(tc.input)
      const duration = Date.now() - start
      const missing = FORMATS.filter(f => !data[f] || data[f].trim().length < 10)
      if (missing.length > 0) {
        console.log(`— ${fail(`ontbrekende formats: ${missing.join(', ')}`)}`)
        results.push({ name: tc.name, passed: false, error: `Ontbrekend: ${missing.join(', ')}` })
        continue
      }

      const tabWarnings = []
      for (const fmt of FORMATS) {
        const text = data[fmt]
        const words = text.split(/\s+/).filter(Boolean).length
        const chk = tc.checks?.[fmt] || {}

        // Woord-minimum
        if (chk.minWords && words < chk.minWords)
          tabWarnings.push(warn(`[${fmt}] te kort: ${words}w (min ${chk.minWords})`))
        if (chk.maxWords && words > chk.maxWords)
          tabWarnings.push(warn(`[${fmt}] te lang: ${words}w (max ${chk.maxWords})`))

        // Verplichte inhoud
        if (chk.mustContain)
          chk.mustContain.forEach(t => { if (!text.toLowerCase().includes(t.toLowerCase())) tabWarnings.push(warn(`[${fmt}] mist verplichte inhoud: "${t}"`)) })

        // Verboden inhoud
        if (chk.mustNotContain)
          chk.mustNotContain.forEach(t => { if (text.toLowerCase().includes(t.toLowerCase())) tabWarnings.push(warn(`[${fmt}] bevat verboden inhoud: "${t}"`)) })

        // Hallucinations (per-format check)
        if (chk.noHallucination)
          chk.noHallucination.forEach(t => { if (text.toLowerCase().includes(t)) tabWarnings.push(warn(`[${fmt}] hallucination: "${t}" niet opgegeven`)) })

        // Generieke hallucination check
        const generalHallucinations = checkHallucinations(tc.input, text)
        tabWarnings.push(...generalHallucinations.map(w => `[${fmt}] ${w.slice(2).trimStart()}`).filter(Boolean).map(w => warn(w)))
      }

      const passed = tabWarnings.length === 0
      const wordCounts = FORMATS.map(f => `${f}:${data[f].split(/\s+/).filter(Boolean).length}w`).join(' ')
      console.log(`— ${passed ? ok(wordCounts) : fail(wordCounts)} ${info(`${duration}ms`)}`)
      tabWarnings.forEach(w => console.log(`     ${w}`))
      results.push({ name: tc.name, passed, warnings: tabWarnings })
    } catch (e) {
      console.log(`— ${fail(e.message)}`)
      results.push({ name: tc.name, passed: false, error: e.message })
    }
  }
  return results
}

// ─── SUITE: VERFIJN ───────────────────────────────────────────────────────────
async function runVerfijnSuite() {
  console.log(section('SUITE 3 — verfijn-tekst (AI bewerking)'))
  const results = []

  for (const tc of VERFIJN_CASES) {
    process.stdout.write(`  ${C.blue}▶${C.reset} ${tc.name} `)
    const start = Date.now()
    try {
      const data = await callVerfijn(tc.input)
      const duration = Date.now() - start
      if (!data.tekst || data.tekst.trim().length < 10) {
        console.log(`— ${fail('lege of te korte output')}`)
        results.push({ name: tc.name, passed: false, error: 'Lege output' })
        continue
      }
      const issue = tc.check(data.tekst)
      const passed = issue === null
      console.log(`— ${passed ? ok(`${data.tekst.split(/\s+/).length}w`) : fail(issue)} ${info(`${duration}ms`)}`)
      if (!passed) console.log(`     ${fail(issue)}`)
      results.push({ name: tc.name, passed, issue })
    } catch (e) {
      console.log(`— ${fail(e.message)}`)
      results.push({ name: tc.name, passed: false, error: e.message })
    }
  }
  return results
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════╗`)
  console.log(`║   Funda-tekst Test Agent v2 — Leunis Makelaars       ║`)
  console.log(`╚══════════════════════════════════════════════════════╝${C.reset}`)
  console.log(info(`Endpoint: ${BASE_URL}  |  Suite: ${SUITE}`))

  const allResults = []

  if (SUITE === 'all' || SUITE === 'funda')   allResults.push(...await runFundaSuite())
  if (SUITE === 'all' || SUITE === 'multi')   allResults.push(...await runMultiSuite())
  if (SUITE === 'all' || SUITE === 'verfijn') allResults.push(...await runVerfijnSuite())

  const passed  = allResults.filter(r => r.passed).length
  const failed  = allResults.filter(r => !r.passed).length
  const total   = allResults.length

  console.log(`\n${C.bold}${C.cyan}═══════════════════ EINDRAPPORT ══════════════════════${C.reset}`)
  console.log(`  Geslaagd : ${C.green}${passed}/${total}${C.reset}`)
  if (failed > 0) console.log(`  Mislukt  : ${C.red}${failed}/${total}${C.reset}`)
  console.log()

  if (failed > 0) {
    console.log(`${C.bold}${C.yellow}Aandachtspunten:${C.reset}`)
    allResults.filter(r => !r.passed).forEach(r => {
      console.log(`  ${C.yellow}${r.name}${C.reset}`)
      if (r.error)    console.log(`    ${fail(r.error)}`)
      if (r.issue)    console.log(`    ${fail(r.issue)}`)
      if (r.warnings) r.warnings.forEach(w => console.log(`    ${w}`))
    })
    console.log()
    process.exit(1)
  } else {
    console.log(`${C.green}${C.bold}Alle ${total} tests geslaagd ✓${C.reset}\n`)
  }
}

main().catch(e => { console.error(fail('Onverwachte fout: ' + e.message)); process.exit(1) })


