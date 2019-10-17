console.log('loading secret...');
const secrets = require('./secret');

console.log('loading flavor text...');
const flavor = require('./flavorText');

console.log('loading tarot cards...');
const tarotCards = require('./TarotCards.json').cards;

console.log('initializing initiative tracking variables...');
const recentInitResetTimeMinutes = 5;
var recentInitList = [];
var recentInitStaleTime = Date.now();

console.log('initializing discord client...');
const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
	console.log('I am ready for operations');
});

function getRandomStringFromArray(stringArray) {
	return stringArray[Math.floor(Math.random() * stringArray.length)];
}

function getFlavourText(isChanceDie, successes) {
	var text = "";
	if (isChanceDie)
	{
		if (successes == 1)
		{
			text = getRandomStringFromArray(flavor.chanceSuccess());
		}
		else if (successes == -1)
		{
			text = getRandomStringFromArray(flavor.chanceDramaticFailure());
		}
		else
		{
			text = getRandomStringFromArray(flavor.chanceFailure());
		}
	}
	else
	{
		if (successes >= 5)
		{
			text = getRandomStringFromArray(flavor.exceptionalSuccess());
		}
		else if (successes > 0)
		{
			text = getRandomStringFromArray(flavor.success());
		}
		else
		{
			text = getRandomStringFromArray(flavor.failure());
		}
	}
	return "_" + text + "_";
}

function isMessageSentByAdmin(message) {
	var guild = client.guilds.get(secrets.getServerID())
	return (guild != undefined && message.author.id == guild.owner.id);
}

client.on('message', message => {
	var processedMessage = message.content.toLowerCase();
	var commandSegments = processedMessage.split(' ');
	commandSegments = commandSegments.filter( function(item) { return item.length > 0 } );

	if (message.author.bot
		|| !channelCheck(message))
	{
		return;
	}
	if (commandSegments[0] == '/roll'
			|| commandSegments[0] == 'roll'
			|| commandSegments[0] == '/r')
	{
		rollCommand(message, commandSegments);
	}
	else if (commandSegments[0] == "/shutdown")
	{
		if (isMessageSentByAdmin(message))
		{
			var messagePromise = message.channel.send("_Affirmative, shutting down._");
			messagePromise.then(function() {
				var shutdownPromise = client.destroy()
				shutdownPromise.then(function() {
					process.exit();
				});
			});
		}
		else
		{
			message.channel.send("_Threat detected, defense mechanisms active._");
		}
	}
	else if (commandSegments[0] == '/cleanup')
	{
		if (isMessageSentByAdmin(message))
		{
			cleanupCommand(message, commandSegments);
		}
		else
		{
			message.channel.send("_Sanitation protocol postponed, insufficient authentication provided._");
		}
	}
	else if (commandSegments[0] == '/refuse')
	{
		message.channel.send("_The pawn can refuse as much as it wants, it changes nothing._");
	}
	else if (commandSegments[0] == '/impossible')
	{
		message.channel.send("_The pawn is correct, impossiblility is a constant._");
	}
	else if (commandSegments[0] == '/care')
	{
		message.channel.send("_Interesting, apathy has already set in for the subject._");
	}
	else if (commandSegments[0] == '/tarot')
	{
		tarotCommand(message);
	}
	else if (commandSegments[0] == '/init'
			|| commandSegments[0] == '/initiative')
	{
		if (commandSegments.length >= 2)
		{
			rollInitiativeCommand(message, commandSegments.slice(1, commandSegments.length));
		}
		else
		{
			message.channel.send("_Initiative is taken, not given._");
		}
	}
	//debug commands
	else if (commandSegments[0] == "/test")
	{
		if (isMessageSentByAdmin(message))
		{
			message.channel.send("_Test performed_");
		}
		else
		{
			message.channel.send("_what, exactly?_");
		}
	}
});

