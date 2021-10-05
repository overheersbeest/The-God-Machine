print('loading secret...')
import secret

print('loading flavor text...')
import flavorText as flavor

print('loading discord client...')
import discord

print('loading commands...')
import commands

from dataclasses import dataclass
import re

print('initializing discord client...')

def isMessageSentByAdmin(message :discord.Message) -> bool:
	if message.guild != None and message.author.id == message.guild.owner_id:
		return True
	for guild in client.guilds:
		if message.author.id == guild.owner_id:
			return True
	return False

def channelCheck(message :discord.Message) -> bool:
	return (message.guild == None
		or (isMessageSentByAdmin(message)
			or message.channel.name == "test"
			or (message.channel.category != None
				and message.channel.category.name == "Role Playing")))

@dataclass
class CommandPrompt:
	command :str
	authorName :str
	adminAuthor :bool
	channel :discord.TextChannel

class MyClient(discord.Client):
	async def on_ready(self):
		print('I am ready for operations')

	async def shutdownGracefully(self):
		await commands.shutdownCommand(client.guilds)
		await client.close()
		exit(0)
		
	async def on_message(self, message :discord.Message):
		command = message.content.strip()
		if (len(command) > 0 and not message.author.bot and channelCheck(message)):
			prompt = CommandPrompt(command, message.author.display_name, isMessageSentByAdmin(message), message.channel)
			response = await processCommand(prompt)
			if response != None:
				await message.channel.send(response.message)
			if clientShouldShutdown:
				await self.shutdownGracefully()

client = MyClient()
clientShouldShutdown = False

#					   ___																	   
#					  / _ \_ __ ___   ___ ___  ___ ___	/\/\   ___  ___ ___  __ _  __ _  ___ _ 
#					 / /_)/ '__/ _ \ / __/ _ \/ __/ __|  /	\ / _ \/ __/ __|/ _` |/ _` |/ _ (_)
#					/ ___/| | | (_) | (_|  __/\__ \__ \ / /\/\ \  __/\__ \__ \ (_| | (_| |  __/_ 
#					\/	|_|  \___/ \___\___||___/___/ \/	\/\___||___/___/\__,_|\__, |\___(_)
#																					|___/		

async def processCommand(command :CommandPrompt):
	global clientShouldShutdown
	commandSegments = [x for x in command.command.split(' ') if len(x) > 0]
	commandID = commandSegments[0].lower()
	response = None

	if (commandID == '/roll'
		or commandID == 'roll'
		or commandID == '/r'):
		response = commands.rollCommand(commandSegments, command.authorName)
	
	if (commandID == '/init'
		or commandID == '/initiative'):
		if len(commandSegments) >= 2:
			response =  commands.rollInitiativeCommand(commandSegments[1:], command.authorName)
		else :
			response = commands.CommandResponse(commands.gcs("_Initiative is taken, not given._"))
	
	elif commandID == '/tarot':
		response = commands.tarotCommand()
	
	elif commandID == '/coinflip':
		response = commands.coinFlipCommand()

	elif commandID == "/test":
		if command.adminAuthor:
			response = commands.CommandResponse(commands.gcs("_I'm back, bitches_"))
		else :
			response = commands.CommandResponse(commands.gcs("_what, exactly?_"))
	
	elif commandID == '/refuse':
		response = commands.CommandResponse(commands.gcs("_The pawn can refuse as much as it wants, it changes nothing._"))
	
	elif commandID == '/pass':
		response = commands.CommandResponse(commands.gcs("_Apathy is the default state of being, to pass on an opportunity is to reject what little influence you have._"))
	
	elif commandID == '/impossible':
		response = commands.CommandResponse(commands.gcs("_The pawn is correct, impossiblility is a constant._"))
	
	elif commandID == '/care':
		response = commands.CommandResponse(commands.gcs("_Interesting, apathy has already set in for the subject._"))
	
	elif commandID == '/cleanup':
		if command.adminAuthor:
			response = await commands.cleanupCommand(commandSegments, command.channel)
		else:
			response = commands.CommandResponse(commands.gcs(flavor.getFlavourTextForPermissionError()))

	elif (commandID == '/extend'
		or commandID == '/extended'):
		response = commands.extendedActionCommand(commandSegments)
	
	elif ("<@!" + str(client.user.id if client.user else "") + ">" in command.command
		and "SITREP" in command.command) :
		if command.adminAuthor:
			response = commands.CommandResponse(commands.gcs("_All systems nominal, ready for operations._"))
		else:
			response = commands.CommandResponse(commands.gcs(flavor.getFlavourTextForPermissionError()))
	
	elif (commandID == '/corrupt'
		or commandID == '/corruption'):
		if command.adminAuthor:
			response = commands.setCorruptionCommand(commandSegments)
		else:
			response = commands.CommandResponse(commands.gcs(flavor.getFlavourTextForPermissionError()))
	
	elif commandID == "/shutdown":
		if command.adminAuthor:
			response = commands.CommandResponse(commands.gcs("_Affirmative, shutting down._"))
			if client.is_ready():
				clientShouldShutdown = True
			else:
				await client.shutdownGracefully()
		else:
			response = commands.CommandResponse(commands.gcs("_Threat detected, defense mechanisms active._"))
	
	return response

if __name__ == "__main__":
	client.run(secret.getToken())