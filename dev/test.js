const Blockchain = require('./blockchain');

const bitcoin = new Blockchain();

console.log(bitcoin);


//TEST - hash block method.
/*
const previousBlockHash = '0HNF945HF74NF93HF048KXDH34';
const currentBlockData = [
    {
        amount: 10,
        sender: 'ALEX4357FH48GN59VN490',
        recipient: 'MOR5893HND0320DHF204'
    },
    {
        amount: 50,
        sender: 'RUBIK74G5484GHF84F823R',
        recipient: 'YACOV5F43789F4349038'
    },
    {
        amount: 100,
        sender: 'HERTZEL745GBF032HF04F',
        recipient: 'HAIM74HBF94H9039F8HF9'
    }
];
*/
//console.log(bitcoin.proofOfWork(previousBlockHash, currentBlockData));

//console.log(bitcoin.hashBlock(previousBlockHash, currentBlockData, 43167));


/*
bitcoin.createNewBlock(2389, 'HF5389HTF853', 'BF57FG57GFB');

bitcoin.createNewTransaction(100, 'ALEX89G734G', 'MOR4G378FG3478FG');

bitcoin.createNewBlock(6789, 'A2343S43D', 'D4D43D4D');
*/

//console.log(bitcoin.chain[1]);
