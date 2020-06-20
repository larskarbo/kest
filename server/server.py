
#%%
from notion.client import NotionClient
from bottle import get, run, template, post, request
import os
from datetime import datetime

client = NotionClient(token_v2=os.environ["NOTION_TOKEN"])


transactions = client.get_collection_view("https://www.notion.so/larskarbo/dedbaff14c2d446cab84bcce54e1a180?v=c2f74899fcd5416cbce1aaf2f13b39f1")
accounts = client.get_collection_view("https://www.notion.so/larskarbo/e68e227bca7b45dcb30a15e3d582717d?v=c113a28a670d4891b94d0be5370338c1")

def reCalculateAccounts():
	for account in accounts.collection.get_rows():
		account.balance = 0

	for transaction in transactions.collection.get_rows():
		if len(transaction.title) == 0:
			continue
		if len(transaction.fromAccount):
			transaction.fromAccount[0].balance -= transaction.amount
		if len(transaction.toAccount):
			transaction.toAccount[0].balance += transaction.amount

def fillFromColumn():
	for account in accounts.collection.get_rows():
		if not account.fillcolumn:
			continue
		print(account.fillcolumn)
		row = transactions.collection.add_row()
		row.date = datetime.now()
		row.type = "fill"
		row.name = "Fill " + account.title + " from fillcolumn"
		row.amount = account.fillcolumn
		row.toAccount = [account.id]
		account.fillcolumn = 0
	reCalculateAccounts()

def monthlyFill():
	salaryAccount = False
	for account in accounts.collection.get_rows():
		if account.medium == "salary":
			salaryAccount = account
			break

	if not salaryAccount:
		raise Exception('No salaryaccount!')

	for account in accounts.collection.get_rows():
		if not account.monthly_refill:
			continue

		if account.medium != "salary" and account.medium != "kest":
			continue
		row = transactions.collection.add_row()
		row.date = datetime.now()

		row.type = "monthly-fill"
		row.name = "Monthly-fill: " + account.title
		if account.monthly_refill < 0:
			row.amount = account.monthly_refill * -1
		else:
			row.fromAccount = [salaryAccount.id]
			row.amount = account.monthly_refill

		row.toAccount = [account.id]
		account.fillcolumn = 0
# monthlyFill()
# fillFromColumn()
# reCalculateAccounts()

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
			"medium": a.medium
		}
		if a.icon:
			account["icon"] = a.icon
		accs.append(account)
	return {"accounts":accs}

@get('/reCalculateAccounts')
def index():
	reCalculateAccounts()
	return {"posts":"horse"}

@post('/addTransaction')
def index():
	print(request.json)
	row = transactions.collection.add_row()
	row.date = datetime.now()
	row.type = "expense"
	row.name = request.json["name"]
	row.amount = request.json["amount"]
	if "fromAccount" in request.json:
		row.fromAccount = [request.json["fromAccount"]]
		fromAcc = client.get_block(request.json["fromAccount"])
		fromAcc.balance -= request.json["amount"]
	if "toAccount" in request.json:
		row.toAccount = [request.json["toAccount"]]
		toAcc = client.get_block(request.json["fromAccount"])
		toAcc.balance += request.json["amount"]
	return {"posts":"horse"}

# for account in accounts.collection.get_rows():
# 		print(account)


run(host='localhost', port=4494)
