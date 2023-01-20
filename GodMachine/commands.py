print('loading standard modules...')
from asyncio import sleep
import asyncio
from dataclasses import dataclass
import datetime
import json
import random
import re
import string
import os

import discord
import flavorText as flavor

print('loading extended action success calculator...')
import extendedActionAnalyzer

print('loading tarot cards...')
tarotCards = None
with open("GodMachine/TarotCards.json") as TarotFile:
	tarotCards = json.load(TarotFile)

print('loading custom commands...')
customCommands = None
with open("GodMachine/CustomResponses.json") as CustomCommandFile:
	customCommands = json.load(CustomCommandFile)

print('initializing variabless...')
#init tracking
recentInitResetTimeMinutes = 30
recentInitList = {}
recentInitStaleTime = datetime.datetime.now()
#renames
renameDict = {}
#corruption
fullCorruptionStart = 0.25
corruptionResistantCharacters = ' ():,'
corruptionImmuneCharacters = '>_*\r\n\t'
corruptionFraction = 0.0 # 0 - 1, 0 = no corruption, 1 = full corruption
corruptionCharacters = string.ascii_letters + string.digits + ' !"#$%&\'()+,-./:;<=?@[\]^{|}~'
corruptionSubstitutions = ["a@4", "il|1j!", "e3", "&8", "t7", "0o", "yv", "s5$", "({[\\", ")}]/", ";:", ".,*'`", "n^", "~-+_"]
allCorruptionSubstitutionChars = "".join(corruptionSubstitutions)
#sounds
playSoundTask = None
lastPlayedSoundPath = None
shouldStopSplaying = False
soundboardSoundsDir = "GodMachine/SoundboardSounds"

#																   _	   
#					  ___ ___  _ __ ___  _ __ ___   __ _ _ __   __| |___ _ 
#					 / __/ _ \| '_ ` _ \| '_ ` _ \ / _` | '_ \ / _` / __(_)
#					| (_| (_) | | | | | | | | | | | (_| | | | | (_| \__ \_ 
#					 \___\___/|_| |_| |_|_| |_| |_|\__,_|_| |_|\__,_|___(_)

@dataclass
class CommandResponse:
	message :str = None
	silentSuccess :bool = None

	def __init__(self, message = None, silentSuccess = False):
		if message != None:
			self.message = message
		else:
			self.message = ""
		self.silentSuccess = silentSuccess

	def succeeded(self) -> bool:
		return self.silentSuccess or len(self.message) > 0

def tarotCommand() -> CommandResponse:
	card = random.choice(tarotCards["cards"])
	inverted = random.choice([True, False])
	messageText = "**" + gcs(card["name"]) + "**\r\n"
	if inverted:
		messageText += gcs("Reversed: ", False) + gcs(card["reversed"])
	else:
		messageText += gcs("Upright: ", False) + gcs(card["upright"])
	
	messageText += "\r\n_" + gcs("more info:") + " <" + card["link"] + ">_"
	return CommandResponse(messageText)

def extendedActionCommand(commandSegments :list[str]) -> CommandResponse:
	if len(commandSegments) < 2:
		return CommandResponse(gcs(flavor.getFlavourTextForMissingParamError()))
	
	#dicePool
	poolMatch = re.search("^(\d+)([\+-]\d+)?$", commandSegments[1])
	if poolMatch:
		basePool = int(poolMatch.group(1))
		mod = 0
		if poolMatch.group(2) != None:
			mod = int(poolMatch.group(2))
		
		#additional arguments
		rote = False
		explodeThres = 10
		fumbleMod = 0
		patientMod = 0
		for i in range(len(commandSegments)):
			segment = commandSegments[i].lower()
			if (segment == 'rote'
				or segment == 'r') :
				rote = True
			
			elif (segment == 'no10'
				or segment == 'no10again'
				or segment == 'no10-again'
				or segment == 'no-10-again') :
				explodeThres = 11
			
			else:
				# x-again (e.g. 9again)
				againMatch = re.search("^(\d+)a(gain)?$", segment)
				if againMatch:
					newThres = int(againMatch.group(1))
					if newThres > 7 and newThres < 11:
						explodeThres = newThres
				
				patientMatch = re.search("^p(atient)?(?P<n>[\+-]?\d+)?$", segment)
				if patientMatch:
					customN = patientMatch.groupdict()["n"]
					if customN != None:
						patientMod = int(customN)
					else:
						patientMod = 2
				
				fumbleMatch = re.search("^f(umble)?(?P<n>[\+-]?\d+)$", segment)
				if fumbleMatch:
					fumbleMod = int(fumbleMatch.groupdict()["n"])
		
		return CommandResponse(gcs(extendedActionAnalyzer.getExtendedActionSuccessProbabilitiesString(basePool, mod, explodeThres, rote, fumbleMod, patientMod)))

