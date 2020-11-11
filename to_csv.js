const fs = require("fs");
const path = require("path");
const { format } = require("fast-csv");
const processObit = require("./util/process_obit");

const dataset = process.argv[2];
if (!dataset) {
  console.error("No dataset name");
  process.exit(0);
}

const datasetDir = path.join(".", "results", dataset, "obits");
const fstream = fs.createWriteStream(path.join(".", `${dataset}.csv`));

const csv = format();
csv.pipe(fstream);

const files = fs.readdirSync(datasetDir);

csv.write([
  "id",
  "name",
  "salutation",
  "firstName",
  "middleName",
  "lastName",
  "generation",
  "suffix",
  "aliases",
  "age",
  "dob",
  "dod",
  "birthYear",
  "deathYear",
  "location",
  "obitlink",
]);

for (const f of files) {
  const dirty = JSON.parse(fs.readFileSync(path.join(datasetDir, f), "utf-8"));

  const json = processObit(dirty);

  if (!json) continue;

  csv.write([
    json.id,
    json.name,
    json.salutation,
    json.firstName,
    json.middleName,
    json.lastName,
    json.generation,
    json.suffix,
    json.aliases && json.aliases.join("|"),
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
