#!/usr/bin/env node
/**
 * Funda-tekst Test Agent
 * Roept de live API aan met diverse woningen en controleert op hallucinations.
 *
 * Gebruik:
 *   node scripts/test-funda-agent.mjs
 *   BASE_URL=http://localhost:3000 node scripts/test-funda-agent.mjs
 */

const BASE_URL = process.env.BASE_URL || 'https://portal.brandiscode.com'

// ─── KLEUREN ────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
}
const ok = (s) => `${C.green}✓${C.reset} ${s}`
const warn = (s) => `${C.yellow}⚠${C.reset}  ${s}`
const fail = (s) => `${C.red}✗${C.reset} ${s}`
const info = (s) => `${C.gray}${s}${C.reset}`

// ─── TESTCASES ───────────────────────────────────────────────────────────────
const TEST_CASES = [
  {
    name: '1 · Minimaal (alleen verplichte velden, geen kenmerken)',
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
    name: '2 · Volledig ingevuld vrijstaand zonder foto',
    input: {
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
      lengte: 'uitgebreid',
    },
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
    name: '5 · Opknapper (mag geen "instapklaar" taal bevatten)',
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

// ─── HALLUCINATION CHECKER ───────────────────────────────────────────────────
// Features die ALLEEN in de tekst mogen staan als ze ook in kenmerken/bijzonderheden staan
const TRACKED_FEATURES = [
  { label: 'inloopdouche',     triggers: ['inloopdouche'] },
  { label: 'jacuzzi',          triggers: ['jacuzzi', 'whirlpool'] },
  { label: 'vloerverwarming',  triggers: ['vloerverwarming'] },
  { label: 'zonnepanelen',     triggers: ['zonnepanelen', 'zonnestroom'] },
  { label: 'airco',            triggers: ['airco', 'airconditioning', 'klimaatinstallatie'] },
  { label: 'laadpaal',         triggers: ['laadpaal'] },
  { label: 'dakkapel',         triggers: ['dakkapel'] },
  { label: 'garage',           triggers: ['garage'] },
  { label: 'balkon',           triggers: ['balkon'] },
  { label: 'zwembad',          triggers: ['zwembad'] },
  { label: 'sauna',            triggers: ['sauna'] },
  { label: 'tuin op het zuiden', triggers: ['op het zuiden', 'zuidgericht', 'zuiden gelegen'] },
]

// Termen die op "instapklaar" wijzen — ongewenst voor opknappers
const INSTAPKLAAR_TRIGGERS = [
  'instapklaar', 'instap klaar', 'direct betrekken', 'kant-en-klaar', 'turn-key',
  'modern en stijlvol', 'modern afgewerkt',
]

function checkHallucinations(input, outputText) {
  const text = outputText.toLowerCase()
  const warnings = []

  // Verzamel alle bekende inputs
  const inputContext = [
    ...input.kenmerken.map((k) => k.toLowerCase()),
    (input.bijzonderheden || '').toLowerCase(),
    (input.staat || '').toLowerCase(),
  ].join(' ')

  // Check feature-hallucinations
  for (const feature of TRACKED_FEATURES) {
    const inOutput = feature.triggers.some((t) => text.includes(t))
    const inInput = feature.triggers.some((t) => inputContext.includes(t))
    if (inOutput && !inInput) {
      warnings.push(warn(`"${feature.label}" staat in de tekst maar was NIET opgegeven als kenmerk`))
    }
  }

  // Check: opknapper mag geen instapklaar-taal bevatten
  if (input.staat === 'Opknapper') {
    const instapMatch = INSTAPKLAAR_TRIGGERS.find((t) => text.includes(t))
    if (instapMatch) {
      warnings.push(warn(`Staat is "Opknapper" maar tekst bevat "${instapMatch}" — inconsistent`))
    }
  }

  // Check: appartement mag geen "grote tuin" of "achtertuin" bevatten tenzij opgegeven
  if (input.woningtype === 'Appartement') {
    const tuinInInput = inputContext.includes('tuin')
    const tuinInOutput = text.includes('tuin') || text.includes('achtertuin')
    if (tuinInOutput && !tuinInInput) {
      warnings.push(warn('"tuin" vermeld in tekst maar niet opgegeven voor appartement'))
    }
  }

  return warnings
}

// ─── API CALL ────────────────────────────────────────────────────────────────
async function callApi(input) {
  const res = await fetch(`${BASE_URL}/api/ai/funda-tekst`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════╗`)
  console.log(`║   Funda-tekst Test Agent — Leunis Makelaars  ║`)
  console.log(`╚══════════════════════════════════════════════╝${C.reset}`)
  console.log(info(`Endpoint: ${BASE_URL}/api/ai/funda-tekst`))
  console.log(info(`Testcases: ${TEST_CASES.length}\n`))

  const results = []

  for (const tc of TEST_CASES) {
    console.log(`${C.bold}${C.blue}▶ ${tc.name}${C.reset}`)
    const start = Date.now()

    let result = null
    let error = null

    try {
      result = await callApi(tc.input)
    } catch (e) {
      error = e.message
    }

    const duration = Date.now() - start

    if (error) {
      console.log(`  ${fail('API fout: ' + error)}`)
      results.push({ name: tc.name, passed: false, error })
      console.log()
      continue
    }

    const warnings = checkHallucinations(tc.input, result.tekst)
    const passed = warnings.length === 0

    // Samenvatting
    console.log(`  ${ok(`${result.woorden} woorden gegenereerd`)} ${info(`(${duration}ms)`)}`)

    if (warnings.length === 0) {
      console.log(`  ${ok('Geen hallucinations gedetecteerd')}`)
    } else {
      warnings.forEach((w) => console.log(`  ${w}`))
    }

    // Toon eerste 300 tekens van de tekst
    const preview = result.tekst.replace(/\n+/g, ' ').slice(0, 300)
    console.log(`  ${info(`Tekst: "${preview}…"`)}`)

    results.push({ name: tc.name, passed, warnings, woorden: result.woorden, duration })
    console.log()
  }

  // ─── EINDRAPPORT ─────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  const avgTime = Math.round(
    results.filter((r) => r.duration).reduce((s, r) => s + r.duration, 0) /
      results.filter((r) => r.duration).length
  )

  console.log(`${C.bold}${C.cyan}═══════════════ EINDRAPPORT ═══════════════${C.reset}`)
  console.log(`  Geslaagd:   ${C.green}${passed}/${results.length}${C.reset}`)
  if (failed > 0) console.log(`  Mislukt:    ${C.red}${failed}/${results.length}${C.reset}`)
  console.log(`  Gem. tijd:  ${C.gray}${avgTime}ms per aanroep${C.reset}`)
  console.log()

  if (failed > 0) {
    console.log(`${C.bold}${C.yellow}Aandachtspunten:${C.reset}`)
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ${C.yellow}${r.name}${C.reset}`)
        if (r.error) console.log(`    ${fail(r.error)}`)
        if (r.warnings) r.warnings.forEach((w) => console.log(`    ${w}`))
      })
    console.log()
    process.exit(1)
  } else {
    console.log(`${C.green}${C.bold}Alle tests geslaagd — geen hallucinations gevonden! ✓${C.reset}\n`)
  }
}

main().catch((e) => {
  console.error(fail('Onverwachte fout: ' + e.message))
  process.exit(1)
})
