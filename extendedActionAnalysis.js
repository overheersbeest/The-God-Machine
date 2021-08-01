const chanceCutoff = 0.0001

function findCombinationsUtil(arr, index, spacesAllowed, target, remaining, allCombos)
{
    if (remaining == 0)
    {
        //found a new combo, save it in allCombos
        let newCombo = arr.slice(0, index).concat(new Array(spacesAllowed - index).fill(0))
        allCombos.push(newCombo)
        return
    }

    if (remaining < 0 || index >= spacesAllowed)
    {
        return
    }

    //to prevent duplicate combinations, we only check if we can remove numbers equal or higher than the previous number we added, we will use the multinomial coefficient formula later on to compensate for this
    prev = index == 0 ? 1 : arr[index - 1]
 
    for (let k = prev; k < target + 1; ++k)
    {
        arr[index] = k
        findCombinationsUtil(arr, index + 1, spacesAllowed, target, remaining - k, allCombos)
    }
}

function findCombinations(target, spacesAllowed, allCombos)
{
    arr = new Array(spacesAllowed).fill(-1)
    findCombinationsUtil(arr, 0, spacesAllowed, target, target, allCombos)
}

function factorial(num)
{
    if (num === 0 || num === 1)
      return 1;
    for (var i = num - 1; i >= 1; i--)
    {
      num *= i;
    }
    return num;
  }

function multinomialCoefficient(multiset)
{
    let multiplicities = {};
    for (let i = 0; i < multiset.length; i++) {
        let num = multiset[i];
        multiplicities[num] = multiplicities[num] ? multiplicities[num] + 1 : 1;
    }
    let denominator = 1;
    for (let m in multiplicities)
    {
        denominator *= factorial(multiplicities[m]);
    }
    return factorial(multiset.length) / denominator;
}

function getPrunedSuccesses(arr)
{
    //find trailing indices under the cutoff
    for (let i = arr.length - 1; i >= 0; --i)
    {
        if (arr[i] >= chanceCutoff)
        {
            //first index with high enough value
            return arr.slice(0, i + 1)
        }
    }
    return []
}

class Distribution
{
    constructor(nDice, successChance, explodeChance, firstFailIgnore)
    {
        this.successes = []
        if (nDice <= 0)
        {
            if (successChance > 0)
            {
                nDice = 1
                if (firstFailIgnore)
                {
                    //rote converts to normal roll
                    firstFailIgnore = false
                }
                else
                {
                    //chance die
                    explodeChance = 0
                    successChance = 0.1
                }
            }
        }
        if (nDice > 0)
        {
            //write down chances for getting <index> amount of successes with one dice
            let singleDice = []
            //p = chance of rerolling the dice again
            let p = 1.0
            let chanceOfRollBeingLastSuccess = successChance * (1 - explodeChance)
            //write in chance of getting no successes, or one success
            if (!firstFailIgnore)
            {
                singleDice.push(1.0 - successChance)
                singleDice.push(chanceOfRollBeingLastSuccess)
                p = explodeChance
            }
            else
            {
                //firstfailIgnore
                let failChance = (1.0 - successChance) ** 2
                singleDice.push(failChance)
                singleDice.push((1.0 - failChance) * (1 - explodeChance))
                //chance of rerolling after this point = chance of getting an explode on the first try + chance of getting an explode after the ignored failure
                p = explodeChance + (explodeChance * (1.0 - successChance))
            }
            
            while (p >= chanceCutoff)
            {
                singleDice.push(p * chanceOfRollBeingLastSuccess)
                p *= explodeChance
            }
            
            //singleDice done, now we add them together
            if (nDice == 1)
            {
                this.successes = singleDice
            }
            else
            {
                //first, all die neet to fail for a roll to be a failure
                this.successes.push(Math.pow(singleDice[0], nDice))
                //next, the successes
                let targetSuccesses = 1
                while (sum(this.successes) < 0.5 || this.successes[targetSuccesses - 1] >= chanceCutoff)
                {
                    let possibleCombos = []
                    findCombinations(targetSuccesses, nDice, possibleCombos)
                    //we know all combinations that will result in the target amount of successes, now we need to find the chance for rolling those combinations and sum them
                    let comboChances = []
                    for (let c = 0; c < possibleCombos.length; c++)
                    {
                        let combo = possibleCombos[c]
                        let p = 1
                        for (let d = 0; d < combo.length; d++)
                        {
                            let diceTarget = combo[d]
                            if (diceTarget >= singleDice.length)
                            {
                                //rolling this target is too difficult, default to a chance of 0
                                p = 0
                                break
                            }
                            else
                            {
                                p *= singleDice[diceTarget]
                            }
                        }
                        let coefficient = multinomialCoefficient(combo)
                        comboChances.push(p * coefficient)
                    }
                    this.successes.push(sum(comboChances))
                    targetSuccesses += 1
                }
            }
        }
    }

