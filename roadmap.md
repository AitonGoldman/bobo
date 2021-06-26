V1
# make admin SDK friendly
# implement using cloud functions
# spike on design for ui - check
# add lots of unit tests
# implement integration tests
# cleanup unused code and make sure class and interface definitions are where they need to be
# implement docs ( typedoc and neo-theme )

V1.5 ( selfie ranker)
# implement selfie ranker
* record score
* add ability to have "pending" scores in results
# implement "approve score" with admin module ( i.e. like the ranker, but for modifiying scores)
# implement emailing and endpoint for "approving" scores 

V2
# get rid of poor mans serialize/deserialize in ranker - replace with fancy serialize/deserialize that converts to minimal output ( i.e. bit encoded )
# fix platform unit tests that have a static results serialized string so it uses functions shared with ranker unit tests - check
# implement tournament enable/disbaled
# implement machine enable/disabled/removed
# implement edit score
# need factories for anything that takes arguments so that we can make constructors that take no args to make them class-transformer "safe"
# make ranker options part of tournament options object
# make ranker and tournament options a simple map, with map initialized to tournament type specific options bu constructor

V3
# re-implement transaction decorator to be function of datastore client
# re-implement platform to use proxy objects ( to allow for switch between local vs cloud functions )
# rethink document cache ( i.e. needs to work at the platform level, not at the client level)
# implement stripe purchasing
# refctor tasks into "shared", "recordScore", "startGame" modules
# ? have each tournament type configure which "options" in the pipeline are available  - so each tournament setting will look like "option : {available:boolean,enabled:boolean}"
# ? implement "factories" for tournament/ranker options
# add packaging info to package.json?
