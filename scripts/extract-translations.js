#!/usr/bin/env node

/**
 * Script pour extraire les chaînes de caractères à traduire dans le projet
 * 
 * Usage: node extract-translations.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const config = {
  frontendDir: path.resolve(__dirname, '../frontend'),
  backendDir: path.resolve(__dirname, '../backend'),
  outputFile: path.resolve(__dirname, '../translation_keys.json'),
  frontendPatterns: [
    '**/*.tsx',
    '**/*.ts',
    '!**/node_modules/**',
    '!**/.next/**'
  ],
  backendPatterns: [
    '**/*.java',
    '!**/target/**'
  ],
  frontendRegexes: [
    /t\(['"]([^'"]+)['"]\)/g,                      // t('key')
    /useTranslation\(['"]([^'"]+)['"]\)/g,         // useTranslation('namespace')
    /Trans i18nKey=['"]([^'"]+)['"]/g,             // <Trans i18nKey="key" />
    /i18n\.t\(['"]([^'"]+)['"]/g                   // i18n.t('key')
  ],
  backendRegexes: [
    /messageUtil\.getMessage\(['"]([^'"]+)['"]/g,   // messageUtil.getMessage("key")
    /messageSource\.getMessage\(['"]([^'"]+)['"]/g  // messageSource.getMessage("key")
  ]
};

// Fonction pour trouver les fichiers récursivement selon les patterns
function findFiles(baseDir, patterns) {
  const options = {
    cwd: baseDir,
    absolute: true
  };
  
  let allFiles = [];
  
  patterns.forEach(pattern => {
    const files = glob.sync(pattern, options);
    allFiles = allFiles.concat(files);
  });
  
  return allFiles;
}

// Fonction pour extraire les clés de traduction d'un fichier
function extractKeysFromFile(filePath, regexes) {
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = new Set();
  
  regexes.forEach(regex => {
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[1]) {
        keys.add(match[1]);
      }
    }
  });
  
  return Array.from(keys);
}

// Fonction principale
async function main() {
  console.log('Extraction des clés de traduction...');
  
  const results = {
    frontend: {
      files: 0,
      keys: new Set()
    },
    backend: {
      files: 0,
      keys: new Set()
    }
  };
  
  // Trouver les fichiers et extraire les clés du frontend
  console.log('Analyse des fichiers frontend...');
  const frontendFiles = findFiles(config.frontendDir, config.frontendPatterns);
  
  frontendFiles.forEach(file => {
    results.frontend.files++;
    const keys = extractKeysFromFile(file, config.frontendRegexes);
    keys.forEach(key => results.frontend.keys.add(key));
  });
  
  // Trouver les fichiers et extraire les clés du backend
  console.log('Analyse des fichiers backend...');
  const backendFiles = findFiles(config.backendDir, config.backendPatterns);
  
  backendFiles.forEach(file => {
    results.backend.files++;
    const keys = extractKeysFromFile(file, config.backendRegexes);
    keys.forEach(key => results.backend.keys.add(key));
  });
  
  // Préparer les résultats
  const output = {
    summary: {
      frontendFiles: results.frontend.files,
      backendFiles: results.backend.files,
      totalFiles: results.frontend.files + results.backend.files,
      frontendKeys: results.frontend.keys.size,
      backendKeys: results.backend.keys.size,
      totalKeys: results.frontend.keys.size + results.backend.keys.size
    },
    frontendKeys: Array.from(results.frontend.keys).sort(),
    backendKeys: Array.from(results.backend.keys).sort()
  };
  
  // Sauvegarder les résultats
  fs.writeFileSync(config.outputFile, JSON.stringify(output, null, 2));
  
  console.log('Résultat:');
  console.log(`- Frontend: ${output.summary.frontendFiles} fichiers, ${output.summary.frontendKeys} clés`);
  console.log(`- Backend: ${output.summary.backendFiles} fichiers, ${output.summary.backendKeys} clés`);
  console.log(`- Total: ${output.summary.totalFiles} fichiers, ${output.summary.totalKeys} clés`);
  console.log(`Les résultats ont été sauvegardés dans ${config.outputFile}`);
}

main().catch(err => {
  console.error('Une erreur est survenue:', err);
  process.exit(1); 