    add(other)
    {
        if (other.successes.length == 0)
            return
        if (this.successes.length == 0)
        {
            this.successes = other.successes
            return
        }
        
        let retVal = new Array(this.successes.length + other.successes.length - 1).fill(0)
        for (let i = 0; i <this.successes.length; ++i)
        {
            for (let j = 0; j < other.successes.length; ++j)
            {
                let before = retVal[i + j]
                retVal[i + j] += this.successes[i] * other.successes[j]
                if (isNaN(retVal[i + j]))
                {
                    continue
                }
            }
        }
        this.successes = getPrunedSuccesses(retVal)
    }
    
    combine(other)
    {
        if (other.successes.length > this.successes.length)
        {
            this.successes = this.successes.concat(new Array(other.successes.length - this.successes.length).fill(0))
        }
        for (let i = 0; i < other.successes.length; ++i)
        {
            this.successes[i] += other.successes[i]
        }
        return this
    }
        
    scale(scalar)
    {
        let retSucc = new Array(this.successes.length).fill(0)
        for (let i = 0; i < this.successes.length; ++i)
        {
            retSucc[i] = this.successes[i] * scalar
        }
        let retVal = new Distribution(0, 0, 0, false)
        retVal.successes = getPrunedSuccesses(retSucc)
        return retVal
    }
}

function sum(arr)
{
    return arr.reduce((a, b) => a + b, 0)
}

function getExtendedActionDistribution(basePool, poolModifier, explodeChance, rote, fumbleModifier, patientModifier)
{
    let totalDistribution = new Distribution(0, 0, 0, false)
    if (fumbleModifier != 0)
    {
        fumbleRollDistributions = []
        for (let i = 0; i < Math.max(1, basePool + patientModifier); ++i)
        {
            fumbleRollDistributions.push(new Distribution(basePool + poolModifier + (fumbleModifier * i), 0.3, explodeChance, rote))
        }
        nFumbleDistributions = new Array(Math.max(1, basePool)).fill(0)
        nFumbleDistributions[0] = 1
        for (let r = 0; r < basePool + patientModifier; ++r)
        {
            rollDelta = new Distribution(0, 0, 0, false)
            for (let nFumbles = 0; nFumbles < fumbleRollDistributions.length; ++nFumbles)
            {
                rollDelta.combine(fumbleRollDistributions[nFumbles].scale(nFumbleDistributions[nFumbles]))
            }
            totalDistribution.add(rollDelta)
            //propagate fumbles, back to front
            for (let nFumbles = basePool + patientModifier - 1; nFumbles >= 0; --nFumbles)
            {
                if (nFumbleDistributions[nFumbles] > 0)
                {
                    fumbleRollDistribution = fumbleRollDistributions[nFumbles]
                    fumbleChance = fumbleRollDistribution.successes[0]
                    if (nFumbles < basePool + patientModifier - 1)
                    {
                        nFumbleDistributions[nFumbles + 1] += nFumbleDistributions[nFumbles] * fumbleChance
                    }
                    nFumbleDistributions[nFumbles] *= 1 - fumbleChance
                }
            }
        }
    }
    else
    {
        rollDistribution = new Distribution(basePool + poolModifier, 0.3, explodeChance, rote)
        for (let r = 0; r < Math.max(1, basePool + patientModifier); ++r)
        {
            totalDistribution.add(rollDistribution)
        }
    }
    return totalDistribution
}

module.exports = {
    getExtendedActionSuccessProbabilities: function(basePool, poolModifier, eThres, rote, fumbleModifier, patientModifier)
    {
        explodeChance = 0.1 * (11 - eThres)

        result = getExtendedActionDistribution(basePool, poolModifier, explodeChance, rote, fumbleModifier, patientModifier)
        //header text
        let retVal = "**__Extended Action Success Chances for__** (" + basePool
        //modifier
        if (poolModifier != 0)
        {
            if (poolModifier > 0)
            {
                retVal += "+" + poolModifier
            }
            else
            {
                retVal += poolModifier
            }
        }
        //explodes
        if (eThres != 10)
        {
            retVal += " " + eThres + "a"
        }
        //rote
        if (rote)
        {
            retVal += " r"
        }
        //patient
        if (patientModifier != 0)
        {
            retVal += ", " + patientModifier + " extra rolls"
        }
        //fumble
        if (fumbleModifier != 0)
        {
            retVal += ", cumulative " + fumbleModifier + " on failed rolls"
        }
        retVal += ")\n"

        for (let i = 1; i < result.successes.length; ++i)
        {
            retVal += i + ": " + (sum(result.successes.slice(i)) * 100).toFixed(2) + ((i < result.successes.length - 1) ? "%\n" : "%")
        }
        return retVal
    }
}
