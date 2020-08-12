
import { getTransactions, getBankAccount, startPolling } from "./sbanken"
import * as Database from "better-sqlite3"
import { v4 } from "uuid"
import axios from "axios"
import * as moment from "moment"
const db = Database('./Budget1.buckets', { verbose: console.log });

const yo = async () => {
	const transactions = await getTransactions()
	// console.log('transactions: ', transactions.filter(t => t.isReservation));

	// transactions.slice(0,12).forEach(addTransactionToBuckets)

	const account = await getBankAccount()

	const bucketsBalance = getBalance()
	
	const realBalance = account.available * 100
	if (bucketsBalance == realBalance) {
		console.log('same! ALL GOOD!!!!')
	} else {
		console.log('not same!')
		const accountDiff = realBalance - bucketsBalance
		console.log('accountDiff: ', accountDiff/100);
		let i = 0
		const check = () => {
			i++
			const checkThese = transactions.slice(0, i)
			const sum = Math.round(checkThese.reduce((acc, cur) => acc + cur.amount, 0) * 100) / 100
			const last = checkThese[checkThese.length - 1]
			console.log(last.amount, last.text,' ', sum);
			// console.log(last.te)
			// console.log('last.created: ', last.created)
			// console.log('last: ', last)
			// const date = new Date(last.accountingDate);
			// console.log('date: ', date)
			if (accountDiff == sum * 100) {
				console.log('last ' + i + ' transactions will fix it')
				checkThese.forEach(addTransactionToBuckets)
				return
			}
			if (i < 30) {
				check()
			}
		}
		check()
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

const getBalance = () => {
	const acc = db.prepare('SELECT balance FROM account WHERE name = ?').get("Sbanken")
	console.log('acc: ', acc);
	return acc.balance
}

const addTransactionToBuckets = (transaction) => {


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

	axios.get("https://api.telegram.org/bot1196576929:AAFCVPBTMcSUlrHAIFBO_Ni7e9em0Nje10U/sendMessage?chat_id=912275377&text=added " + transaction.text)
}


yo()