@dataclass
class rollResult:
	chanceDie: bool
	successes: int
	diceValues: list[int]

def coinFlipCommand() -> CommandResponse:
	return CommandResponse(gcs("result: ") + gcs("Heads" if random.choice([True, False]) else "Tails", False))

def rollCommand(commandSegments :list[str], authorName :str) -> CommandResponse:
	#handle rolling for initiative
	if (len(commandSegments) >= 3
		and (commandSegments[1].lower() == 'init'
			or commandSegments[1].lower() == 'i'
			or commandSegments[1].lower() == 'initiative')):
		return rollInitiativeCommand(authorName, commandSegments[2:])
	
	# special cases:
	#custom rolls
	if len(commandSegments) >= 2:
		#percentage roll
		if (commandSegments[1].lower() == '%') :
			percentage = random.randint(1, 100)
			return CommandResponse(gcs("result: ") + str(percentage))
		
		#tarot card draw
		if (commandSegments[1].lower() == 'tarot') :
			return tarotCommand()
		
		#tarot card draw
		if (commandSegments[1].lower() == 'alphabet' or
			commandSegments[1].lower() == 'letter') :
			return CommandResponse(gcs("result: ") + random.choice(string.ascii_letters))
		
		#coin flip
		if (commandSegments[1].lower() == 'coin') :
			return coinFlipCommand()
		
		#custom dice
		diceMatch = re.search("^(\d*)d(\d+)(([\+\-])([\+\d\-d]+))?$", commandSegments[1])
		if diceMatch:
			return parseDiceString(commandSegments[1], True, 0, "", "", True)
			
	#typical roll:
	rollAmount = -1
	rote = False
	blessed = False
	blighted = False
	explodeThres = 10
	exceptionalThres = 5
	for i in range(len(commandSegments)):
		segment = commandSegments[i].lower()
		if i == 1:
			if segment.isdigit():
				rollAmount = int(segment)
			else:
				if (segment == 'chance'):
					rollAmount = 0
		elif (segment == 'rote'
			or segment == 'r') :
			rote = True
		elif (segment == 'adv'
			or segment == 'advanced'
			or segment == 'blessed') :
			blessed = True
		elif (segment == 'blighted') :
			blighted = True
		elif (segment == 'no10'
			or segment == 'no10again'
			or segment == 'no10-again'
			or segment == 'no-10-again'):
			explodeThres = 11
		else:
			# x-again (e.g. 9again)
			againMatch = re.search("^(\d+)a(gain)?$", segment)
			if againMatch:
				newThres = int(againMatch.group(1))
				if newThres > 7 and newThres < 11:
					explodeThres = newThres
			# exceptional at x successes
			exceptionalMatch = re.search("^(\d+)e(xceptional)?$", segment)
			if exceptionalMatch:
				newThres = int(exceptionalMatch.group(1))
				if newThres > 0:
					exceptionalThres = newThres

	if rollAmount < 0:
		#no second parameter given
		return CommandResponse(gcs(flavor.getFlavourTextForMissingParamError()))
	else:
		rollResults1 = roll(rollAmount, rote, explodeThres)
		rollResults2 = None
		if blessed or blighted:
			advancedRollResults = roll(rollAmount, rote, explodeThres)
			if (advancedRollResults.successes > rollResults1.successes) == blessed:
				rollResults2 = rollResults1
				rollResults1 = advancedRollResults
			else:
				rollResults2 = advancedRollResults
		return CommandResponse(getRollReturnMessage(rollAmount, rote, explodeThres, exceptionalThres, rollResults1, rollResults2))

