import getDiff, { applyDiff, log } from "../diff-lib";

const OLD_VALUES = {
    NULL: null,

    STRING1: "test_string_1",
    STRING2: "test_string_2",
    STRING3: "line\nline\nline\nline\nline\nline\nline\nline\nline\nline\n",
    STRING4: "line\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\n",

    NUMBER1: 1,
    NUMBER2: 2,

    ARRAY1_EMPTY: [],
    ARRAY2: [1, 2, 3],
    ARRAY3: [1, 2, 3, 4, 5, 6],
    ARRAY4: [1, 2, 3, {}, 5, 6,],
    ARRAY5: [1, 2, 3, {a: 3}, 5, 6,],

    OBJ1_EMPTY: {},
    OBJ2: {
        a: "hello"
    },
    OBJ3: {
        b: "world"
    },
    OBJ4: {
        a: 234,
        b: "world"
    },
    OBJ5: {
        a: "hello",
        b: "world",
        c: {
            d: 678
        }
    },
}

const VALUES = {
    S1: {
        "job1": {
            name: "Job 1",
            status: "Scheduled",
            logs: []
        }
    },
    S2: {
        "job1": {
            name: "Job 1",
            status: "Running",
            logs: []
        }
    },
    S3: {
        "job1": {
            name: "Job 1",
            status: "Running",
            logs: [
                "line1",
                "line2",
            ]
        }
    },
    S4: {
        "job1": {
            name: "Job 1",
            status: "Running",
            logs: [
                "line1",
                "line2",
                "line2",
                "line2",
                "line2",
                "line2",
            ]
        }
    },
    S5: {
        "job1": {
            name: "Job 1",
            status: "Running",
            logs: [
                "line1",
                "line2",
                "line2",
                "line2",
                "line2",
                "line2",
                "line2",
                "line2",
                "line2",
            ]
        }
    },
}

function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

function stringify(obj: any): string {
    try {
        return JSON.stringify(obj, Object.keys(obj).sort()) + "";
    } catch (err) {
        return JSON.stringify(obj) + "";
    }
}

let failed = 0;
let tested = 0;
for (const k1 in VALUES) {
    for (const k2 in VALUES) {
        tested++;
        
        let diff, recons;
        try {
            log.debug = () => { };
            const [obj1, obj2] = deepClone([VALUES[k1], VALUES[k2]]);
            diff = getDiff(obj1, obj2);
            recons = applyDiff(obj1, diff);
        } finally {
            
            if (stringify(recons) !== stringify(VALUES[k2])) {
                console.log(`${k1.padEnd(15, ' ')} -> ${k2.padEnd(15, ' ')}`);
                console.log(`\t Failed`);
                failed++;

                try {
                    log.debug = (...args) => {
                        console.debug('\t', ...args);
                    };
                    const [obj1, obj2] = deepClone([VALUES[k1], VALUES[k2]]);
                    const _diff = getDiff(obj1, obj2);
                    console.log('\t Diff = ', _diff);
                    const _recons = applyDiff(obj1, diff);
                    console.log('\t recons = ', _recons);
                } catch (err) { }

            } else {
                console.log(`${k1.padEnd(15, ' ')} -> ${k2.padEnd(15, ' ')}`, '\t Diff = ', JSON.stringify(diff));
                // console.log(');
                // console.log(`${k1.padEnd(15, ' ')} -> ${k2.padEnd(15, ' ')} | ${stringify(VALUES[k2]).length} -> ${stringify(diff).length}`);
            }
        }
    }
}

console.log(`Failed: ${failed} / ${tested}`)

if (failed > 0) {
    process.exit();
}