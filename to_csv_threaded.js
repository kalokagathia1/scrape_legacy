const fs = require("fs");
const path = require("path");
const Pool = require("piscina");
const globby = require("globby");
const intoStream = require("into-stream");
const { resolve } = require("path");
const { format } = require("fast-csv");
const processObit = require("./util/process_obit");

const dataset = process.argv[2];

const pool = new Pool({
  filename: resolve(__dirname, "to_csv_worker.js"),
  maxQueue: "auto",
  workerData: {
    dataset,
  },
});

const outDir = path.join(".", "output");
if (fs.existsSync(outDir)) fs.rmdirSync(outDir, { recursive: true });
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

if (!dataset) {
  console.error("No dataset name");
  process.exit(0);
}

// Write header file
fs.writeFileSync(
  path.join(outDir, "head.csv"),
  `"id","name","salutation","firstName","middleName","lastName","generation","suffix","aliases","age","dob","dod","birthYear","deathYear","location","link","text"\n`
);

async function run() {
  const datasetDir = path.join(".", "results", dataset);
  console.log("DATASET", datasetDir);
  const files = (await globby(path.join(datasetDir, "**", "*.json"))).filter((x) => !~x.indexOf("/pages/"));

  const dirStream = intoStream(files);

  pool.on("drain", () => {
    if (dirStream.isPaused()) {
      // console.log("resuming...", pool.queueSize);
      dirStream.resume();
    }
  });

  dirStream
    .on("data", (buf) => {
      const file = buf.toString();

      pool
        .runTask({ dataset, file })
        .then(() => {
          // console.log(`Done: ${file}`)
        })
        .catch((err) => console.log("ERR", err));

      if (pool.queueSize === pool.options.maxQueue) {
        // console.log("pausing...", pool.queueSize);
        dirStream.pause();
      }
    })
    .on("error", console.error)
    .on("end", () => {
      console.log("DONE READING!");
    });
}

run();
