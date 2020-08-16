import Telegraf, { Markup, Context } from "telegraf";
import axios from "axios";
import Quiz, { Alternative, Question } from "telegraf-ask";
const roundTo = require('round-to');
import { getTransactions, getBankAccount } from "../sbanken"
import { onNewTransaction, getBuckets, associateTrans } from "../buckets"

var arrayChunk = require("array-chunk");

const pythonBridge = (userID) => axios.create({
	baseURL: 'http://localhost:4494/',
	headers: { 'X-kest-user': userIdMap[userID] }
})

const userIdMap = {
	912275377: "lars",
	501141030: "cyri"
}

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
	ctx.reply("/start /add /overview /latest")
}

bot.command("start", async (ctx) => {
	await ctx.reply("Starting the kest Bot! ⭐️");
	
	onNewTransaction((trans) => {
		console.log('trans: ', trans);
	
		askAddTransaction(ctx, trans)
	})
});

bot.telegram.sendMessage("912275377", "msg")

bot.use((ctx, next) => {
	// console.log(ctx)
	// ctx.reply("middleware")
	next();
});

const askAddTransaction = async (ctx: Context, bTransaction: any) => {
	const buckets = await getBuckets();
	console.log('bTransaction: ', bTransaction);
	console.log('buckets: ', buckets);

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
			key: "bucket",
			alternatives: buckets
				.map((a) => ({
					text: a.name,
					value: a.id,
				})),
		},
	];

	const quiz = new Quiz({
		questions: questions,
		answers: {
			name: bTransaction.memo,
			amount: bTransaction.amount * -1
		},
		ctx: ctx,
		bot: bot,
	});
	quiz.startQuiz(async (answers: any) => {
		const transaction: any = {
			name: answers.name,
			amount: parseFloat(answers.amount),
			fromBucket: answers.bucket,
		};
		console.log('transaction: ', transaction);
		console.log('bTransaction', bTransaction)
		// await ctx.reply("Updating db");
		const preAccount = (getBuckets()).find(a => a.id == answers.bucket)
		associateTrans(bTransaction, answers.bucket)
		const postAccount = (getBuckets()).find(a => a.id == answers.bucket)
		await ctx.reply(`${preAccount.name} went from ${preAccount.balance/100} → ${postAccount.balance/100}`);
		// help(ctx)

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

const getAccounts = async (ctx) => {
	return pythonBridge(ctx.from.id).get("accounts")
		.then(a => a.data.accounts)
		.then(accounts => {
			return accounts
				.map(a => ({
					...a,
					name: (a.icon || "") + a.name,
				}))
		})
};

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

	const accounts: Account[] = await getAccounts(ctx);
	console.log('accounts: ', accounts);
	await ctx.reply("Accounts:", keyboard(accounts).extra());
	help(ctx)

});

bot.command("awaiting", async (ctx) => {

	const accounts: Account[] = await getAccounts(ctx);
	await ctx.reply("Diff: " + await diff(ctx))


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
		awaitingTransactions = awaitingTransactions.filter(a => JSON.stringify(a) != JSON.stringify(answers.transaction))
		console.log('answers: ', answers);

	});

});

const diff = async (ctx) => {
	const accounts: Account[] = await getAccounts(ctx);
	const balance = roundTo(accounts.reduce((prev, cur) => prev + cur.balance, 0), 2)
	const bank = await getBankAccount()

	const additional = await pythonBridge(ctx.from.id).get("additionalLocations").then(a => a.data.locs)
	const additionalMoney = additional.reduce((prev, cur) => prev + cur.amount, 0)
	const asdf = balance - additionalMoney

	return roundTo(asdf - bank.available, 2)
}



// testTransaction()
console.log('la')
bot.launch();
