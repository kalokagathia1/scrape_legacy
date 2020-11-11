const fs = require("fs");
const path = require("path");
const Pool = require("piscina");
const { format, writeToPath } = require("fast-csv");
const processObit = require("./util/process_obit");

// const outDir = path.join(".", "output", Pool.workerData.dataset);
const outDir = path.join(".", "output");
// if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const outfile = path.join(outDir, `${Math.random().toString(16).slice(2)}.csv`);

const fstream = fs.createWriteStream(outfile);
const csv = format();
csv.pipe(fstream);

// csv.write([
//   "id",
//   "name",
//   "salutation",
//   "firstName",
//   "middleName",
//   "lastName",
//   "generation",
//   "suffix",
//   "aliases",
//   "age",
//   "dob",
//   "dod",
//   "birthYear",
//   "deathYear",
//   "location",
//   "obitlink",
// ]);

module.exports = async function run({ dataset, file }) {
  const dirty = JSON.parse(fs.readFileSync(file), "utf-8");
  const json = processObit(dirty);

  if (!json) return;

  if (
    !csv.write([
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
    ])
  ) {
    await new Promise((resolve) => csv.once("drain", resolve));
  }

  // return new Promise((resolve, reject) => {
  //   console.log("WRITING", outfile);
  //   // csv.write([
  //   writeToPath(outfile, [
  //     json.id,
  //     json.name,
  //     json.salutation,
  //     json.firstName,
  //     json.middleName,
  //     json.lastName,
  //     json.generation,
  //     json.suffix,
  //     json.aliases && json.aliases.join("|"),
  //     json.age,
  //     json.dob,
  //     json.dod,
  //     json.birthYear,
  //     json.deathYear,
  //     json.location,
  //     json.obitlink,
  //   ])
  //     .on("error", reject)
  //     .on("finish", resolve);
  // });
};
