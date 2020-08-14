
import { getTransactions, getBankAccount, startPolling } from "./sbanken"
import * as Database from "better-sqlite3"
import { v4 } from "uuid"
import axios from "axios"
import * as fs from "fs"
import * as moment from "moment"
const dropboxV2Api = require('dropbox-v2-api');

const dropbox = dropboxV2Api.authenticate({
	token: process.env.DROPBOX_API
});


const yo = async () => {
	await downloadDropBox()
	const db = Database('./Budget1.buckets', { verbose: console.log });
	const transactions = await getTransactions()
	// console.log('transactions: ', transactions.filter(t => t.isReservation));

	// transactions.slice(0,12).forEach(addTransactionToBuckets)

	const account = await getBankAccount()

	const bucketsBalance = getBalance(db)

	const realBalance = account.available * 100
	if (bucketsBalance == realBalance) {
		console.log('same! ALL GOOD!!!!')
	} else {
		console.log('not same!')
		const accountDiff = realBalance - bucketsBalance
		console.log('accountDiff: ', accountDiff / 100);
		let i = 0
		const checkCummulative = () => {
			i++
			const checkThese = transactions.slice(0, i)
			const sum = Math.round(checkThese.reduce((acc, cur) => acc + cur.amount, 0) * 100) / 100
			const last = checkThese[checkThese.length - 1]
			console.log(last.amount, last.text, ' ', sum);
			// console.log(last.te)
			// console.log('last.created: ', last.created)
			// console.log('last: ', last)
			// const date = new Date(last.accountingDate);
			// console.log('date: ', date)
			if (accountDiff == sum * 100) {
				console.log('last ' + i + ' transactions will fix it')
				checkThese.forEach(e => addTransactionToBuckets(db, e))
				return
			}
			if (i < 5) {
				checkCummulative()
			}
		}
		checkCummulative()

		i = 0
		const checkSeparate = () => {
			i++
			// console.log('checking specific ', i)
			const checkThis = transactions[i]
			const sum = checkThis.amount

			if (accountDiff == sum * 100) {
				console.log('specific ' + i + ' transactions will fix it')
				addTransactionToBuckets(db, checkThis)
				return
			}
			if (i < 10) {
				checkSeparate()
			}
		}
		checkSeparate()



		// if (accountDiff == tToAdd.amount * 100) {
		// 	console.log('last trans will fix it')
		// 	addTransactionToBuckets(tToAdd)
		// } else {
		// 	console.log('realBalance: ', realBalance);
		// 	console.log('bucketsBalance: ', bucketsBalance);
		// 	console.log('DIFF: ', realBalance - bucketsBalance);
		// 	console.log('TODO: check if 2 or 3 trans will fix it')

		// }
	}
	//


}

const getBalance = (db) => {
	const acc = db.prepare('SELECT balance FROM account WHERE name = ?').get("Sbanken")
	console.log('acc: ', acc);
	return Math.round(acc.balance * 100) / 100
}

const addTransactionToBuckets = (db, transaction) => {


	const ts = db.prepare('SELECT * FROM account_transaction').all()
	console.log('ts: ', ts);

	const add = {
		account_id: 2,
		memo: transaction.text,
		amount: transaction.amount * 100,
		fi_id: v4(),
		general_cat: '',
		created: transaction.accountingDate,
		posted: transaction.accountingDate,
	}
	const sql = `INSERT INTO account_transaction (${Object.keys(add).join(",")}) VALUES (${Object.keys(add).map(_ => "?").join(",")})`
	db.prepare(sql).run(...Object.values(add))

	uploadDropBox()

	axios.get("https://api.telegram.org/bot1196576929:AAFCVPBTMcSUlrHAIFBO_Ni7e9em0Nje10U/sendMessage?chat_id=912275377&text=added " + transaction.text)
}

const uploadDropBox = () => {
	dropbox({
		resource: 'files/upload',
		parameters: {
			path: '/Budget1.buckets'
		},
		readStream: fs.createReadStream('./Budget1.buckets')
	}, (err, result, response) => {
		console.log('err: ', JSON.stringify(err));
		console.log('result: ', result);
		//upload completed
	});
}

const downloadDropBox = () => new Promise((resolve) => {
	dropbox({
		resource: 'files/download',
		parameters: {
			path: '/Budget1.buckets'
		}
	}, (err, result, response) => {
		console.log('err: ', err);
		//download completed
		console.log('dl complete')
		setTimeout(resolve, 500)
	})
		.pipe(fs.createWriteStream('./Budget1.buckets'));
})


yo()
