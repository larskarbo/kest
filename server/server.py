
#%%
from notion.client import NotionClient
from bottle import get, run, template, post, request
import os
from datetime import datetime

client = NotionClient(token_v2=os.environ["NOTION_TOKEN"])


transactions = client.get_collection_view("https://www.notion.so/larskarbo/dedbaff14c2d446cab84bcce54e1a180?v=c2f74899fcd5416cbce1aaf2f13b39f1")
accounts = client.get_collection_view("https://www.notion.so/larskarbo/e68e227bca7b45dcb30a15e3d582717d?v=c113a28a670d4891b94d0be5370338c1")
locations = client.get_collection_view("https://www.notion.so/larskarbo/000c5b4f80b341ecad46fcef776eb3c2?v=32b805a1a76442a3b568168ea67987e5")

def reCalculateAccounts():
	for account in accounts.collection.get_rows():
		account.balance = 0

	for transaction in transactions.collection.get_rows():
		if len(transaction.title) == 0:
			continue
		if len(transaction.fromAccount):
			transaction.fromAccount[0].balance = round(transaction.fromAccount[0].balance - transaction.amount, 2)
		if len(transaction.toAccount):
			transaction.toAccount[0].balance = round(transaction.toAccount[0].balance + transaction.amount, 2)

def fillFromColumn():
	for account in accounts.collection.get_rows():
		if not account.fillcolumn:
			continue
		print(account.fillcolumn)

		addTransaction({
			"name": "Fill " + account.title + " from fillcolumn",
			"amount": account.fillcolumn,
			"toAccount": account.id
		})
		account.fillcolumn = 0

def monthlyFill():

	if not salaryAccount:
		raise Exception('No salaryaccount!')

	for account in accounts.collection.get_rows():
		if not account.monthly_refill:
			continue

		if account.medium != "kest":
			continue
		row = transactions.collection.add_row()
		row.date = datetime.now()

		row.type = "monthly-fill"
		row.name = "Monthly-fill: " + account.title
		row.amount = account.monthly_refill

		row.toAccount = [account.id]
		account.fillcolumn = 0

# monthlyFill()



@get('/getposts')
def index():
	return {"posts":getPosts()}

@get('/accounts')
def index():
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
	reCalculateAccounts()
	return {"posts":"horse"}

@get('/fillFromColumn')
def index():
	fillFromColumn()
	return {"posts":"horse"}

def addTransaction(trans):
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
	print(request.json)
	addTransaction(request.json)

	return {"posts":"horse"}


@get('/additionalLocations')
def additionalLocations():
	locs = []
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
