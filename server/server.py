
#%%
from notion.client import NotionClient
from bottle import get, run, template, post, request
import os
from datetime import datetime

client = NotionClient(token_v2=os.environ["NOTION_TOKEN"])

constants = {
	"lars": {
		"transactionsDB": "https://www.notion.so/larskarbo/dedbaff14c2d446cab84bcce54e1a180?v=c2f74899fcd5416cbce1aaf2f13b39f1",
		"accountsDB": "https://www.notion.so/larskarbo/e68e227bca7b45dcb30a15e3d582717d?v=c113a28a670d4891b94d0be5370338c1",
		"locationsDB": "https://www.notion.so/larskarbo/000c5b4f80b341ecad46fcef776eb3c2?v=32b805a1a76442a3b568168ea67987e5",
	},
	"cyri": {
		"transactionsDB": "https://www.notion.so/871ce4eda092482eb3f7e5eba5f3ab79?v=c3b6b25d1d894ee3a748cd55ebd3816f",
		"accountsDB": "https://www.notion.so/4049ffcb1b764992919137e8ea519d85?v=ead326b8420a4134bd924efa95ae106c",
		"locationsDB": "https://www.notion.so/abb8bd13eb3c4540bfd636b60a1cc42c?v=079e5a5fd4524920979c648e95d136b1",
	}
}

def reCalculateAccounts(user):
	transactions = client.get_collection_view(constants[user]["transactionsDB"])
	accounts = client.get_collection_view(constants[user]["accountsDB"])
	for account in accounts.collection.get_rows():
		account.balance = 0

	for transaction in transactions.collection.get_rows():
		if len(transaction.title) == 0:
			continue
		if len(transaction.fromAccount):
			transaction.fromAccount[0].balance = round(transaction.fromAccount[0].balance - transaction.amount, 2)
		if len(transaction.toAccount):
			transaction.toAccount[0].balance = round(transaction.toAccount[0].balance + transaction.amount, 2)

def fillFromColumn(user):
	accounts = client.get_collection_view(constants[user]["accountsDB"])
	for account in accounts.collection.get_rows():
		if not account.fillcolumn:
			continue
		print(account.fillcolumn)

		addTransaction(user, {
			"name": "Fill " + account.title + " from fillcolumn",
			"amount": account.fillcolumn,
			"toAccount": account.id
		})
		account.fillcolumn = 0

def monthlyFill(user):
	transactions = client.get_collection_view(constants[user]["transactionsDB"])
	accounts = client.get_collection_view(constants[user]["accountsDB"])

	for account in accounts.collection.get_rows():
		if not account.monthly_refill:
			continue

		if account.medium != "kest":
			continue

		addTransaction(user, {
			"name": "Monthly_recurring: " + account.title + ".",
			"amount": account.monthly_refill,
			"toAccount": account.id
		})

@get('/accounts')
def index():
	user = request.get_header('X-kest-user')
	accounts = client.get_collection_view(constants[user]["accountsDB"])
	print(constants[user]["accountsDB"])
	print(accounts.collection.get_rows())
	accs = []
	for a in accounts.collection.get_rows():
		account = {
			"name": a.name,
			"balance": a.balance,
			"id": a.id,
			"medium": a.medium,
			"tags": a.tags
		}
		if a.icon:
			account["icon"] = a.icon
		accs.append(account)
	return {"accounts":accs}

@get('/reCalculateAccounts')
def index():
	user = request.get_header('X-kest-user')
	reCalculateAccounts(user)
	return {"posts":"horse"}

@get('/fillFromColumn')
def index():
	user = request.get_header('X-kest-user')
	fillFromColumn(user)
	return {"posts":"horse"}

def addTransaction(user, trans):
	transactions = client.get_collection_view(constants[user]["transactionsDB"])
	row = transactions.collection.add_row()
	row.date = datetime.now()
	row.type = "expense"
	row.name = trans["name"]
	row.amount = trans["amount"]
	if "fromAccount" in trans:
		row.fromAccount = [trans["fromAccount"]]
		fromAcc = client.get_block(trans["fromAccount"])
		fromAcc.balance = round(fromAcc.balance - trans["amount"], 2)
	if "toAccount" in trans:
		row.toAccount = [trans["toAccount"]]
		toAcc = client.get_block(trans["toAccount"])
		toAcc.balance = round(toAcc.balance + trans["amount"], 2)

@post('/addTransaction')
def index():
	user = request.get_header('X-kest-user')
	print(request.json)
	addTransaction(user, request.json)

	return {"posts":"horse"}


@get('/additionalLocations')
def additionalLocations():
	user = request.get_header('X-kest-user')
	locs = []
	locations = client.get_collection_view(constants["lars"]["locationsDB"])
	for a in locations.collection.get_rows():
		account = {
			"name": a.name,
			"amount": a.amount
		}
		locs.append(account)

	return {"locs":locs}
# for account in accounts.collection.get_rows():
# 		print(account)


run(host='localhost', port=4494)
