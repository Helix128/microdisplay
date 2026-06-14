#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');

const packageJsonPath = resolve(projectRoot, 'package.json');
const cargoTomlPath = resolve(projectRoot, 'src-tauri', 'Cargo.toml');
const tauriConfPath = resolve(projectRoot, 'src-tauri', 'tauri.conf.json');

const { version } = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const cargoToml = readFileSync(cargoTomlPath, 'utf8');
const syncedCargoToml = cargoToml.replace(/^version = ".*"$/m, `version = "${version}"`);
if (syncedCargoToml !== cargoToml) {
  writeFileSync(cargoTomlPath, syncedCargoToml);
}

const tauriConf = readFileSync(tauriConfPath, 'utf8');
const syncedTauriConf = tauriConf.replace(/("version"\s*:\s*")([^"]+)(")/, `$1${version}$3`);
if (syncedTauriConf !== tauriConf) {
  writeFileSync(tauriConfPath, syncedTauriConf);
}
