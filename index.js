const fs = require("fs");
const path = require("path");
const Bottleneck = require("bottleneck");
const got = require("got");
const mkdirp = require("mkdirp");
const { get, find, first } = require("lodash");
const processObit = require("./util/process_obit");
const config = require("./config.json");
const states = require("./states.json");

const state = process.argv[2];
if (!state) {
  console.error("No state specified");
  process.exit(0);
}
const stateId = find(states, (x) => x.state.toLowerCase() === state.toLowerCase()).id;

const resultsDir = path.join(".", "results", state.toLowerCase());

const limiter = new Bottleneck({
  minTime: 125,
});

function makeUrl({ page, affId = 0 }) {
  // return `https://www.legacy.com/obituaries/inquirer/obituary-search.aspx?daterange=88888&startdate=20180101&enddate=20201102&countryid=1&stateid=${stateId}&affiliateid=${affiliate}`;
  return `https://www.legacy.com/obituaries/legacy/api/obituarysearch?&affiliateid=${affId}&countryid=1&daterange=88888&stateid=${stateId}&townname=&keyword=&startdate=20180101&enddate=20201102&entriesperpage=10&page=${page}&previousDateType=0&position=undefined`;
}

async function rawRequest({ page, affId }) {
  const url = makeUrl({ page, affId });

  try {
    const result = await got(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36",
      },
    }).json();

    return result;
  } catch (e) {
    console.log(e);
    process.exit(0);
  }
}

const request = limiter.wrap(rawRequest);

async function processEntry({ affId, page, obit }) {
  try {
    if (!obit.id) return;

    const id = `${obit.name.replace(/(\s+)/g, "_").replace(/\W/g, "").toLowerCase()}_${obit.id}`;

    const obitFile = path.join(resultsDir, affId, "obits", `${id}.json`);
    if (fs.existsSync(obitFile)) return;

    // Get person's name parts
    const { name, obitlink, obithtml } = obit;

    try {
      // const result = {
      //   id: obit.id,
      //   page,
      //   name,
      //   nametitle: obit.nametitle,
      //   obitlink,
      //   obithtml,
      // };
      const result = processObit(obit);

      fs.writeFileSync(obitFile, JSON.stringify(result, null, 4));

      console.log(`   Page AFF${affId} - ${page} -- ${id}`);
    } catch (e) {
      console.log("PROBLEM", e);
      return;
    }
  } catch (err) {
    console.log(id, err);
  }
}

async function runPage({ page, affId, numPageRemaining }) {
  const pageFile = path.join(resultsDir, affId, "pages", `page${page}.json`);

  let result;
  if (fs.existsSync(pageFile)) {
    console.log(`Skipping AFF${affId} - ${page}...`);
    return;
  }

  result = await request({ page, affId });
  console.log(`Got page AFF${affId} -  ${page}/${numPageRemaining}`);

  fs.writeFileSync(pageFile, JSON.stringify(result, null, 4));
  // }

  await Promise.all(result.Entries.map((obit) => processEntry({ affId, page, obit })));

  console.log(`   Done with page AFF${affId} - ${page}`);
}

const fillRange = (start, end) => {
  return Array(end - start + 1)
    .fill()
    .map((item, index) => start + index);
};

function getAffiliateIds() {
  const all = require("./affiliates.json");

  const affiliates = all.Legacy.Affiliates.Affiliate.filter((x) => x._StateId === stateId);

  return affiliates.map((x) => x._Id);
}

async function run() {
  await mkdirp(resultsDir);

  let affiliateIds = getAffiliateIds();
  affiliateIds = affiliateIds.filter((x) => x.toString() !== "1031");
  console.log("affiliateIds", affiliateIds.join(" "));

  await Promise.all(affiliateIds.map((a) => mkdirp(path.join(resultsDir, a, "pages"))));
  await Promise.all(affiliateIds.map((a) => mkdirp(path.join(resultsDir, a, "obits"))));

  for (const affId of affiliateIds) {
    const firstResult = await request({ page: 1, affId });
    const numPageRemaining = firstResult.NumPageRemaining;

    console.log(`Running AFF${affId} - ${numPageRemaining} pages`);

    await Promise.all(
      fillRange(1, numPageRemaining).map(async (page) => {
        await runPage({ page, affId, numPageRemaining });
      })
    );
  }
}

run();
