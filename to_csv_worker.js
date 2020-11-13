const fs = require("fs");
const path = require("path");
const Pool = require("piscina");
const { format, writeToPath } = require("fast-csv");
const processObit = require("./util/process_obit");

async function initialize() {
  const csv = await new Promise((resolve) => {
    const outDir = path.join(".", "output");
    const outfile = path.join(outDir, `${Math.random().toString(16).slice(2)}.csv`);

    const fstream = fs.createWriteStream(outfile);
    const csv = format({ quote: '"', quoteColumns: true });
    csv.pipe(fstream);

    resolve(csv);
  });

  return async function run({ dataset, file }) {
    try {
      const dirty = JSON.parse(fs.readFileSync(file), "utf-8");
      let json = dirty;
      if (!json.text) json = processObit(dirty);

      if (!json) throw new Error(`No json! ${file}`);

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
          json.link,
          json.text,
        ])
      ) {
        await new Promise((resolve) => csv.once("drain", resolve));
      }
    } catch (e) {
      throw e;
    }
  };
}

module.exports = initialize();
