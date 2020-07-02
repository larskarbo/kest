const api = require("./sbankenapi.js");

export const getTransactions = async () => {
	const token = (await api.getAccessToken()).access_token;
	// console.log('token: ', token);
	const acc = await getBankAccount();

	const accId = acc.accountId;
	// console.log("accId: ", accId);

	const trans = await api.getAccountTransactions(accId, token);
	return trans.items;
};

export const getBankAccount = async () => {
	const token = (await api.getAccessToken()).access_token;
	// console.log('token: ', token);
	const accs = await api.getAccountDetails(token);
	// console.log("acc: ", acc);
	const acc = accs.items.find((i) => i.name == "asdfbruk");

	return acc;
};

export const startPolling = async (onNewTransaction) => {
	let oldTransactions = (await getTransactions()).map(t => t.amount)
	setInterval(async () => {
		const trans = await getTransactions();
		const transAmounts = trans.map(t => t.amount)
		if(JSON.stringify(transAmounts) != JSON.stringify(oldTransactions)){
			console.log(trans[0])
			onNewTransaction(trans[0])
		}
		oldTransactions = transAmounts
		//todo what if two transactions happened in the same window?
	}, 15000)
};
