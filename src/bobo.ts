var STRIP_COMMENTS = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,\)]*(('(?:\\'|[^'\r\n])*')|("(?:\\"|[^"\r\n])*"))|(\s*=[^,\)]*))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
  var fnStr = func.toString().replace(STRIP_COMMENTS, '');
  var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  if(result === null)
     result = [];
  return result;
}

export function testDeco(target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<Function>) {
        descriptor.value = async function () {
            console.log(propertyName)
            console.log(arguments);
            console.log(getParamNames(target))
            return {}
        //return (await Axios.post('http://localhost:5001/pinballtd/us-central1/helloWorld',arguments)).data
            // .then(function (response) {
            //     // handle success
            //     console.log(response.data.value);
            // })
            // .catch(function (error) {
            //     // handle error
            //     console.log(error);
            // })
            // .then(function () {
            //     // always executed
            // });
        //console.log(arguments);
    }
}

export class testClass {
    @testDeco
    static testFunction(poopOne,poopTwo){
        console.log("HI THERE");
    }
}