def roll(rollAmount :int, rote :bool, explodeThres :int) -> rollResult :
	successesRolled = 0
	diceValuesRolled = []

	if rollAmount == 0 and rote:
		rote = False
		rollAmount = 1
	
	if rollAmount == 0:
		#chance die
		roll = random.randint(1, 10)
		if roll == 10:
			successesRolled = 1
		elif roll == 1:
			successesRolled = -1
		else:
			successesRolled = 0
		diceValuesRolled.append(roll)
	else :
		#dice pool
		explodedDice = 0
		r = 0
		while r < rollAmount + explodedDice:
			roll = random.randint(1, 10)
			if (roll >= 8) :
				successesRolled += 1
				if (roll >= explodeThres) :
					explodedDice += 1
			elif (rote and r < rollAmount):#re-roll once, exploded dice don't benefit again from the rote quality
				explodedDice += 1

			r += 1
			diceValuesRolled.append(roll)
	
	return rollResult(chanceDie = rollAmount == 0, successes = successesRolled, diceValues = diceValuesRolled)

def getRollReturnMessage(rollAmount :int, rote :bool, explodeThres :int, exceptionalThres :int, rollResults :rollResult, discardedAdvancedRollResults :rollResult) -> str:
	if discardedAdvancedRollResults == None:
		return (gcs(getRollTypeString(rollResults.chanceDie, rollAmount, rote, explodeThres, exceptionalThres) + " resulted in ") + getRollResultTypeText(rollResults.successes, exceptionalThres)
				+ gcs(" (") + getRollDiceString(rollResults, rollAmount, rote, explodeThres) + gcs(") "
				+ flavor.getFlavourTextForRoll(rollResults.chanceDie, rollResults.successes, exceptionalThres)))
	
	else:
		return (gcs(getRollTypeString(rollResults.chanceDie, rollAmount, rote, explodeThres, exceptionalThres) + " resulted in ") + getRollResultTypeText(rollResults.successes, exceptionalThres)
				+ gcs(" (") + getRollDiceString(rollResults, rollAmount, rote, explodeThres)
				+ gcs(")\nother roll resulted in " + str(discardedAdvancedRollResults.successes) + " successes (") + getRollDiceString(discardedAdvancedRollResults, rollAmount, rote, explodeThres) + gcs(")\n"
				+ flavor.getFlavourTextForRoll(rollResults.chanceDie, rollResults.successes, exceptionalThres)))

def getRollDiceString(rollResults :rollResult, rollAmount :int, rote :bool, explodeThres :int) -> str:
	rollsStr = ""
	if rollResults.chanceDie:
		if rollResults.diceValues[0] == 10:
			rollsStr = "**" + str(rollResults.diceValues[0]) + "**"
		else:
			rollsStr = str(rollResults.diceValues[0])
	else:
		def getDigitSyntax(digit, isRoteReroll):
			if (digit >= 8):
				if (digit >= explodeThres):
					return "__**" + str(digit) + "**__"
				else:
					return "**" + str(digit) + "**"
			elif isRoteReroll:
				#re-roll due to rote
				return "__" + str(digit) + "__"
			else:
				return str(digit)
			
		if len(rollResults.diceValues) > 150:
			rollsStr += "summary: "
			#we've rolled so many dice that we'll show a summary instead
			map = {}
			#count how often each digit was rolled
			for d in range(len(rollResults.diceValues)):
				roll = rollResults.diceValues[d]
				if not roll in map:
					map[roll] = { "rolls": 0, "rerolls": 0}
				
				if (d > rollAmount):
					map[roll]["rerolls"] += 1
				else:
					map[roll]["rolls"] += 1
			#construct the string
			for digit in range(1, 10):
				if digit in map:
					roll = map[digit]["rolls"]
					reroll = map[digit]["rerolls"]
					rollsStr += getDigitSyntax(digit, False)
					if (reroll > 0):
						rollsStr += " (" + str(roll) + "+" + str(reroll) + ")"
					else:
						rollsStr += " (" + str(roll) + ")"
					if digit != 10:
						rollsStr += ", "
		else:
			# we've rolled little enough that we'll show all of the results in sequence
			for d in range(len(rollResults.diceValues)):
				digit = rollResults.diceValues[d]
				#check for rollAmount > 0 in case of promoted chance die
				if (d == rollAmount and rollAmount > 0):
					#we now start rolling exploded dice
					rollsStr = rollsStr[:-2] + " + "
				isRoteReroll = rote and d < rollAmount
				rollsStr += getDigitSyntax(digit, isRoteReroll)
				if d != len(rollResults.diceValues) - 1:
					rollsStr += ", "
	
	return gcs(rollsStr)

