#!/usr/bin/env node
/**
 * Injects the homepage JSON-LD @graph (Person / ProfilePage / WebSite) into index.html.
 * Idempotent: replaces any previously generated block. Run as part of npm run build
 * (after build:data, which writes bio.json/skills.json).
 */
const fs = require('fs');
const path = require('path');
const { injectJsonLd, personGraph, toText } = require('./lib/seo');

const ROOT = path.resolve(__dirname, '..');

function loadJSON(rel, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  } catch {
    return fallback;
  }
}

const bio = loadJSON(path.join('data', 'bio.json'), {});
const skills = loadJSON(path.join('data', 'skills.json'), []);
const skillNames = (Array.isArray(skills) ? skills : []).map((s) => toText(s.Name)).filter(Boolean);

const indexPath = path.join(ROOT, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const out = injectJsonLd(html, personGraph({ bio, skillNames }));
fs.writeFileSync(indexPath, out, 'utf8');
console.log('generate-home-jsonld: injected Person/ProfilePage/WebSite @graph into index.html');
