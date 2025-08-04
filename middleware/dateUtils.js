const parseDate = (value) => {
  return new Date(value);
};

const convertDates = (obj) => {
  const dateFields = ["date", "validFrom", "validTo", "licenseIssueDate"];
  dateFields.forEach((field) => {
    if (obj[field]) {
      obj[field] = parseDate(obj[field]);
    }
  });
  return obj;
};

module.exports = { parseDate, convertDates };
