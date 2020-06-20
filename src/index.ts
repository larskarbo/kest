import Telegraf, { Markup, Context } from "telegraf";
import axios from "axios";
import Quiz, { Alternative, Question } from "telegraf-ask";

const getTransactions = require("../sbanken");
var arrayChunk = require("array-chunk");

const bot = new Telegraf(process.env.KEST_MONEY_TELEGRAM_BOT_API as string);

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
	medium: string
}

const help = async (ctx) => {
	ctx.reply("/start /add /recalculate /overview /latest")
}

bot.command("start", async (ctx) => {
	// ctx.session.done = 0; // restart done counter
	// ctx.session.quiz = null;
	await ctx.reply("Welcome to the kest Bot! ⭐️");
	await help(ctx)

});

bot.use((_, next) => {
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
			validateFn: (a) => parseInt(a),
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
			alternatives: accounts.map((a) => ({
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
		console.log("answers: ", answers);
		const transaction: Transaction = {
			name: answers.name,
			amount: parseInt(answers.amount),
			fromAccount: answers.account,
		};
		await ctx.reply("Updating db");
		await axios.post("http://localhost:4494/addTransaction", transaction);
		await ctx.reply("Thanks");
		help(ctx)

	});
}

const keyboard = (accounts: Account[]) => {
	return Markup.inlineKeyboard(
		arrayChunk(
			accounts
				.filter(a => a.medium == "kest")
				.map((account) => {
					console.log('account: ', account);
					if (!account.id) {
						throw new Error("please add id!");
					}
					return Markup.callbackButton(`${account.name} - ${account.balance}kr`, account.id);
				}),
			2
		)
	);
};

const testTransaction = async () => {
	const accounts: Account[] = await getAccounts();
	console.log("accounts: ", accounts);
	const trans: Transaction = {
		name: "horse",
		amount: 444,
		fromAccount: accounts.find((a) => a.name == "Drowzee Lønn")?.id,
		toAccount: accounts.find((a) => a.name == "Lunsjmat")?.id,
	};
	console.log(trans);
	await axios.post("http://localhost:4494/addTransaction", trans);
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
		.catch(a => console.log('wtf', a))
};

bot.command("recalculate", async (ctx) => {
	await axios.get("http://localhost:4494/reCalculateAccounts");
	ctx.reply("done");
});

bot.command("latest", async (ctx) => {

	// setTimeout(async () => {
	console.log("here")
	const t: Array<any> = await getTransactions();
	console.log('t: ', t.map(t=>t.text));
	console.log("here2")
	const lastT = t.shift()

	const trans: Transaction = {
		name: lastT.text,
		amount: lastT.amount * -1
	}
	console.log("here3")
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


// testTransaction()
bot.launch();
