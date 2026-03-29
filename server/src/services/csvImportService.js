import fs from "fs";
import path from "path";
import csv from "csv-parser";
import District from "../models/District.js";
import Mandal from "../models/Mandal.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const normalizeDistrictName = (name) => {
  if (!name) return '';
  // Simply trim and normalize whitespace - corrected CSV files have consistent naming
  return name.trim().replace(/\s+/g, ' ');
};

/**
 * Import districts from CSV to MongoDB
 */
export const importDistricts = async (force = false) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (force) {
        await District.deleteMany({});
      } else {
        // Check if districts already exist
        const existingCount = await District.countDocuments();
        if (existingCount > 0) {
          console.log(`✅ Districts already imported: ${existingCount} records`);
          return resolve(`Districts: ${existingCount} records found`);
        }
      }

      const csvPath = path.join(__dirname, "../../data/AP_Regions_Districts.csv");

      if (!fs.existsSync(csvPath)) {
        return reject(new Error(`CSV file not found at ${csvPath}`));
      }

      const districts = [];

      fs.createReadStream(csvPath)
        .pipe(csv())
        .on("data", (row) => {
          // Map CSV columns to schema fields
          const districtName = normalizeDistrictName(row.District || row.district || "");
          const districtData = {
            code: row.Code || row.code || districtName.toLowerCase().replace(/\s+/g, "_"),
            district: districtName,
            region: row.Region || row.region || "",
            mandalCount: parseInt(row.MandalCount || row.Mandal_Count || "0") || 0,
            coordinates: {
              lat: parseFloat(row.Latitude || row.lat) || null,
              lng: parseFloat(row.Longitude || row.lng) || null,
            },
          };

          if (districtData.district) {
            districts.push(districtData);
          }
        })
        .on("end", async () => {
          try {
            if (districts.length === 0) {
              return reject(new Error("No districts found in CSV"));
            }

            // Insert all districts
            const result = await District.insertMany(districts, { ordered: false });
            console.log(`✅ Imported ${result.length} districts`);
            resolve(`Districts: ${result.length} records imported`);
          } catch (err) {
            reject(new Error(`Error inserting districts: ${err.message}`));
          }
        })
        .on("error", (err) => {
          reject(new Error(`Error reading districts CSV: ${err.message}`));
        });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Import mandals from CSV to MongoDB
 */
export const importMandals = async (force = false) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (force) {
        await Mandal.deleteMany({});
      } else {
        // Check if mandals already exist
        const existingCount = await Mandal.countDocuments();
        if (existingCount > 0) {
          console.log(`✅ Mandals already imported: ${existingCount} records`);
          return resolve(`Mandals: ${existingCount} records found`);
        }
      }

      const csvPath = path.join(__dirname, "../../data/AP_Mandals_Full_681.csv");

      if (!fs.existsSync(csvPath)) {
        return reject(new Error(`CSV file not found at ${csvPath}`));
      }

      const mandals = [];

      fs.createReadStream(csvPath)
        .pipe(csv())
        .on("data", (row) => {
          // Map CSV columns to schema fields
          const mandalData = {
            name: (row.Mandal || row.mandal || "").trim(),
            district: normalizeDistrictName(row.District || row.district || ""),
            region: row.Revenue_Division || row.Region || row.region || "",
            pincode: row.Pincode || row.pincode || "",
            coordinates: {
              lat: parseFloat(row.Latitude) || null,
              lng: parseFloat(row.Longitude) || null,
            },
          };

          if (mandalData.name && mandalData.district) {
            mandals.push(mandalData);
          }
        })
        .on("end", async () => {
          try {
            if (mandals.length === 0) {
              return reject(new Error("No mandals found in CSV"));
            }

            // Insert all mandals
            const result = await Mandal.insertMany(mandals, { ordered: false });
            console.log(`✅ Imported ${result.length} mandals`);

            // Update district mandal counts based on actual mandals
            const counts = await Mandal.aggregate([
              { $group: { _id: '$district', count: { $sum: 1 } } }
            ]);
            const bulkOps = counts.map(item => ({
              updateOne: {
                filter: { district: item._id },
                update: { $set: { mandalCount: item.count } },
                upsert: true,
              }
            }));
            if (bulkOps.length > 0) {
              await District.bulkWrite(bulkOps, { ordered: false });
            }

            resolve(`Mandals: ${result.length} records imported`);
          } catch (err) {
            reject(new Error(`Error inserting mandals: ${err.message}`));
          }
        })
        .on("error", (err) => {
          reject(new Error(`Error reading mandals CSV: ${err.message}`));
        });
    } catch (err) {
      reject(err);
    }
  });
};