def getRollTypeString(chanceDie :bool, rollAmount :int, rote :bool, explodeThres :int, exceptionalThres :int) -> str:
	if chanceDie:
		return "chance die"
	elif rollAmount == 0 and rote:
		return "promoted chance die"
	else:
		addedMod = False
		rollTypeString = str(rollAmount) + " rolls"
		if (rote or explodeThres != 10 or exceptionalThres != 5):
			rollTypeString += "("
			if rote:
				rollTypeString += "rote"
				addedMod = True
			
			if explodeThres != 10:
				if addedMod:
					rollTypeString += ", "
				if explodeThres > 10:
					rollTypeString += "no 10 again"
				else:
					rollTypeString += str(explodeThres) + "-again"
				addedMod = True
			
			if exceptionalThres != 5:
				if addedMod:
					rollTypeString += ", "
				rollTypeString += "exceptional on " + str(exceptionalThres) + " successes"
				addedMod = True
			
			rollTypeString += ") "
		return rollTypeString

def getRollResultTypeText(amountOfSuccesses :int, exceptionalThres :int) -> str:
	if amountOfSuccesses >= exceptionalThres:
		return gcs("an ") + gcs("exceptional success", False) + gcs(" of ") + str(amountOfSuccesses)
	elif amountOfSuccesses > 0:
		return str(amountOfSuccesses) + gcs(" successes", False)
	elif amountOfSuccesses == 0:
		return gcs("a ") + gcs("failure", False)
	else:
		return gcs("a ") + gcs("dramatic failure", False)

def parseDiceString(queryString :str, plus :bool, resultSoFar :int, rollString :str, resultString :str, firstQuery :bool = False) -> CommandResponse:
	match = re.search("^((?P<number>\d*)|(?P<dice>\d*d\d+))(?P<remainder>(?P<sign>[\+\-])(?=[d\d])(?P<nextQuery>[\+\d\-d]+))?$", queryString)
	if match:
		numberString = match.groupdict()["number"]
		diceString = match.groupdict()["dice"]
		remainderString = match.groupdict()["remainder"]

		if numberString != None:
			#numbers are never the first segment of a dice roll, so no need to check for firstQuery
			number = int(numberString)
			if plus:
				resultSoFar += number
				rollString += "+" + str(number)
				resultString += "+" + str(number)
			else:
				resultSoFar -= number
				rollString += "-" + str(number)
				resultString += "-" + str(number)
		if diceString != None:
			diceMatch = re.search("^(\d*)d(\d+)$", diceString)
			if len(diceMatch.group(1)) == 0:
				nDice = 1
			else:
				nDice = int(diceMatch.group(1))
			nSides = int(diceMatch.group(2))
			if nSides >= 1 and nDice >= 1:
				rollResult = [random.randint(1, nSides) for i in range(nDice)]
				if plus:
					resultSoFar += sum(rollResult)
				else:
					resultSoFar -= sum(rollResult)
				separatorStr = ("" if firstQuery else ("+" if plus else "-"))
				rollString += separatorStr + str(nDice) + "d" + str(nSides)
				resultString += separatorStr + "(" + (', '.join([str(x) for x in rollResult])) + ")"
			else:
				return CommandResponse(gcs(flavor.getFlavourTextForWrongParamError() % diceString))
		if remainderString != None:
			signString = match.groupdict()["sign"]
			nextQueryString = match.groupdict()["nextQuery"]
			if signString == '-':
				return parseDiceString(nextQueryString, False, resultSoFar, rollString, resultString)
			else:
				return parseDiceString(nextQueryString, True, resultSoFar, rollString, resultString)
		else:
			if firstQuery:
				return CommandResponse(gcs("rolled " + rollString + ": ") + str(resultSoFar))
			else:
				return CommandResponse(gcs("rolled " + rollString + ": ") + str(resultSoFar) + gcs(" (" + resultString + ")"))
	else:
		return CommandResponse(gcs(flavor.getFlavourTextForWrongParamError() % queryString))

