const fs = require("fs");
const globby = require("globby");

const dataset = process.argv[2];
if (!dataset) {
  console.log(`No dataset`);
  process.exit(0);
}

const outstream = fs.createWriteStream(`./${dataset}_legacy_obits.csv`);

outstream.write(
  `"id","name","salutation","firstName","middleName","lastName","generation","suffix","aliases","age","dob","dod","birthYear","deathYear","location","link","text"\n`
);

async function run() {
  const files = (await globby("output/*.csv")).filter((x) => !~x.indexOf("head"));

  // await Promise.all(
  //   files.map(async (file) => {
  //     const contents = fs.readFileSync(file, "utf-8") + "\n";

  //     if (!outstream.write(contents)) {
  //       await new Promise((resolve) => outstream.once("drain", resolve));
  //     }
  //   })
  // );

  for (const file of files) {
    const contents = fs.readFileSync(file, "utf-8") + "\n";

    if (!outstream.write(contents)) {
      await new Promise((resolve) => outstream.once("drain", resolve));
    }
  }

  outstream.end();
}

run();
