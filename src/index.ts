import Telegraf, { Markup, Context } from "telegraf";
import axios from "axios";
import Quiz, { Alternative, Question } from "telegraf-ask";
const roundTo = require('round-to');
import { getTransactions, getBankAccount, startPolling } from "../sbanken"

var arrayChunk = require("array-chunk");

const bot = new Telegraf(process.env.KEST_MONEY_TELEGRAM_BOT_API as string);
let awaitingTransactions = []
interface Transaction {
	name: string;
	amount: number;
	fromAccount?: string;
	toAccount?: string;
	date?: Date;
}

interface Account {
	name: string;
	balance: number;
	id: string;
	medium: string;
	tags: Array<string>
}

const help = async (ctx) => {

	const os = await diff()
	if (os != 0) {
		await ctx.reply("Kest and bank not in sync: " + os + " too much in kest");
	} else {
		await ctx.reply("Kest and bank in sync!")
	}
	ctx.reply("/start /add /recalculate /overview /awaiting /latest /fillfromcolumn")
}

bot.command("start", async (ctx) => {
	// ctx.session.done = 0; // restart done counter
	// ctx.session.quiz = null;
	await ctx.reply("Welcome to the kest Bot! ⭐️");
	await help(ctx)

});

bot.use((ctx, next) => {
	// console.log(ctx)
	// ctx.reply("middleware")
	next();
});

bot.command("add", async (ctx) => {
	askAddTransaction(ctx)
});

const askAddTransaction = async (ctx: Context, answers: object = {}) => {
	const accounts: Account[] = await getAccounts();

	const questions: Question[] = [
		{
			text: "What's the name of the transaction",
			key: "name",
			validateFn: (a) => a,
			alternatives: [
				// {
				// 	text:"horse",
				// 	value:"man"
				// }
			],
		},
		{
			text: "How much was it?",
			key: "amount",
			validateFn: (a) => parseFloat(a),
			alternatives: [
				// {
				// 	text:"horse",
				// 	value:"man"
				// }
			],
		},
		{
			text: "Which account do you want to take the money from?",
			key: "account",
			alternatives: accounts
				.filter(a => a.medium == "kest")
				.filter(a => !a.tags.includes("hide"))
				.filter(a => !a.tags.includes("lt"))
				.map((a) => ({
					text: a.name,
					value: a.id,
				})),
		},
	];

	const quiz = new Quiz({
		questions: questions,
		answers: answers,
		ctx: ctx,
		bot: bot,
	});
	quiz.startQuiz(async (answers: any) => {
		const transaction: Transaction = {
			name: answers.name,
			amount: parseFloat(answers.amount),
			fromAccount: answers.account,
		};
		await ctx.reply("Updating db");
		const preAccount = (await getAccounts()).find(a => a.id == answers.account)
		await axios.post("http://localhost:4494/addTransaction", transaction);
		const postAccount = (await getAccounts()).find(a => a.id == answers.account)
		await ctx.reply(`${preAccount.name} went from ${preAccount.balance} → ${postAccount.balance}`);
		help(ctx)

	});
}

const keyboard = (accounts: Account[]) => {
	return Markup.inlineKeyboard(
		arrayChunk(
			accounts
				.filter(a => a.medium == "kest")
				.filter(a => a.tags.includes("common"))
				.map((account) => {
					if (!account.id) {
						throw new Error("please add id!");
					}
					return Markup.callbackButton(`${account.name} - ${account.balance}kr`, account.id);
				}),
			2
		)
	);
};

const getAccounts = async () => {
	return axios.get("http://localhost:4494/accounts")
		.then(a => a.data.accounts)
		.then(accounts => {
			return accounts
				.map(a => ({
					...a,
					name: (a.icon || "") + a.name,
				}))
		})
};

bot.command("recalculate", async (ctx) => {
	await axios.get("http://localhost:4494/reCalculateAccounts");
	ctx.reply("done");
});

bot.command("fillfromcolumn", async (ctx) => {
	await axios.get("http://localhost:4494/fillFromColumn");
	ctx.reply("done");
});

bot.command("latest", async (ctx) => {

	// setTimeout(async () => {
	const t: Array<any> = await getTransactions();
	const lastT = t.shift()

	const trans: Transaction = {
		name: lastT.text,
		amount: lastT.amount * -1
	}
	// if(false){
	askAddTransaction(ctx, trans)
	// }
	// }, 1000);
});

bot.command("overview", async (ctx) => {

	const accounts: Account[] = await getAccounts();
	await ctx.reply("Accounts:", keyboard(accounts).extra());
	help(ctx)

});

bot.command("awaiting", async (ctx) => {

	const accounts: Account[] = await getAccounts();
	await ctx.reply("Diff: " + await diff());


	const questions: Question[] = [
		{
			text: "Awaiting:",
			key: "transaction",
			validateFn: (a) => a,
			alternatives: awaitingTransactions
				.map((trans) => {
					return { text: trans.text + " → " + trans.amount * -1, value: trans };
				}),
		},
	];

	const quiz = new Quiz({
		questions: questions,
		answers: {},
		ctx: ctx,
		bot: bot,
	});

	quiz.startQuiz(async (answers: any) => {
		askAddTransaction(ctx, {
			...answers.transaction,
			name: answers.transaction.text,
			amount: answers.transaction.amount * -1,
		})
		console.log('answers: ', answers);

	});

});

const diff = async () => {
	const accounts: Account[] = await getAccounts();
	const balance = roundTo(accounts.reduce((prev, cur) => prev + cur.balance, 0), 2)
	const bank = await getBankAccount()

	const additional = await axios.get("http://localhost:4494/additionalLocations").then(a => a.data.locs)
	const additionalMoney = additional.reduce((prev, cur) => prev + cur.amount, 0)
	const asdf = balance - additionalMoney

	return roundTo(asdf - bank.available, 2)
}

startPolling((trans) => {
	awaitingTransactions.push(trans)
})

// testTransaction()
bot.launch();