def rollInitiativeCommand(remainingCommandSegments :list[str], authorName :str):
	global recentInitList
	global recentInitStaleTime

	initiativeStat = None
	modifier = None
	insertValue = None
	cleanupIfStale = True
	includeSummary = True
	characterName = authorName
	
	modifierIndex = -1
	characterNameOverrideIndex = -1
	insertOverrideIndex = -1

	#parse params
	for i in range(len(remainingCommandSegments)):
		currentSegmentRaw = remainingCommandSegments[i]
		currentSegment = currentSegmentRaw.lower()
		#check for custom inputs first
		if i == characterNameOverrideIndex:
			characterName = currentSegmentRaw
		
		elif i == modifierIndex:
			try:
				modifier = int(currentSegment)
			except ValueError:
				return CommandResponse(gcs(flavor.getFlavourTextForWrongParamError()) % currentSegmentRaw)
		
		elif (i == insertOverrideIndex) :
			try:
				insertValue = int(currentSegment)
			except ValueError:
				return CommandResponse(gcs(flavor.getFlavourTextForWrongParamError()) + currentSegmentRaw)
		
		elif (currentSegment == "character"
			or currentSegment == "char"
			or currentSegment == "c"):
			characterNameOverrideIndex = i + 1
		
		elif currentSegment == "nosummary":
			includeSummary = False
		
		elif currentSegment == "mod":
			modifierIndex = i + 1
		
		elif (currentSegment == "noclean"
			or currentSegment == "nocleanup"):
			cleanupIfStale = False
		
		elif currentSegment == "insert":
			insertOverrideIndex = i + 1
		
		elif (currentSegment == "review"
			or currentSegment == "summary"):
			return CommandResponse(getInitSummaryString())
		
		elif (currentSegment == "clear"
			or currentSegment == "cleanup") :
			recentInitList = {}
			return CommandResponse(gcs("_Purging combat..._"))
		
		elif (currentSegment == "help") :
			return CommandResponse(gcs("Followed by a number stating you standard initiative modifier, this parameter is not required if a mod argument was used" +
				"\n**__Possible Parameters:__**" +
				"\n**character/char/c/:** followed by a charactername." +
				"\n**nosummary:** additional parameter to supress the normal initiative order summary." +
				"\n**mod:** followed by a number, set an initiative modifier for yourself (like for weapons), either included in the roll or modified on your previously rolled initiative." +
				"\n**insert:** instead of rolling for initiative, insert into the initiative at the given initiative number." +
				"\n**review/summary:** shows the current initiative order, no other arguments required, no initiative rolled." +
				"\n**clear/cleanup:** clears the current initiative order, no other arguments required, no initiative rolled." +
				"\n\n__Example:__*\\init 5 char Thug1 mod -2* (rolls initiative for Thug1, who has a initiative modifier of 5, wielding a weapon that modifies it with -2)"))
		
		else:
			#set init stat
			modMatch = re.search("^\+?(\d+)$", currentSegment)
			if modMatch:
				newInit = int(modMatch.group(1))
				if initiativeStat == None:
					initiativeStat = newInit
				else:
					return CommandResponse(gcs("initiative modifier is being set multiple times (from" + str(initiativeStat) + " to " + str(newInit)))
			else:
				return CommandResponse(gcs(flavor.getFlavourTextForWrongParamError()) % currentSegment)
	
	#parameter parsing done, process result
	if (initiativeStat == None
		and modifier == None
		and insertValue == None) :
		#no instruction parameters given
		return CommandResponse(gcs(flavor.getFlavourTextForMissingParamError()))
	else:
		replyStringSuffix = ""
		unmodifiedInitiative = 0

		#get the unmodified initiative
		if (initiativeStat == None
			and insertValue == None):
			#we have nothing to base our unmodified Initiative on, search for it in the recent list
			cleanupIfStale = False
			if characterName in recentInitList:
				unmodifiedInitiative = recentInitList[characterName]["unmodified"]
			else:
				return CommandResponse(gcs(flavor.getFlavourTextForError()))
		
		elif insertValue != None:
			#we have an insert value, use that
			unmodifiedInitiative = insertValue
		else:
			#we're rolling initiative for this character
			roll = 0
			rolls = 0
			while roll == 0 or roll == 10:
				roll = random.randint(1, 10)
				rolls += 1
				unmodifiedInitiative += roll
			unmodifiedInitiative += initiativeStat
			if rolls == 2:
				replyStringSuffix += gcs(" (rerolled 1 time)")
			elif rolls > 2:
				replyStringSuffix += gcs(" (rerolled ") + str(rolls - 1) + gcs(" times)")
		
		if modifier == None:
			modifier = 0
		
		totalInitiative = unmodifiedInitiative + modifier

		if includeSummary:
			if cleanupIfStale and recentInitStaleTime < datetime.datetime.now():
				recentInitList = {}
			recentInitStaleTime = datetime.datetime.now() + datetime.timedelta(minutes=recentInitResetTimeMinutes)
			recentInitList[characterName] = { "name": characterName, "total": totalInitiative, "unmodified": unmodifiedInitiative, "tieBreaker": random.random() }
			replyStringSuffix += "\r\n" + getInitSummaryString()
		
		return CommandResponse(gcs(characterName, False) + gcs(" initiative: ") + str(totalInitiative) + replyStringSuffix)

