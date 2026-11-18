#!/usr/bin/env node
// Gate CI « npm audit » avec liste d'exceptions explicite.
//
// Usage (depuis frontend/) :
//   npm audit --omit=dev --json | node ../scripts/npm-audit-gate.mjs audit-allowlist.json
//
// Échoue (exit 1) si :
//   - un avis high/critical n'est pas dans la liste d'exceptions ;
//   - une exception a dépassé sa date `reviewBy` (la revoir, la prolonger ou la retirer).
// Avertit (sans échouer) si une exception ne correspond plus à aucun avis remonté :
// elle est périmée et doit être retirée.
import { readFileSync } from 'node:fs';

const BLOCKING = new Set(['high', 'critical']);

const allowlistPath = process.argv[2];
if (!allowlistPath) {
  console.error('usage: npm audit --json | node npm-audit-gate.mjs <allowlist.json>');
  process.exit(2);
}

const report = JSON.parse(readFileSync(0, 'utf8'));
if (report.error) {
  console.error(`npm audit a échoué : ${JSON.stringify(report.error)}`);
  process.exit(2);
}
const { advisories: allowed = [] } = JSON.parse(readFileSync(allowlistPath, 'utf8'));
const allowedById = new Map(allowed.map((entry) => [entry.id, entry]));

// Les avis sont les objets de `via` ; les chaînes de `via` ne sont que des renvois
// transitifs vers un autre paquet, déjà comptés à sa propre entrée.
const advisories = new Map();
for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vuln.via ?? []) {
    if (typeof via !== 'object' || !BLOCKING.has(via.severity)) continue;
    const id = String(via.url ?? via.source).split('/').pop();
    advisories.set(id, { id, name: via.name, severity: via.severity, title: via.title, range: via.range });
  }
}

const today = new Date().toISOString().slice(0, 10);
const failures = [];
for (const adv of advisories.values()) {
  const entry = allowedById.get(adv.id);
  const label = `${adv.id} ${adv.name} ${adv.range} (${adv.severity}) : ${adv.title}`;
  if (!entry) {
    failures.push(`NON AUTORISÉ  ${label}`);
  } else if (!entry.reviewBy || entry.reviewBy < today) {
    failures.push(`EXCEPTION EXPIRÉE (reviewBy ${entry.reviewBy ?? 'absent'})  ${label}`);
  } else {
    console.log(`exception     ${label} — revue avant ${entry.reviewBy}`);
  }
}

for (const entry of allowed) {
  if (!advisories.has(entry.id)) {
    console.log(`::warning::Exception périmée : ${entry.id} (${entry.package}) n'est plus remonté par npm audit, retirer l'entrée de ${allowlistPath}.`);
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} avis high/critical bloquant(s) :`);
  for (const line of failures) console.error(`  ${line}`);
  process.exit(1);
}
console.log(`\nOK : ${advisories.size} avis high/critical, tous couverts par une exception valide.`);
