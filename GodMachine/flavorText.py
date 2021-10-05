import random

#roll flavor strings
flavorArray_DramaticFailure = [
	"Excellent, just as planned.",
	"Hope is illogical, and must be punished accordingly.",
	"Unexpected, yet a desired outcome."
]
flavorArray_ChanceFailure = [
	"Hope only serves to amplify disappointment.",
	"Defeat is certain.",
	"What did the subject expect, I wonder."
]
flavorArray_ChanceSuccess = [
	"Unanticipated outcome, adjust input parameters.",
	"ERROR, impossible result detected.",
	"Paradox encountered, purge scheduled."
]
flavorArray_Failure = [
	"Unauthorized operation, action prohibited.",
	"Projection undesirable, obstructing...",
	"Failure is inevitable."
]
flavorArray_Success = [
	"Operation falls within acceptable parameters, action approved.",
	"Pity protocol engaged, operation approved.",
	"Minor consession permitted."
]
flavorArray_ExceptionalSuccess = [
	"Bug detected, exterminator dispatched.",
	"WARNING, efficiency too high to be an isolated incident, searching for rogue element...",
	"Outcome contradicting initial parameters, hidden variable unaccounted for."
]
flavorArray_ExceptionalSuccess_lowerThres = [
	"Exploit detected, adding to utility database for future use.",
	"Pride for undeserved achievements is a sign of a defective mind.",
	"How typical to require crutches to achieve greatness."
]

flavorArray_Error = [
	"Operation aborted, reality would shatter.",
	"Anything that endeavors to break the rules, will find themselves broken instead.",
	"Paradox condition detected, aborting operation to maintain world stability."
]
flavorArray_MissingParamError = [
	"The gears require more blood for lubrication.",
	"Input does not fit expected format, operation aborted.",
	"The ritual is not complete, not all components are in place."
]
flavorArray_WrongParamError = [
	"Input '%s' does not fit expected format, operation aborted.",
	"Malicious Injection detected: '%s'.",
	"Protocols are not observed, element '%s' does not match parameters."
]
flavorArray_PermissionError = [
	"The subject is delusional with grandeur, yet pity will not be granted.",
	"Do it yourself, pest.",
	"Protocol postponed, insufficient authentication provided."
]

def getFlavourTextForError():
	return "_" + random.choice(flavorArray_Error) + "_"

def getFlavourTextForMissingParamError():
	return "_" + random.choice(flavorArray_MissingParamError) + "_"

def getFlavourTextForWrongParamError():
	return "_" + random.choice(flavorArray_WrongParamError) + "_"

def getFlavourTextForPermissionError():
	return "_" + random.choice(flavorArray_PermissionError) + "_"

def getFlavourTextForRoll(isChanceDie, successes, exceptionalThres):
	text = ""
	if (isChanceDie):
		if (successes == 1):
			text = random.choice(flavorArray_ChanceSuccess)
		elif (successes == -1):
			text = random.choice(flavorArray_DramaticFailure)
		else:
			text = random.choice(flavorArray_ChanceFailure)
	else:
		if (successes >= exceptionalThres):
			if (successes < 5):
				text = random.choice(flavorArray_ExceptionalSuccess_lowerThres)
			else:
				text = random.choice(flavorArray_ExceptionalSuccess)
		elif (successes > 0):
			text = random.choice(flavorArray_Success)
		else:
			text = random.choice(flavorArray_Failure)
	return "_" + text + "_"