function cleanupCommand(message, commandSegments) {
	if (commandSegments.length != 2)
	{
		message.channel.send("Input does not fit expected format, operation aborted.");
		return;
	}

	//check how much history we should erase
	var LengthToEraseMinutes = 0;
	{
		var currentValue = 0;
		for (const char of commandSegments[1])
		{
			var parsedInt = parseInt(char)
			if (!isNaN(parsedInt))
			{
				currentValue *= 10;
				currentValue += parsedInt;
			}
			else
			{
				switch (char)
				{
					case "w":
							LengthToEraseMinutes += currentValue * 10080;
						break;
					case "d":
							LengthToEraseMinutes += currentValue * 1440;
						break;
					case "h":
							LengthToEraseMinutes += currentValue * 60;
						break;
					case "m":
							LengthToEraseMinutes += currentValue;
						break;
					case "s":
							LengthToEraseMinutes += currentValue / 60;
						break;
					default:
						message.channel.send("Unrecognized history length time denotion '" + char + "' out of " + commandSegments[1]);
						return;
				}
				currentValue = 0;
			}
		}
	}

	//do the actual erasing
	var CutoffTime = new Date( Date.now() - 1000 * 60 * LengthToEraseMinutes );
	message.channel.fetchMessages()
		.then(messages => {
			var pastMessages = messages.filter(m => m.author.id === client.user.id);
			var deletedCounter = 0;
			for (let [snowflake, pastMessage] of pastMessages)
			{
				if (pastMessage.createdAt > CutoffTime)
				{
					pastMessage.delete();
					deletedCounter++;
				}
			}
			console.log("deleted " + deletedCounter + " sent by this bot over the last " + LengthToEraseMinutes + " minutes.");
			})
		.catch(console.error);
}

function tarotCommand(message) {
	var tarotIndex = Math.floor(Math.random() * 22);
	var card = tarotCards[tarotIndex];
	var messageText = "**" + card.name + "**\r\n";
	var inverted = Math.random() >= 0.5;
	if (inverted)
	{
		messageText += "Reversed: " + card.reversed;
	}
	else
	{
		messageText += "Upright: " + card.upright;
	}
	messageText += "\r\n_more info: <" + card.link + ">_";
	message.channel.send(messageText);
}

function rollCommand(message, commandSegments) {
	//handle rolling for initiative
	if (commandSegments.length >= 3
		&& (commandSegments[1] === 'init'
			|| commandSegments[1] === 'i'
			|| commandSegments[1] === 'initiative'))
	{
		rollInitiativeCommand(message, commandSegments.slice(2, commandSegments.length));
		return;
	}

	var rollAmount = -1;
	var rote = false;
	var explodeThres = 10;
	for (var i = 1; i < commandSegments.length; i++)
	{
		if (i == 1)
		{
			var diceNr = parseInt(commandSegments[i]);
			if (isNaN(diceNr))
			{
				if (commandSegments[i] === 'chance')
				{
					rollAmount = 0;
				}
			}
			else
			{
				rollAmount = diceNr;
			}
		}
		else if (commandSegments[i] === 'rote'
				 || commandSegments[i] === 'r')
		{
			rote = true;
		}
		else if (commandSegments[i] === '8a'
				 || commandSegments[i] === '8again')
		{
			explodeThres = 8;
		}
		else if (commandSegments[i] === '9a'
				 || commandSegments[i] === '9again')
		{
			explodeThres = 9;
		}
		else if (commandSegments[i] === 'no10'
				 || commandSegments[i] === 'no10again'
				 || commandSegments[i] === 'no10-again'
				 || commandSegments[i] === 'no-10-again')
		{
			explodeThres = 11;
		}
	}
	
	if (rollAmount < 0)
	{
		//no second parameter given
		message.channel.send("_The gears require more blood for lubrication._");
	}
	else if (rollAmount >= 100
			 && !isMessageSentByAdmin(message))
	{
		message.channel.send("_The subject is delusional with grandeur, yet pity will not be granted._");
	}
	else
	{
		var rollResults = roll(rollAmount, rote, explodeThres);
		message.channel.send(getReturnMessage(rollAmount, rote, explodeThres, rollResults));
	}
}

