const { get, pick } = require("lodash");
const { DateTime } = require("luxon");
const extractDates = require("extract-date").default;
const nameparts = require("nameparts");
const obits = require("./test.json");

for (const o of obits) {
  if (!o.id) continue;
  const { name, obithtml: html } = o;

  // let prefix, firstname, lastname, middlename, nickname, suffix;
  // const names = name.split(/\s+/).map((x) => x.replace(/\*/g, ""));
  // firstname = names[0];
  // if (names[0].match(/\./);

  // Name
  const details = {
    name,
    ...pick(nameparts(name), ["salutation", "firstName", "middleName", "lastName", "generation", "suffix", "aliases"]),
  };

  if (details.middleName && ~details.middleName.indexOf("(")) {
    details.aliases = details.aliases || [];
    details.aliases.push(details.middleName.replace(/\(|\)/g, ""));
    details.middleName = null;
  }
  if (details.lastName) details.lastName = details.lastName.replace(/\*/g, "");

  // Age
  let maybeAge;
  let age = get(html.match(/age\s+((\d+?))(\D|$)/i), "[1]");
  if (!age) {
    maybeAge = get(html.match(/,\s+((\d+?))(\D|$)/i), "[1]");
    if (maybeAge) maybeAge = parseInt(maybeAge, 10);
    if (maybeAge >= 1 && maybeAge <= 130) age = maybeAge;
  }
  if (!isNaN(parseInt(age, 10))) age = parseInt(age, 10);

  // let birthStr = "";
  // let dob = "";
  // birthStr = get(html.match(/born\s+on\s+(.+?\d{4})/s), "[1]");
  // if (birthStr) {
  //   const formats = ["cccc LLLL d, yyyy", "LLLL d, yyyy"];

  //   for (const format of formats) {
  //     dob = DateTime.fromFormat(birthStr, format);
  //     if (!dob.invalid) {
  //       dob = dob.toISODate();
  //       break;
  //     }
  //   }
  // }

  // Dates
  let dob, dod;
  const dates = extractDates(html, { direction: "MDY", locale: "en" });
  dates
    .map((x) => x.date)
    .forEach((s) => {
      const date = DateTime.fromISO(s);
      if (date.invalid) return;
      // console.log(name, o.id, date.year);

      if (!dob && date.year < 2002) dob = date.toISODate();
      if (!dod && date.year >= 2002) dod = date.toISODate();
    });

  if (!age && dob) {
    age = Math.floor(DateTime.local().diff(DateTime.fromISO(dob), "years").toObject().years, 10);
  }

  let birthYear;
  let deathYear;
  if (o.nametitle.match(/\d{4}/)) {
    const matches = o.nametitle.match(/(\d{4})/g);
    matches.forEach((m) => {
      if (!dob && m < 2018) birthYear = m;
      if (!dod && m >= 2018) deathYear = m;
    });
  }

  if (!birthYear && dob) birthyear = DateTime.fromISO(dob).year;
  if (!deathYear && dod) deathYear = DateTime.fromISO(dod).year;

  if (age && dod && !dob) {
    birthYear = DateTime.fromISO(dod).minus({ years: age }).year;
  }

  if (age && dob && !dod) {
    deathYear = DateTime.fromISO(dob).plus({ years: age }).year;
  }

  // Location
  let location;
  location = get(html.match(/,\s+of\s+(.+?)(?:died|passed)/), "[1]");
  if (location) location = location.trim().replace(/,$/, "").split(/,/)[0];

  console.log({
    id: o.id,
    ...details,
    age,
    // birthString: birthStr || "",
    // dob: dob || "",
    dob,
    dod,
    birthYear,
    deathYear,
    location,
  });
}
