# pull tournament type into tournament settings
# refactor rxjs pipe to use map and tap, instead of just tap so pipeline steps can be more generic - i.e. map to recordscoreparams instead of passing recordscore param along entire pipeline
# implement ranker factory, and have each tournament type configure which "options" in the pipeline are enabled ( which will require tournament options to be properly implemented), and maybe keep that info in the ranker?
# implement ranker options - make it part of ranker object, add methods to platform to set or get options from ranker
# modify unit tests to use sane testing of multi-env ( https://medium.com/@nyablk97/parameterized-tests-with-jasmine-ecadb2856980 and https://blog.harveydelaney.com/running-multiple-test-cases-in-jasmine/)
# add lots of unit tests
# implement integration tests
# cleanup unused code
# implement docs ( typedoc and neo-theme )
# add packaging info to package.json?
# make admin SDK friendly
# implement using cloud functions