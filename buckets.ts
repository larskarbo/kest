
import { getTransactions, getBankAccount } from "./sbanken"
import * as Database from "better-sqlite3"
import { v4 } from "uuid"
import axios from "axios"
import * as fs from "fs-extra"
import * as moment from "moment"
const db = Database('./Budget1.buckets', { verbose: console.log });

export const represent = (intman) => {
	return (intman/100).toFixed(2) + " kr"
}

export const run = async () => {
	const transactions = (await getTransactions()).filter(t => !t.text.includes("458"))
	// console.log('transactions: ', transactions.filter(t => t.isReservation));

	// transactions.slice(0,12).forEach(addTransactionToBuckets)


	const account = await getBankAccount()

	const bucketsBalance = getBalance()
	
	const realBalance = account.available
	console.log('account.available: ', represent(account.available));
	if (bucketsBalance == realBalance) {
		console.log('same! ALL GOOD!!!!')
	} else {
		console.log('not same!')
		console.log('bucketsBalance: ', represent(bucketsBalance));
		console.log('realBalance: ', represent(realBalance));
		const accountDiff = realBalance - bucketsBalance
		console.log('accountDiff: ', represent(accountDiff));
		let i = 0
		const logs= []
		const checkCummulative = () => {
			i++
			const checkThese = transactions.slice(0, i)
			const sum = checkThese.reduce((acc, cur) => acc + cur.amount, 0)
			const last = checkThese[checkThese.length - 1]
			// console.log(last.te)
			// console.log('last.created: ', last.created)
			// console.log('last: ', last)
			// const date = new Date(last.accountingDate);
			// console.log('date: ', date)
			const log = ["cumCheck: ", i, represent(last.amount), represent(sum), "\t\t" + last.text.slice(0,55)]
			console.log(...log)
			logs.push(log)
			if (accountDiff == sum ) {
				console.log('last ' + i + ' transactions will fix it')
				checkThese.forEach(e => addTransactionToBuckets(e))
				return
			}
			if (i < 42) {
				checkCummulative()
			} else {

				fs.writeJSON("logs/log: "+new Date().toDateString()+".json", {logs})
				axios.get("https://api.telegram.org/bot1196576929:AAFCVPBTMcSUlrHAIFBO_Ni7e9em0Nje10U/sendMessage?chat_id=912275377&text=something wrong!")
			}

		}
		checkCummulative()

		// i = 0
		// const checkSeparate = () => {
		// 	i++
		// 	// console.log('checking specific ', i)
		// 	const checkThis = transactions[i]
		// 	const sum = checkThis.amount

		// 	if (accountDiff == sum) {
		// 		console.log('specific ' + i + ' transactions will fix it')
		// 		addTransactionToBuckets(checkThis)
		// 		return
		// 	}
		// 	if (i < 10) {
		// 		checkSeparate()
		// 	}
		// }
		// checkSeparate()



	}
	//
}

let onNewTransactionCallback = (transaction) => {
	console.log("No onNewTransactionCallback defined")
}

export const onNewTransaction = (cb) => {
	onNewTransactionCallback = cb

	run()
	setInterval(run, 60000)
}

const getBalance = () => {
	const acc = db.prepare('SELECT balance FROM account WHERE name = ?').get("Sbanken")
	return acc.balance
}

export const getBuckets = () => {
	const buckets = db.prepare('SELECT * FROM bucket').all()
	return buckets
}


export const associateTrans = (transaction, bucketId) => {
	const add = {
		bucket_id: bucketId,
		memo: transaction.memo,
		amount: transaction.amount,
		account_trans_id: transaction.id,
		// created: transaction.accountingDate,
		// posted: transaction.accountingDate,
	}
	const sql = `INSERT INTO bucket_transaction (${Object.keys(add).join(",")}) VALUES (${Object.keys(add).map(_ => "?").join(",")})`
	const res = db.prepare(sql).run(...Object.values(add))
}

export const addTransactionToBuckets = (transaction) => {
	const ts = db.prepare('SELECT * FROM account_transaction').all()

	const add = {
		account_id: 2,
		memo: transaction.text,
		amount: transaction.amount,
		fi_id: v4(),
		general_cat: '',
		// created: transaction.accountingDate,
		// posted: transaction.accountingDate,
	}
	const sql = `INSERT INTO account_transaction (${Object.keys(add).join(",")}) VALUES (${Object.keys(add).map(_ => "?").join(",")})`
	const res = db.prepare(sql).run(...Object.values(add))
	// console.log('res: ', res);
	const lt = db.prepare('SELECT * FROM account_transaction WHERE id = ?').get(res.lastInsertRowid)
	console.log('lt: ', lt);


	onNewTransactionCallback(lt)
	// axios.get("https://api.telegram.org/bot1196576929:AAFCVPBTMcSUlrHAIFBO_Ni7e9em0Nje10U/sendMessage?chat_id=912275377&text=added " + transaction.text + ": "  + Math.abs(transaction.amount) + " kr")
}
