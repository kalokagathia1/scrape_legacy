const fs = require("fs");
const path = require("path");
const { find } = require("lodash");
const { format } = require("fast-csv");
const oldest = require("../oldest.json");
const all = require("../epsilon_p02_202011092141.json");

const dataset = process.argv[2];
if (!dataset) {
  console.error("No dataset name");
  process.exit(0);
}

const inDir = path.join(".", "results", dataset, "obits");
const outDir = path.join(".", "results", dataset, "obits_processed");

const files = fs.readdirSync(inDir);

for (const f of files) {
  const json = JSON.parse(fs.readFileSync(path.join(datasetDir, f)));

  csv.write([
    json.id,
    json.name,
    json.salutation,
    json.firstName,
    json.middleName,
    json.lastName,
    json.generation,
    json.suffix,
    json.aliases,
    json.age,
    json.dob,
    json.dod,
    json.birthYear,
    json.deathYear,
    json.location,
    json.obitlink,
  ]);
}

csv.end();