def getInitSummaryString() -> str :
	sortedList = list(recentInitList.values())
	if len(sortedList) == 0:
		return gcs("No initiative is currently being tracked.")
	else:
		retVal = gcs("**Current combat consists of:**")
		def initSort(init):
			return -(init["total"] + (0.0001 * (-init["unmodified"] + init["tieBreaker"])))
		#as a tie breaker, use modifiers, and failing that, at random (typically through dice-offs), we don't need to calculate modifiers, we can just take the inverse unmodified values (same as calculating for both, but totals cancel each other out)
		sortedList.sort(key=initSort)
		for item in sortedList:
			if item["total"] != item["unmodified"]:
				retVal += "\r\n" + str(item["total"]) + gcs(": ") + gcs(item["name"], False) + gcs(" (") + str(item["total"] - item["unmodified"]) + gcs(")")
			else:
				retVal += "\r\n" + str(item["total"]) + gcs(": ") + gcs(item["name"], False)
		
		return retVal

def setCorruptionCommand(commandSegments :list[str]) -> CommandResponse:
	global corruptionFraction
	if len(commandSegments) == 1:
		return CommandResponse(gcs(flavor.getFlavourTextForMissingParamError()))
	try:
		newCorruption = float(commandSegments[1])
	except:
		return CommandResponse(gcs(flavor.getFlavourTextForWrongParamError() % commandSegments[1]))
	if newCorruption < 0 or newCorruption > 1:
		return CommandResponse(gcs("Corruption must be set to a value between 0 and 1, not ", False) + str(newCorruption))
	else:
		corruptionFraction = newCorruption
		return CommandResponse(gcs("Corruption succesfully set to %.2f", False) % newCorruption)

