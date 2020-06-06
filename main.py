import os


import telegram
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters
from sbanken import lates_trans

user = {'username': 'larskarbo', 'id': 912275377}

bot = telegram.Bot(token=os.environ["KEST_MONEY_TELEGRAM_BOT_API"])

import threading

def set_interval(func, sec):
    def func_wrapper():
        set_interval(func, sec)
        func()
    t = threading.Timer(sec, func_wrapper)
    t.start()
    return t

last_length = 0
def check():
	global last_length
	t = lates_trans()
	if len(t) > last_length:
		latest = t[0]
		bot.send_message(chat_id=user["id"], text="Transaction: " + str(latest["amount"]) + ' "' + latest["text"] + '"')
		last_length = len(t)

check()
set_interval(check, 10)

# Define a few command handlers. These usually take the two arguments update and
# context. Error handlers also receive the raised TelegramError object in error.
def start(update, context):
	"""Send a message when the command /start is issued."""
	update.message.reply_text('Hi!')


def register(update, context):
	print("fitte")
	print("fdsoij",update.message.chat_id)
	user = {
		"username": str(update.message.from_user.username),
		"id": update.message.chat_id
	}
	# todo save json

	"""Send a message when the command /register is issued."""
	update.message.reply_text('Registering you!')


def echo(update, context):
	"""Echo the user message."""
	update.message.reply_text(update.message.text)


def error(update, context):
	"""Log Errors caused by Updates."""
	logger.warning('Update "%s" caused error "%s"', update, context.error)


def main():
	"""Start the bot."""
	# Create the Updater and pass it your bot's token.
	# Make sure to set use_context=True to use the new context based callbacks
	# Post version 12 this will no longer be necessary
	updater = Updater(os.environ["KEST_MONEY_TELEGRAM_BOT_API"], use_context=True)

	# Get the dispatcher to register handlers
	dp = updater.dispatcher

	# on different commands - answer in Telegram
	dp.add_handler(CommandHandler("start", start))
	dp.add_handler(CommandHandler("register", register))

	# on noncommand i.e message - echo the message on Telegram
	dp.add_handler(MessageHandler(Filters.text, echo))

	# log all errors
	dp.add_error_handler(error)

	# Start the Bot
	updater.start_polling()

	# Run the bot until you press Ctrl-C or the process receives SIGINT,
	# SIGTERM or SIGABRT. This should be used most of the time, since
	# start_polling() is non-blocking and will stop the bot gracefully.
	updater.idle()


if __name__ == '__main__':
	main()