function rollInitiativeCommand(message, remainingCommandSegments) {
	var initiativeStat = NaN;
	var modifier = NaN;
	var insertValue = NaN;
	var cleanupIfStale = true;
	var includeSummary = true;
	var characterName = message.author.username;

	var modifierIndex = -1;
	var characterNameOverrideIndex = -1;
	var insertOverrideIndex = -1;
	
	//parse params
	for (var i = 0; i < remainingCommandSegments.length; i++)
	{
		var currentSegment = remainingCommandSegments[i];
		//check for custom inputs first
		if (i == characterNameOverrideIndex)
		{
			characterName = currentSegment;
		}
		else if (i == modifierIndex)
		{
			modifier = parseInt(currentSegment);
			if (isNaN(modifier))
			{
				message.channel.send("invalid modifier parameter: " + currentSegment);
			}
		}
		else if (i == insertOverrideIndex)
		{
			insertValue = parseInt(currentSegment);
			if (isNaN(insertValue))
			{
				message.channel.send("invalid insert parameter: " + currentSegment);
			}
		}
		else if (currentSegment == "character"
				|| currentSegment == "char"
				|| currentSegment == "c"
				|| currentSegment == "charname"
				|| currentSegment == "char"
				|| currentSegment == "charactername"
				|| currentSegment == "for")
		{
			characterNameOverrideIndex = i + 1;
		}
		else if (currentSegment == "nosummary")
		{
			includeSummary = false;
		}
		else if (currentSegment == "mod")
		{
			modifierIndex = i + 1;
		}
		else if (currentSegment == "noclean"
				|| currentSegment == "nocleanup")
		{
			cleanupIfStale = false;
		}
		else if (currentSegment == "insert")
		{
			insertOverrideIndex = i + 1;
		}
		else if (currentSegment == "review"
				|| currentSegment == "summary")
		{
			message.channel.send(getInitSummaryString());
			return;
		}
		else if (currentSegment == "clear"
				|| currentSegment == "cleanup")
		{
			message.channel.send("_Purging combat..._");
			recentInitList = [];
			return;
		}
		else
		{
			//specific inputs failed, assume its the modifier, so try that next
			var newInit = parseInt(currentSegment);
			if (isNaN(newInit))
			{
				if (currentSegment.startsWith('+'))
				{
					//one last try, remove the '+' and try again
					newInit = parseInt(currentSegment.substring(1, currentSegment.length - 1))
				}
			}
			
			if (isNaN(newInit))
			{
				message.channel.send("unknown parameter: \'" + currentSegment + "\'");
				return;
			}
			else if (isNaN(initiativeStat))
			{
				initiativeStat = newInit;
			}
			else
			{
				message.channel.send("initiative modifier is being set multiple times (from" + initiativeStat + " to " + newInit);
			}
		}
	}
	
	if (isNaN(initiativeStat)
		&& isNaN(modifier)
		&& isNaN(insertValue))
	{
		message.channel.send("_Anything that endeavors to break the rules, will find themselves broken instead._");
	}
	else
	{
		var replyStringSuffix = "";
		var unmodifiedInitiative = 0;

		//get the unmodified initiative
		if (isNaN(initiativeStat)
			&& isNaN(insertValue))
		{
			//we have nothing to base our unmodified Initiative on, search for it in the recent list
			cleanupIfStale = false;
			const foundEntry = recentInitList[characterName];
			if (foundEntry)
			{
				unmodifiedInitiative = foundEntry.unmodified;
			}
			else
			{
				message.channel.send("_Anything that endeavors to break the rules, will find themselves broken instead._");
				return;
			}
		}
		else if (!isNaN(insertValue))
		{
			//we have an insert value, use that
			unmodifiedInitiative = insertValue;
		}
		else
		{
			//we're rolling initiative for this character
			var roll = 0;
			var rolls = 0;
			do
			{
				roll = Math.floor(Math.random() * 10) + 1;
				rolls++;
				unmodifiedInitiative += roll;
			} while (roll == 10);
			
			unmodifiedInitiative += initiativeStat;

			if (rolls == 2)
			{
				replyStringSuffix += " (rerolled 1 time)"
			}
			else if (rolls > 2)
			{
				replyStringSuffix += " (rerolled " + (rolls - 1) + " times)"
			}
		}
		
		if (isNaN(modifier))
		{
			modifier = 0;
		}

		var totalInitiative = unmodifiedInitiative + modifier;
	
		if (includeSummary)
		{
			if (cleanupIfStale
				&& recentInitStaleTime < Date.now())
			{
				recentInitList = [];
			}
			recentInitStaleTime = new Date(Date.now() + recentInitResetTimeMinutes * 60000);
			recentInitList[characterName] = {name: characterName, total: totalInitiative, unmodified: unmodifiedInitiative};

			replyStringSuffix += "\r\n" + getInitSummaryString();
		}

		message.channel.send(characterName + " initiative: " + totalInitiative + replyStringSuffix);
	}
}

function getInitSummaryString() {
	var sortedList = Object.values(recentInitList);
	if (sortedList.length == 0)
	{
		return "No initiative is currently being tracked.";
	}
	else
	{
		var retVal = "**Current combat consists of:**";
		sortedList.sort((a,b) => a.total - b.total);
		for (var i = 0; i < sortedList.length; i++)
		{
			const item = sortedList[i];
			if (item.total != item.unmodified)
			{
				retVal += "\r\n" + item.total + ": " + item.name + " (" + (item.total - item.unmodified) + ")";
			}
			else
			{
				retVal += "\r\n" + item.total + ": " + item.name;
			}
		}
		return retVal;
	}
}

