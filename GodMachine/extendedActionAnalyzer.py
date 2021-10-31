import math
import time

chanceCutoff = 0.000001


def getPrunedSuccesses(arr :list[int]):
	#find trailing indices under the cutoff
	for i in reversed(range(len(arr))):
		if arr[i] >= chanceCutoff:
			#first index with high enough value
			return arr[:i + 1]
	return []

def findCombinationsUtil(arr :list, index :int, spacesAllowed :int, target :int, remaining :int, allCombos :list) -> None:
	if remaining == 0:
		#found a new combo, save it in allCombos
		allCombos.append([arr[x] if x < index else 0 for x in range(spacesAllowed)])
		return

	if remaining < 0 or index >= spacesAllowed:
		return

	#to prevent duplicate combinations, we only check if we can remove numbers equal or higher than the previous number we added, we will use the multinomial coefficient formula later on to compensate for this
	prev = 1 if index == 0 else arr[index - 1]
 
	for k in range(prev, target + 1):
		arr[index] = k
		findCombinationsUtil(arr, index + 1, spacesAllowed, target, remaining - k, allCombos)

def findCombinations(target :int, spacesAllowed :int, allCombos :list) -> None:
	arr = [-1] * spacesAllowed
	findCombinationsUtil(arr, 0, spacesAllowed, target, target, allCombos)

def multinomialCoefficient(multiset :list) -> int:
	multiplicities = {x:multiset.count(x) for x in multiset}
	return math.factorial(len(multiset)) / math.prod([math.factorial(x) for x in multiplicities.values()])

class Distribution:
	def __init__(self, nDice: int, successChance: float, explodeChance: float, firstFailIgnore: bool):
		self.successes = []
		if nDice <= 0:
			if successChance > 0:
				nDice = 1
				if firstFailIgnore:
					#rote converts to normal roll
					firstFailIgnore = False
				else:
					#chance die
					explodeChance = 0
					successChance = 0.1
		if nDice > 0:
			#write down chances for getting <index> amount of successes with one dice
			singleDice = []
			#p = chance of rerolling the dice again
			p = 1.0
			chanceOfRollBeingLastSuccess = successChance * (1 - explodeChance)
			#write in chance of getting no successes, or one success
			if not firstFailIgnore:
				singleDice.append(1.0 - successChance)
				singleDice.append(chanceOfRollBeingLastSuccess)
				p = explodeChance
			else:
				#firstfailIgnore
				failChance = (1.0 - successChance) ** 2
				singleDice.append(failChance)
				singleDice.append((1.0 - failChance) * (1 - explodeChance))
				#chance of rerolling after this point = chance of getting an explode on the first try + chance of getting an explode after the ignored failure
				p = explodeChance + (explodeChance * (1.0 - successChance))
			
			while p >= chanceCutoff:
				singleDice.append(p * chanceOfRollBeingLastSuccess)
				p *= explodeChance
			
			#singleDice done, now we add them together
			if nDice == 1:
				self.successes = singleDice
			else:
				#first, all die neet to fail for a roll to be a failure
				self.successes.append(singleDice[0] ** nDice)
				#next, the successes
				targetSuccesses = 1
				while sum(self.successes) < 0.5 or self.successes[targetSuccesses - 1] >= chanceCutoff:
					possibleCombos = []
					findCombinations(targetSuccesses, nDice, possibleCombos)
					#we know all combinations that will result in the target amount of successes, now we need to find the chance for rolling those combinations and sum them
					comboChances = []
					for combo in possibleCombos:
						p = 1
						combo += [0] * (nDice - len(combo))
						for diceTarget in combo:
							if diceTarget >= len(singleDice):
								#rolling this target is too difficult, default to a chance of 0
								p = 0
								break
							else:
								p *= singleDice[diceTarget]
						coefficient = multinomialCoefficient(combo)
						comboChances.append(p * coefficient)
					self.successes.append(sum(comboChances))
					targetSuccesses += 1

	def __repr__(self) -> str:
		retVal = ""
		for i in range(len(self.successes)):
			retVal += str(i) + ":\t" + ("%.4f" % self.successes[i]) + "  >  " + ("%.4g" % sum(self.successes[i:])) + ("\n" if i < len(self.successes) - 1 else "")
		return retVal

	def getLinePrint(self) -> str:
		retVal = ""
		for i in range(1, len(self.successes)):
			retVal += ("%.2f" % (sum(self.successes[i:]) * 100)) + "%,"
		return retVal

	#add = the result if two roll distributions were rolled together
	def __add__(self, other):
		if len(other.successes) == 0:
			retVal = Distribution(0, 0, 0, False)
			retVal.successes = [x for x in self.successes]
			return retVal
		if len(self.successes) == 0:
			retVal = Distribution(0, 0, 0, False)
			retVal.successes = [x for x in other.successes]
			return retVal

		retVal = [0] * (len(self.successes) + len(other.successes) - 1)
		for i in range(len(self.successes)):
			for j in range(len(other.successes)):
				retVal[i + j] += self.successes[i] * other.successes[j]
		
		return getPrunedSuccesses(retVal)

	#add = the result if two roll distributions were rolled together
	def __iadd__(self, other):
		if len(other.successes) == 0:
			return self
		if len(self.successes) == 0:
			self.successes = [x for x in other.successes]
			return self
		
		retVal = [0] * (len(self.successes) + len(other.successes) - 1)
		for i in range(len(self.successes)):
			for j in range(len(other.successes)):
				retVal[i + j] += self.successes[i] * other.successes[j]
		self.successes = getPrunedSuccesses(retVal)
		return self
	
	#combine = summing the chances of the distribution together to form a new distribution instead of adding the results together as well 
	#should only be used to construct distributions up to a valid one where all chances add up to 1 again.
	def combine(self, other):
		if (len(other.successes) > len(self.successes)):
			self.successes += [0] * (len(other.successes) - len(self.successes))
		for i in range(len(other.successes)):
			self.successes[i] += other.successes[i]
		return self
		
	def __mul__(self, scalar :float):
		retSucc = [0] * len(self.successes)
		for i in range(len(self.successes)):
			retSucc[i] = self.successes[i] * scalar
		retVal = Distribution(0, 0, 0, False)
		retVal.successes = getPrunedSuccesses(retSucc)
		return retVal

	__rmul__ = __mul__

	def __imul__(self, scalar :float):
		retSucc = [0] * len(self.successes)
		for i in range(len(self.successes)):
			self.successes[i] *= scalar
		self.successes = getPrunedSuccesses(self.successes)
		return self

