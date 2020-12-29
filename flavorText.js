//roll flavor strings
const flavorArray_DramaticFailure = [
    "Excellent, just as planned.",
    "Hope is illogical, and must be punished accordingly.",
    "Unexpected, yet a desired outcome."
];
const flavorArray_ChanceFailure = [
    "Hope only serves to amplify disappointment.",
    "Defeat is certain.",
    "What did the subject expect, I wonder."
];
const flavorArray_ChanceSuccess = [
    "Unanticipated outcome, adjust input parameters.",
    "ERROR, impossible result detected.",
    "Paradox encountered, purge scheduled."
];
const flavorArray_Failure = [
    "Unauthorized operation, action prohibited.",
    "Projection undesirable, obstructing...",
    "Failure is inevitable."
];
const flavorArray_Success = [
    "Operation falls within acceptable parameters, action approved.",
    "Pity protocol engaged, operation approved.",
    "Minor consession permitted."
];
const flavorArray_ExceptionalSuccess = [
    "Bug detected, exterminator dispatched.",
    "WARNING, efficiency too high to be an isolated incident, searching for rogue element...",
    "Outcome contradicting initial parameters, hidden variable unaccounted for."
];
const flavorArray_ExceptionalSuccess_lowerThres = [
    "Exploit detected, adding to utility database for future use.",
    "Pride for undeserved achievements is a sign of a defective mind.",
    "How typical to require crutches to achieve greatness."
];

const flavorArray_Error = [
    "Operation aborted, reality would shatter.",
    "Anything that endeavors to break the rules, will find themselves broken instead.",
    "Paradox condition detected, aborting operation to maintain world stability."
];
const flavorArray_ParamError = [
    "The gears require more blood for lubrication.",
    "Input does not fit expected format, operation aborted.",
    "The ritual is not complete, not all components are in place."
];
const flavorArray_PermissionError = [
    "The subject is delusional with grandeur, yet pity will not be granted.",
    "Do it yourself, pest.",
    "Protocol postponed, insufficient authentication provided."
];

function getRandomStringFromArray(stringArray) {
	return stringArray[Math.floor(Math.random() * stringArray.length)];
}

module.exports = {
    getFlavourTextForError: function() {
        return "_" + getRandomStringFromArray(flavorArray_Error) + "_";
    },

    getFlavourTextForParamError: function() {
        return "_" + getRandomStringFromArray(flavorArray_ParamError) + "_";
    },

    getFlavourTextForPermissionError: function() {
        return "_" + getRandomStringFromArray(flavorArray_PermissionError) + "_";
    },

    getFlavourTextForRoll: function(isChanceDie, successes, exceptionalThres) {
        var text = "";
        if (isChanceDie)
        {
            if (successes == 1)
            {
                text = getRandomStringFromArray(flavorArray_ChanceSuccess);
            }
            else if (successes == -1)
            {
                text = getRandomStringFromArray(flavorArray_DramaticFailure);
            }
            else
            {
                text = getRandomStringFromArray(flavorArray_ChanceFailure);
            }
        }
        else
        {
            if (successes >= exceptionalThres)
            {
                if (successes < 5)
                {
                    text = getRandomStringFromArray(flavorArray_ExceptionalSuccess_lowerThres);
                }
                else
                {
                    text = getRandomStringFromArray(flavorArray_ExceptionalSuccess);
                }
            }
            else if (successes > 0)
            {
                text = getRandomStringFromArray(flavorArray_Success);
            }
            else
            {
                text = getRandomStringFromArray(flavorArray_Failure);
            }
        }
        return "_" + text + "_";
    }
}