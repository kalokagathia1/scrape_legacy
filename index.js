const fs = require("fs");
const path = require("path");
const Bottleneck = require("bottleneck");
const got = require("got");
const mkdirp = require("mkdirp");
const { get, find, first } = require("lodash");
const processObit = require("./util/process_obit");
const config = require("./config.json");
const states = require("./states.json");

let { state, affiliate } = config;
if (!affiliate) affiliate = "all";
const stateId = find(states, (x) => x.state.toLowerCase() === state.toLowerCase()).id;

const resultsDir = path.join(".", "results", state.toLowerCase());
const pagesDir = path.join(resultsDir, "pages");
const obitsDir = path.join(resultsDir, "obits");

const limiter = new Bottleneck({
  minTime: 500,
});

function makeUrl({ page }) {
  // return `https://www.legacy.com/obituaries/inquirer/obituary-search.aspx?daterange=88888&startdate=20180101&enddate=20201102&countryid=1&stateid=${stateId}&affiliateid=${affiliate}`;
  return `https://www.legacy.com/obituaries/inquirer/api/obituarysearch?&affiliateid=${affiliate}&countryid=1&daterange=88888&stateid=${stateId}&townname=&keyword=&startdate=20180101&enddate=20201102&entriesperpage=10&page=${page}&previousDateType=0&position=undefined`;
}

async function rawRequest({ page }) {
  const url = makeUrl({ page });

  try {
    const result = await got(url).json();

    return result;
  } catch (e) {
    console.log(e.response.body);
  }
}

const request = limiter.wrap(rawRequest);

async function processEntry({ page, obit }) {
  try {
    if (!obit.id) return;

    const id = `${obit.name.replace(/(\s+)/g, "_").replace(/\W/g, "").toLowerCase()}_${obit.id}`;

    const obitFile = path.join(obitsDir, `${id}.json`);
    if (fs.existsSync(obitFile)) return;

    // Get person's name parts
    const { name, obitlink, obithtml } = obit;

    const result = processObit({
      id: obit.id,
      page,
      name,
      nametitle: obit.nametitle,
      obitlink,
      obithtml,
    });

    fs.writeFileSync(obitFile, JSON.stringify(result, null, 4));

    console.log(`   Page ${page} -- ${id}`);
  } catch (err) {
    console.log(id, err);
  }
}

async function runPage(page) {
  const pageFile = path.join(pagesDir, `page${page}.json`);

  let result;
  if (fs.existsSync(pageFile)) {
    result = JSON.parse(fs.readFileSync(pageFile, "utf-8"));
  } else {
    result = await request({ page });

    fs.writeFileSync(pageFile, JSON.stringify(result, null, 4));
  }

  await Promise.all(result.Entries.map((obit) => processEntry({ page, obit })));

  console.log(`Done with page ${page}`);
}

const fillRange = (start, end) => {
  return Array(end - start + 1)
    .fill()
    .map((item, index) => start + index);
};

async function run() {
  await mkdirp(resultsDir);
  await mkdirp(pagesDir);
  await mkdirp(obitsDir);

  const firstResult = await request({ page: 1 });
  const numPageRemaining = firstResult.NumPageRemaining;

  await Promise.all(
    fillRange(1, numPageRemaining).map(async (page) => {
      await runPage(page);
    })
  );
}

run();
