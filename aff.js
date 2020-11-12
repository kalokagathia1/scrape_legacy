const { find } = require("lodash");
const states = require("./states.json");

const state = process.argv[2];
const stateId = find(states, (x) => x.state.toLowerCase() === state.toLowerCase()).id;

function getAffiliateIds() {
  const all = require("./affiliates.json");

  const affiliates = all.Legacy.Affiliates.Affiliate.filter((x) => x._StateId === stateId);

  return affiliates.map((x) => x._Id);
}

console.log(getAffiliateIds());
