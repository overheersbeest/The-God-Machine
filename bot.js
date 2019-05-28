const secrets = require('./secret');
const flavor = require('./flavorText');

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
	if (message.author.bot
		|| !channelCheck(message))
	{
		return;
	}
	if (message.content.startsWith('/roll ')
			|| message.content.startsWith('roll ')
			|| message.content.startsWith('/r '))
	{
		rollCommand(message);
	}
	else if (message.content == "/shutdown")
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
	else if (isMessageSentByAdmin(message))
	{
		//debug commands
		if (message.content == "/test")
		{
			if (message.channel.parent != undefined)
			{
				message.channel.send(message.channel.parent.name);
			}
			else
			{
				message.channel.send("roota");
			}
		}
	}
});

function rollCommand(message) {
	var rollAmount = -1;
	var rote = false;
	var explodeThres = 10;
	var segments = message.content.split(' ');
	segments = segments.filter( function(item) { return item.length > 0 } );
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
	else
	{
		var rollResults = roll(rollAmount, rote, explodeThres);
		message.channel.send(getReturnMessage(rollAmount, rote, explodeThres, rollResults));
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