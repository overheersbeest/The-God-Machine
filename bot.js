console.log('loading secret...');
const secrets = require('./secret');

console.log('loading flavor text...');
const flavor = require('./flavorText');

console.log('loading tarot cards...');
const tarotCards = require('./TarotCards.json').cards;

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
	if (message.author.bot
		|| !channelCheck(message))
	{
		return;
	}
	if (processedMessage.startsWith('/roll ')
			|| processedMessage.startsWith('roll ')
			|| processedMessage.startsWith('/r '))
	{
		rollCommand(message);
	}
	else if (processedMessage == "/shutdown")
	{
		if (isMessageSentByAdmin(message))
		{
			var messagePromise = processedMessage.send("_Affirmative, shutting down._");
			messagePromise.then(function() {
				var shutdownPromise = client.destroy()
				shutdownPromise.then(function() {
					process.exit();
				});
			});
		}
		else
		{
			processedMessage.send("_Threat detected, defense mechanisms active._");
		}
	}
	else if (processedMessage.startsWith('/cleanup '))
	{
		if (isMessageSentByAdmin(message))
		{
			cleanupCommand(message);
		}
		else
		{
			message.channel.send("_Sanitation protocol postponed, insufficient authentication provided._");
		}
	}
	else if (processedMessage.startsWith('/refuse'))
	{
		message.channel.send("_The pawn can refuse as much as it wants, it changes nothing._");
	}
	else if (processedMessage.startsWith('/impossible'))
	{
		message.channel.send("_The pawn is correct, impossiblility is a constant._");
	}
	else if (processedMessage.startsWith('/care'))
	{
		message.channel.send("_Interesting, apathy has already set in for the subject._");
	}
	else if (processedMessage.startsWith('/tarot'))
	{
		tarotCommand(message);
	}
	else if (processedMessage.startsWith('/init ')
			|| processedMessage.startsWith('/initiative '))
	{
		var segments = processedMessage.split(' ');
		segments = segments.filter( function(item) { return item.length > 0 } );
		if (segments.length >= 2)
		{
			rollInitiativeCommand(message, segments[1]);
		}
		else
		{
			message.channel.send("_Initiative is taken, not given._");
		}
	}
	//debug commands
	else if (processedMessage == "/test")
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

function cleanupCommand(message) {
	var segments = message.content.split(' ');
	segments = segments.filter( function(item) { return item.length > 0 } );
	if (segments.length != 2)
	{
		message.channel.send("Input does not fit expected format, operation aborted.");
		return;
	}

	//check how much history we should erase
	var LengthToEraseMinutes = 0;
	{
		var currentValue = 0;
		for (const char of segments[1])
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
						message.channel.send("Unrecognized history length time denotion '" + char + "' out of " + segments[1]);
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

function rollCommand(message) {
	var segments = message.content.toLowerCase().split(' ');
	segments = segments.filter( function(item) { return item.length > 0 } );

	//handle rolling for initiative
	if (segments.length >= 3
		&& (segments[1] === 'init'
			|| segments[1] === 'i'
			|| segments[1] === 'initiative'))
	{
		rollInitiativeCommand(message, segments[2]);
		return;
	}

	var rollAmount = -1;
	var rote = false;
	var explodeThres = 10;
	for (var i = 1; i < segments.length; i++)
	{
		if (i == 1)
		{
			var diceNr = parseInt(segments[i]);
			if (isNaN(diceNr))
			{
				if (segments[i] === 'chance')
				{
					rollAmount = 0;
				}
			}
			else
			{
				rollAmount = diceNr;
			}
		}
		else if (segments[i] === 'rote'
				 || segments[i] === 'r')
		{
			rote = true;
		}
		else if (segments[i] === '8a'
				 || segments[i] === '8again')
		{
			explodeThres = 8;
		}
		else if (segments[i] === '9a'
				 || segments[i] === '9again')
		{
			explodeThres = 9;
		}
		else if (segments[i] === 'no10'
				 || segments[i] === 'no10again'
				 || segments[i] === 'no10-again'
				 || segments[i] === 'no-10-again')
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

function rollInitiativeCommand(message, param) {
	var initiative = parseInt(param);
	if (isNaN(initiative))
	{
		if (param.startsWith('+'))
		{
			//one last try, remove the '+' and try again
			initiative = parseInt(param.substring(1, param.length - 1))
		}
	}
	
	if (isNaN(initiative))
	{
		message.channel.send("_Anything that endeavors to break the rules, will find themselves broken instead._");
	}
	else
	{
		var roll = 0;
		var rolls = 0;
		do
		{
			roll = Math.floor(Math.random() * 10) + 1;
			rolls++;
			initiative += roll;
		} while (roll == 10);
	
		var rollAmountString = "";
		if (rolls >= 2)
		{
			rollAmountString = " (rerolled " + (rolls - 1) + " times)"
		}
		message.channel.send(message.author.username + " initiative: " + initiative + rollAmountString);
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