def getExtendedActionDistribution(basePool :int, poolModifier :int, explodeChance :float, rote :bool, fumbleModifier :int, extraRolls :int):
	totalDistribution = Distribution(0, 0, 0, False)
	if fumbleModifier != 0:
		fumbleRollDistributions = [Distribution(basePool + poolModifier + (fumbleModifier * i), 0.3, explodeChance, rote) for i in range(max(1, basePool + extraRolls))]
		nFumbleDistributions = [0] * max(1, basePool + extraRolls)
		nFumbleDistributions[0] = 1
		for r in range(basePool + extraRolls):
			rollDelta = Distribution(0, 0, 0, False)
			for nFumbles in range(len(fumbleRollDistributions)):
				rollDelta.combine(fumbleRollDistributions[nFumbles] * nFumbleDistributions[nFumbles])
			totalDistribution += rollDelta
			#propagate fumbles, back to front
			for nFumbles in reversed(range(basePool + extraRolls)):
				if nFumbleDistributions[nFumbles] > 0:
					fumbleRollDistribution = fumbleRollDistributions[nFumbles]
					fumbleChance = fumbleRollDistribution.successes[0]
					if nFumbles < basePool + extraRolls - 1:
						nFumbleDistributions[nFumbles + 1] += nFumbleDistributions[nFumbles] * fumbleChance
					nFumbleDistributions[nFumbles] *= 1 - fumbleChance		   
	else:
		rollDistribution = Distribution(basePool + poolModifier, 0.3, explodeChance, rote)
		for r in range(max(1, basePool + extraRolls)):
			totalDistribution += rollDistribution
	return totalDistribution

def getExtendedActionSuccessProbabilitiesString(basePool :int, poolModifier :int, eThres :float, rote :bool, fumbleModifier :int, patientModifier :int) -> str:
	explodeChance = 0.1 * (11 - eThres)

	result = getExtendedActionDistribution(basePool, poolModifier, explodeChance, rote, fumbleModifier, patientModifier)
	#header text
	retVal = "**__Extended Action Success Chances for__** (" + str(basePool)
	#modifier
	if poolModifier != 0:
		if poolModifier > 0:
			retVal += "+" + str(poolModifier)
		else:
			retVal += str(poolModifier)
	#explodes
	if eThres != 10:
		retVal += " " + str(eThres) + "a"
	#rote
	if rote:
		retVal += " r"
	#patient
	if patientModifier != 0:
		retVal += ", " + str(patientModifier) + " extra rolls"
	#fumble
	if fumbleModifier != 0:
		retVal += ", cumulative " + str(fumbleModifier) + " on failed rolls"
	retVal += ")\n"

	for i in range(1, len(result.successes)):
		retVal += str(i) + ": %.2f" % ((1 - sum(result.successes[:i])) * 100) + ("%\n" if (i < len(result.successes) - 1) else "%")
	return retVal