import requests
import urllib
import base64
import pprint
import os
from urllib.parse import quote

# This example requires the requests library.
# It can usually be installed by running
# pip install requests


CLIENT_ID = os.environ["SBANKEN_CLIENT_ID"]  # Get from https://secure.sbanken.no/Personal/ApiBeta/Info/
SECRET = os.environ["SBANKEN_PW"]  # Get this from https://secure.sbanken.no/Personal/ApiBeta/Info/
AUTH_URL = 'https://auth.sbanken.no/identityserver/connect/token'
ACCOUNTS_URL = 'https://api.sbanken.no/exec.bank/api/v1/accounts'
CUSTOMER_ID = os.environ["SBANKEN_USER_ID"]  # Your own personnummer


def get_auth_token():
    headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
    }
    body = {'grant_type': 'client_credentials'}

    urlencoded_client_id = quote(CLIENT_ID)
    urlencoded_secret = quote(SECRET)
    auth_string_to_be_b64encoded = '{}:{}'.format(
        urlencoded_client_id, urlencoded_secret)
    b64encoded_auth_string = base64.b64encode(auth_string_to_be_b64encoded.encode("utf-8"))
    headers['Authorization'] = 'Basic {}'.format(b64encoded_auth_string.decode())

    r = requests.post(url=AUTH_URL, headers=headers, data=body)
    auth_token = r.json()['access_token']
    return auth_token

def get_accounts(auth_token):
    headers = {
        'customerId': CUSTOMER_ID,
        'Authorization': 'Bearer {}'.format(auth_token)
    }

    r = requests.get(url=ACCOUNTS_URL, headers=headers)
    return r

def get_accounts(auth_token):
    headers = {
        'customerId': CUSTOMER_ID,
        'Authorization': 'Bearer {}'.format(auth_token)
    }

    r = requests.get(url=ACCOUNTS_URL, headers=headers)
    return r

def get_account_info(accountId, auth_token):
    headers = {
        'customerId': CUSTOMER_ID,
        'Authorization': 'Bearer {}'.format(auth_token)
    }

    r = requests.get(url=ACCOUNTS_URL + "/" + accountId, headers=headers)
    return r

def get_account_trans(accountId, auth_token):
    headers = {
        'customerId': CUSTOMER_ID,
        'Authorization': 'Bearer {}'.format(auth_token)
    }

    r = requests.get(url="https://api.sbanken.no/exec.bank/api/v1/transactions/" + accountId, headers=headers)
    return r

def lates_trans():
    auth_token = get_auth_token()
    accounts = get_accounts(auth_token).json()

    for a in accounts["items"]:
        if a["name"] == "asdfbruk":
            account = a

    # info = get_account_info(account["accountId"], auth_token).json()
    trans = get_account_trans(account["accountId"], auth_token).json()["items"]

    return trans


if __name__ == "__main__":
    pprint.pprint(trans["items"])