function roll(rollAmount, rote, explodeThres) {
	var successes = 0;
	var diceValues = [];
	
	if (rollAmount == 0
		&& rote)
	{
		rote = false;
		rollAmount = 1;
	}
	
	if (rollAmount == 0)
	{
		//chance die
		var roll = Math.floor(Math.random() * 10) + 1;
		
		if (roll == 10)			successes = 1;
		else if (roll == 1)		successes = -1;
		else					successes = 0;
		
		diceValues.push(roll);
	}
	else
	{
		//dice pool
		var explodedDice = 0;
		var rollsStr = "";
		for (var r = 0; r < rollAmount + explodedDice; r++)
		{
			var roll = Math.floor(Math.random() * 10) + 1;
			
			if (roll >= 8)
			{
				successes++;
				if (roll >= explodeThres)
				{
					explodedDice++;
				}
			}
			else if (rote
					 && r < rollAmount)//re-roll once, exploded dice don't benefit again from the rote quality
			{
				explodedDice++;
			}
			
			diceValues.push(roll);
		}
	}
	
	return [rollAmount == 0, successes, diceValues];
}

function getReturnMessage(rollAmount, rote, explodeThres, rollResults) {
	var chanceDie = rollResults[0];
	var successes = rollResults[1];
	var diceValues = rollResults[2];
	
	return getRollTypeString(chanceDie, rollAmount, rote, explodeThres) + " resulted in " + getResultText(successes) + " (" + getRollString(chanceDie, diceValues, rollAmount, rote, explodeThres) + ") " + getFlavourText(chanceDie, successes);
}

function getRollString(chanceDie, diceValues, rollAmount, rote, explodeThres) {
	var rollsStr = "";
	if (chanceDie)
	{
		if (diceValues[0] == 10)
		{
			rollsStr = "**" + diceValues[0] + "**";
		}
		else
		{
			rollsStr = diceValues[0];
		}
	}
	else
	{
		for (var d = 0; d < diceValues.length; d++)
		{
			var roll = diceValues[d];
			
			//check for rollAmount > 0 in case of promoted chance die
			if (d == rollAmount
				&& rollAmount > 0)
			{
				//we now start rolling exploded dice
				rollsStr = rollsStr.substring(0, rollsStr.length - 2) + " + ";
			}
		
			if (roll >= 8)
			{
				if (roll >= explodeThres)	rollsStr += "__**" + roll + "**__, ";
				else						rollsStr += "**" + roll + "**, ";
			}
			else if (rote
					 && d < rollAmount)
			{
				//re-roll due to rote
				rollsStr += "__" + roll + "__, ";
			}
			else
			{
				rollsStr += roll + ", ";
			}
		}
	
		rollsStr = rollsStr.substring(0, rollsStr.length - 2);
	}
	return rollsStr;
}

function getRollTypeString(chanceDie, rollAmount, rote, explodeThres) {
	if (chanceDie)
	{
		return "chance die";
	}
	else if (rollAmount == 0
			 && rote)
	{
		return "promoted chance die";
	}
	else
	{
		var rollTypeString = rollAmount + " rolls";
		if (rote
			|| explodeThres != 10)
		{
			rollTypeString += "(";
			if (rote)
			{
				rollTypeString += "rote";
			}
			if (explodeThres != 10)
			{
				if (rote)
				{
					rollTypeString += ", ";
				}
				if (explodeThres > 10)
				{
					rollTypeString += "no 10 again";
				}
				else
				{
					rollTypeString += explodeThres + "-again";
				}
			}
			rollTypeString += ") ";
		}
		return rollTypeString;
	}
}

function getResultText(successes) {
	if (successes >= 5)
	{
		return "an exceptional success of " + successes;
	}
	else if (successes > 0)
	{
		return successes + " successes";
	}
	else if (successes == 0)
	{
		return "a failure";
	}
	else
	{
		return "a dramatic failure";
	}
}

function channelCheck(message) {
	return message.guild == undefined
		|| (message.guild.available
			&& (isMessageSentByAdmin(message)
				|| message.channel.name == "test"
				|| (message.channel.parent != undefined
					&& message.channel.parent.name == "Role Playing")));
}

client.login(secrets.getToken());