#abbreviation for 'Get Corrupted String', the function that is responsible for corrupting this bot's response messages
def gcs(input :str, allowFullCorruption :bool = True) -> str :
	output = [""] * len(input)
	excludeNextCounter = 0
	for i in range(len(input)):
		c =input[i]
		#stabilty is a value between 0 and 1, higher means more resistant to corruption
		stability = random.random()
		if excludeNextCounter > 0:
			stability = 1
			excludeNextCounter -= 1
		elif c in corruptionImmuneCharacters:
			stability = 1
		elif c in corruptionResistantCharacters:
			stability **= 0.5
		elif c == '%' and len(input) > i + 1 and input[i+1] in 'sdfxX.':
			#preserve string formatting
			if input[i+1] == '.':
				roundedMatch = re.match("(.\d+f)", input[i+1:])
				if roundedMatch:
					stability = 1
					excludeNextCounter = len(roundedMatch.group(1))
			else:
				stability = 1
				excludeNextCounter = 1
		
		if allowFullCorruption and max(0, corruptionFraction - fullCorruptionStart) * (1 / (1 - fullCorruptionStart)) > stability:
			output[i] = random.choice(corruptionCharacters) #full corruption, substitute a new character
		elif corruptionFraction > stability: #corruption
			if c in allCorruptionSubstitutionChars:
				for subs in corruptionSubstitutions:
					if c.lower() in subs:
						#substitute c for one of it's substitutions (including itself, to not always guarantee it will change, as well as allow for case swapping later)
						c = random.choice(subs)

			if min(corruptionFraction, 0.75) > stability: #we cap the corruption for case swapping so as to not turn this into a guaranteed swapcase at high corruption levels
				c = c.swapcase() #corrupted but not yet fully corrupted, swap case
			output[i] = c
		else:
			output[i] = c #corruption not high enough, character is unaltered
			
	return ''.join(output)

async def shutdownCommand(guilds :list[discord.Guild]):
	await stopSound()
	for guild in guilds:
		for member in guild.members: # pragma: no cover
			if (member != None
				and member.id in renameDict):
				await member.edit(nick = renameDict[member.id].original)

async def cleanupCommand(commandSegments :list[str], channel :discord.TextChannel) -> CommandResponse:
	if len(commandSegments) != 2:
		return CommandResponse(gcs(flavor.getFlavourTextForMissingParamError()))
	
	#check how much history we should erase
	LengthToEraseMinutes = 0
	currentValue = 0
	for char in commandSegments[1].lower():
		if char.isnumeric():
			currentValue *= 10
			currentValue += int(char)
		else:
			if char == 'w':
				LengthToEraseMinutes += currentValue * 10080
			elif char == "d":
				LengthToEraseMinutes += currentValue * 1440
			elif char == "h":
				LengthToEraseMinutes += currentValue * 60
			elif char == "m":
				LengthToEraseMinutes += currentValue
			elif char == "s":
				LengthToEraseMinutes += currentValue / 60
			else:
				return CommandResponse(gcs("Unrecognized history length time denotion '") + char + gcs("' out of ") + commandSegments[1])
			currentValue = 0
	
	#do the actual erasing
	CutoffTime = datetime.datetime.now() - datetime.timedelta(minutes=LengthToEraseMinutes)
	deletedCounter = 0
	if channel != None: # pragma: no cover
		if type(channel) == discord.TextChannel:
			messages = await channel.history(after=CutoffTime).flatten()
			deletedCounter = len(messages)
			await channel.delete_messages(messages)
			return CommandResponse(gcs("deleted ") + str(deletedCounter) + gcs(" sent by this bot over the last ") + str(LengthToEraseMinutes) + gcs(" minutes."))
		else:
			return CommandResponse(gcs("Cannot delete messages from DM channel"))
	else:
		return CommandResponse(gcs("no messages deleted, no channel argument provided."))

def handleCustomCommands(commandSegments :list[str]) -> CommandResponse:
	def recursiveParamCheck(remainingSegments :list[str], paramTree :dict) -> str:
		retVal = None
		nextSegment = remainingSegments[0].lower()
		for param in paramTree:
			if param.lower() == nextSegment:
				if len(remainingSegments) == 1:
					if "response" in paramTree[param]:
						retVal = paramTree[param]["response"]
					elif "default" in paramTree[param]:
						retVal = paramTree[param]["default"]
				else:
					if "paramTree" in paramTree[param]:
						retVal = recursiveParamCheck(remainingSegments[1:], paramTree[param]["paramTree"])
					if retVal == None and "default" in paramTree[param]:
						retVal = paramTree[param]["default"]
				break
		return retVal
	responseString = recursiveParamCheck(commandSegments, customCommands["customCommands"])
	if responseString:
		segmentMatch = re.search("<cmdSeg:\d>", responseString)
		if segmentMatch:
			for i in range(len(commandSegments)):
				segment = commandSegments[i]
				responseString = re.sub("<cmdSeg:%d>" % i, segment, responseString)
		return CommandResponse(gcs(responseString))
	else:
		return None

