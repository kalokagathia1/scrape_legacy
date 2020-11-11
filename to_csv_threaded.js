const fs = require("fs");
const path = require("path");
const { resolve } = require("path");
const intoStream = require("into-stream");
const { format } = require("fast-csv");
const processObit = require("./util/process_obit");
const Pool = require("piscina");

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

const datasetDir = path.join(".", "results", dataset, "obits");

const files = fs.readdirSync(datasetDir);

const dirStream = intoStream(files);

pool.on("drain", () => {
  if (dirStream.isPaused()) {
    console.log("resuming...", pool.queueSize);
    dirStream.resume();
  }
});

dirStream
  .on("data", (buf) => {
    const file = path.join(datasetDir, buf.toString());

    pool
      .runTask({ dataset, file })
      .then(() => console.log(`Done: ${file}`))
      .catch((err) => console.log("ERR", err));

    if (pool.queueSize === pool.options.maxQueue) {
      console.log("pausing...", pool.queueSize);
      dirStream.pause();
    }
  })
  .on("error", console.error)
  .on("end", () => {
    console.log("done");
  });

// async function run() {

//   await Promise.all(files.map((file) => pool.runTask({ file: path.join(datasetDir, file) })));

//   console.log("DONE!");
// }
