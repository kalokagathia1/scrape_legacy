const Apify = require("apify");
const { find } = require("lodash");
const config = require("./config.json");
const states = require("./states.json");

let { state, affiliate } = config;
if (!affiliate) affiliate = "all";
const stateId = find(states, (x) => x.state.toLowerCase() === state.toLowerCase());

// TODO: proxylist?

Apify.main(async () => {
  // Open a named dataset
  const datasetName = state.toLowerCase();
  const dataset = await Apify.openDataset(datasetName);
  const requestQueue = await Apify.openRequestQueue(datasetName);

  const url = `https://www.legacy.com/obituaries/inquirer/obituary-search.aspx?daterange=88888&startdate=20180101&enddate=20201102&countryid=1&stateid=${stateId}&affiliateid=${affiliate}`;

  await requestQueue.addRequest({
    url,
    userData: {
      pageType: "search",
    },
  });

  const crawler = new Apify.PuppeteerCrawler({
    // requestList,
    requestQueue,

    puppeteerPoolOptions: {
      // retireInstanceAfterRequestCount: 10,
      // maxOpenPagesPerInstance: 1,
      maxConcurrency: 40,
      minConcurrency: 10,
    },

    // Here you can set options that are passed to the Apify.launchPuppeteer() function.
    launchPuppeteerOptions: {
      // For example, by adding "slowMo" you'll slow down Puppeteer operations to simplify debugging
      // slowMo: 75,
      // useChrome: true,
      // headless: true,
      // stealth: true,
      // maxConcurrency: 10, // 10
      // minConcurrency: 4, // 4
    },

    handlePageFunction: async ({ request, page }) => {
      console.log(`Processing ${request.uniqueKey}`);
      console.log(`   ${request.url}`);

      const pageType = request.userData.pageType || "";

      if (pageType === "search") {
        // #Listings

        await Apify.utils.enqueueLinks({
          selector: "a[id*=ViewAllLink]",
          userData: {
            pageType: "results",
          },
        });
      } else if (pageType === "results") {
        // TODO
      } else if (pageType === "obit") {
      }
    },

    // This function is called if the page processing failed more than maxRequestRetries+1 times.
    handleFailedRequestFunction: async ({ request }) => {
      console.log(`Request ${request.url} failed too many times`);
      await Apify.pushData({
        "#debug": Apify.utils.createRequestDebugInfo(request),
      });
    },
  });

  // Run the crawler and wait for it to finish.
  await crawler.run();

  console.log("Crawler finished.");
});
