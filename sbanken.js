const api = require("./sbankenapi.js");

const hey = async () => {
  const token = (await api.getAccessToken()).access_token;
  // console.log('token: ', token);
  const acc = await api.getAccountDetails(token);
  // console.log("acc: ", acc);

  const accId = acc.items.find((i) => i.name == "asdfbruk").accountId;
  // console.log("accId: ", accId);

  const trans = await api.getAccountTransactions(accId, token);
	return trans.items
};

module.exports = hey