async def trySoundCommand(commandID :str, author :discord.Member) -> CommandResponse:
	if len(commandID) == 0:
		return False # pragma: no cover

	global lastPlayedSoundPath
	soundFilePaths = findSoundPathsToPlay(commandID.lower())
	if len(soundFilePaths) > 0:
		# Gets voice channel of message author
		voice_channel = None
		if author != None and author.voice != None:
			voice_channel = author.voice.channel # pragma: no cover
		if voice_channel != None: # pragma: no cover
				lastPlayedSoundPath = random.choice(soundFilePaths)
				return await playSound(voice_channel, lastPlayedSoundPath)
		else:
			return CommandResponse(gcs(flavor.getFlavourTextForVoiceChannelError()))
	else:
		return None

def trySoundListCommand() -> CommandResponse:
	global soundboardSoundsDir
	matches = []
	r = re.compile("^(\D+)(\d+)?\.mp3$")
	for filename in os.listdir(soundboardSoundsDir):
		searchMatch = r.search(filename)
		id = searchMatch.group(1)
		if id not in matches:
			matches.append(id)
		
	return CommandResponse(gcs("_**Behold, the list of my summons:**_\r\n" + "\r\n".join([x.lower() for x in sorted(matches)])))

def findSoundPathsToPlay(prefix :str) ->list[str]:
	global lastPlayedSoundPath
	global soundboardSoundsDir
	soundFilePaths = []
	for file in os.listdir(soundboardSoundsDir):
		path = os.path.join(soundboardSoundsDir, file)
		if file.lower().startswith(prefix) and path.endswith(".mp3") and path != lastPlayedSoundPath:
			soundFilePaths.append(path)
	if len(soundFilePaths) == 0 and lastPlayedSoundPath != None:
		if ("\\" + prefix) in lastPlayedSoundPath.lower(): # pragma: no cover
			soundFilePaths.append(lastPlayedSoundPath)
	return soundFilePaths
	
async def playSound(voice_channel :discord.VoiceChannel, soundPath :str, loops :int = 0 ): # pragma: no cover
	global playSoundTask
	if playSoundTask == None or playSoundTask.done():
		playSoundTask = asyncio.create_task(playSound_Internal(voice_channel, soundPath, loops))

async def playSound_Internal(voice_channel :discord.VoiceChannel, soundPath :str, loops :int = 0 ): # pragma: no cover
	global shouldStopSplaying
	shouldStopSplaying = False
	try:
		vc = await voice_channel.connect()
		vc.play(discord.FFmpegPCMAudio(executable="ffmpeg.exe", source=soundPath, before_options=("-stream_loop " + str(loops))))
		#buffer
		vc.pause()
		await sleep(.5)
		vc.resume()
		# Sleep while audio is playing.
		while vc.is_playing() and not shouldStopSplaying:
			await sleep(.1)
		await sleep(.5)
	except discord.errors.ClientException:
		return CommandResponse(gcs("A clientException occured, does the host have ffmpeg installed?"))
	finally:
		try:
			await vc.disconnect()
		except:
			pass

async def steveCommand(author :discord.Member) -> CommandResponse:
	global soundboardSoundsDir
	response = CommandResponse("https://media.tenor.com/j29kKldLXKMAAAAS/d4-steve.gif")
	# Gets voice channel of message author
	if author != None and author.voice != None:
		voice_channel = author.voice.channel # pragma: no cover
		if voice_channel != None: # pragma: no cover
			await playSound(voice_channel, os.path.join(soundboardSoundsDir, "steve.mp3"), -1)
	return response

async def stopSound() -> CommandResponse:
	global shouldStopSplaying
	global playSoundTask
	retVal = CommandResponse(silentSuccess=shouldStopSplaying==False)
	shouldStopSplaying = True
	if playSoundTask != None:
		await playSoundTask # pragma: no cover
	return retVal