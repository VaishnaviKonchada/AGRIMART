/**
 * Andhra Pradesh Districts & Mandals Database
 * Source: CSV files in server/src/data
 * - AP_Regions_Districts.csv
 * - AP_Mandals_Full_681.csv
 *
 * Backend-only dataset (no frontend hardcoding).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DISTRICTS_CSV = path.join(__dirname, 'AP_Regions_Districts.csv');
const MANDALS_CSV = path.join(__dirname, 'AP_Mandals_Full_681.csv');

const cache = {
  built: false,
  data: [],
};

const readCsv = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    return row;
  });
};

const makeCode = (districtName) => {
  const cleaned = districtName.replace(/[^a-zA-Z\s]/g, ' ').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const code = parts.map(p => p[0]).join('').toUpperCase();
  return code.slice(0, 4) || districtName.slice(0, 3).toUpperCase();
};

const buildData = () => {
  try {
    const districtsRows = readCsv(DISTRICTS_CSV);
    const mandalsRows = readCsv(MANDALS_CSV);

    console.log(`✅ Loaded ${districtsRows.length} districts from CSV`);
    console.log(`✅ Loaded ${mandalsRows.length} mandals from CSV`);

    const districtSet = new Set(
      districtsRows.map(row => row.District).filter(Boolean)
    );

    // Include districts found in mandals CSV
    mandalsRows.forEach(row => {
      if (row.District) districtSet.add(row.District);
    });

    const districtList = Array.from(districtSet).sort((a, b) => a.localeCompare(b));
    console.log(`📍 Total unique districts: ${districtList.length}`);
    console.log(`📍 Districts: ${districtList.join(', ')}`);

    const mandalsByDistrict = districtList.reduce((acc, district) => {
      acc[district] = [];
      return acc;
    }, {});

    mandalsRows.forEach(row => {
      const district = row.District;
      const mandal = row.Mandal;
      if (!district || !mandal) return;
      if (!mandalsByDistrict[district]) {
        mandalsByDistrict[district] = [];
      }
      mandalsByDistrict[district].push({
        name: mandal,
        coordinates: null,
      });
    });

    return districtList.map(district => ({
      district,
      code: makeCode(district),
      coordinates: null,
      mandals: mandalsByDistrict[district] || [],
    }));
  } catch (error) {
    console.error('❌ Error building district data:', error.message);
    return [];
  }
};

const getData = () => {
  if (!cache.built) {
    cache.data = buildData();
    cache.built = true;
  }
  return cache.data;
};

export const AP_DISTRICTS_MANDALS = getData();

export function getAllDistricts() {
  return getData().map(d => ({
    district: d.district,
    code: d.code,
    coordinates: d.coordinates,
    mandalCount: d.mandals.length,
  }));
}

export function getMandalsForDistrict(districtName) {
  const district = getData().find(
    d => d.district.toLowerCase() === districtName.toLowerCase()
  );
  return district ? district.mandals : [];
}

export function getMandalCoordinates(districtName, mandalName) {
  const district = getData().find(
    d => d.district.toLowerCase() === districtName.toLowerCase()
  );
  if (!district) return null;

  const mandal = district.mandals.find(
    m => m.name.toLowerCase() === mandalName.toLowerCase()
  );
  return mandal ? mandal.coordinates : null;
}

export function searchDistricts(keyword) {
  const lower = keyword.toLowerCase();
  return getData().filter(d =>
    d.district.toLowerCase().includes(lower) ||
    d.code.toLowerCase().includes(lower)
  ).map(d => ({
    district: d.district,
    code: d.code,
    coordinates: d.coordinates,
    mandalCount: d.mandals.length,
  }));
}

export function searchMandalsInDistrict(districtName, keyword) {
  const district = getData().find(
    d => d.district.toLowerCase() === districtName.toLowerCase()
  );
  if (!district) return [];

  const lower = keyword.toLowerCase();
  return district.mandals.filter(m =>
    m.name.toLowerCase().includes(lower)
  );
}

export default AP_DISTRICTS_MANDALS;
