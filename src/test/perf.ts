

const COUNT = 1000000/2;

var dictionary1 = {}
var dictionary2 = {}
for (var i = 0; i < COUNT; i++){
    dictionary1[String(i)] = i;
}

for (; i < COUNT*2; i++){
    dictionary2[String(i)] = i;
}

for (; i < COUNT*3; i++){
    dictionary1[String(i)] = i;
    dictionary2[String(i)] = i;
}

const s1 = performance.now()

for (var iterationNumber = 0 ; iterationNumber < 10; iterationNumber++){
    for(const key in dictionary1) {
        dictionary1[key];
        dictionary2[key];
    }

    for(const key in dictionary2) {
        dictionary1[key];
        dictionary2[key];
    }
}

const s2 = performance.now()
console.log(`On average it took ${(s2 - s1)/10} ms`)