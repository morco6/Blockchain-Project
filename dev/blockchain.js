/*
 * Title: Blockchain Project
 * Description: Blockchain data structure
 * Author: Mor Cohen
 * Date: 21/9/18
 */
const uuid = require('uuid/v1'); //generate unique transaction id.
const sha256 = require('sha256');
const currentNodeUrl = process.argv[3];


/*function constructor for my Blockchain.*/
function Blockchain() {
    this.chain = [];
    this.pendingTransactions = [];
    this.currentNodeUrl = currentNodeUrl;
    this.networkNodes = [];
    this.createNewBlock(100, '0', '0'); //Genesis block.
}

/*init a new block to the chain and insert pending transactions into the block.*/
Blockchain.prototype.createNewBlock = function (nonce, previousBlockHash, hash) {
    const newBlock = {
        index: this.chain.length + 1,
        timestamp: Date.now(),
        date: new Date().toString(),
        transactions: this.pendingTransactions,
        nonce: nonce,
        hash: hash,
        previousBlockHash: previousBlockHash
    }
    this.pendingTransactions = []; //reset the pendingTransactions for the next block.
    this.chain.push(newBlock); //push to the blockchain the new block.
    return newBlock;
}

/*returns the last block of the chain.*/
Blockchain.prototype.getLastBlock = function () {
    return this.chain[this.chain.length - 1];
}

/*init a transaction into pendingTransactions.*/
Blockchain.prototype.createNewTransaction = function (amount, sender, recipient) {
    const newTransaction = {
        transactionId: uuid().split('-').join(''),
        amount: amount,
        date: new Date().getDay().toString() + "." + new Date().getMonth().toString() + "." + new Date().getFullYear().toString(),
        sender: sender,
        recipient: recipient
    }

    return newTransaction;
}

Blockchain.prototype.addTransactionToPendingTransactions = function (transactionObject) {
    this.pendingTransactions.push(transactionObject); //push to the pendingTransactions array a new transaction
    return this.getLastBlock()['index'] + 1;
}

/*hash block method.*/
Blockchain.prototype.hashBlock = function (previousBlockHash, currentBlockData, nonce) {
    const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData); //merge parameters into a single string.
    const hash = sha256(dataAsString);
    return hash;
}

/*Proof Of Work method.*/
Blockchain.prototype.proofOfWork = function (previousBlockHash, currentBlockData) {
    let nonce = 0;
    let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    while (hash.substring(0, 4) !== '0000') { //generate a new hash until the first 4 chars of the hash will be equals to '0000'. 
        nonce++;
        hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
    }
    return nonce;
}

Blockchain.prototype.chainIsValid = function (blockchain) {

    let validChain = true;

    for (var i = 1; i < blockchain.length; i++) {
        const currentBlock = blockchain[i];
        const prevBlock = blockchain[i - 1];
        const blockHash = this.hashBlock(prevBlock['hash'], { transactions: currentBlock['transactions'], index: currentBlock['index'] }, currentBlock['nonce']);
        if (blockHash.substring(0, 4) !== '0000') validChain = false;
        if (currentBlock['previousBlockHash'] !== prevBlock['hash']) validChain = false;
    };

    //check genesis block validation 
    const genesisBlock = blockchain[0];
    const correctNonce = genesisBlock['nonce'] === 100;
    const correctPreviousBlockHash = genesisBlock['previousBlockHash'] === '0';
    const correctHash = genesisBlock['hash'] === '0';
    const correctTransactions = genesisBlock['transactions'].length === 0;

    if (!correctNonce || !correctPreviousBlockHash || !correctHash || !correctTransactions) validChain = false;

    return validChain;
};

Blockchain.prototype.getBlock = function (blockHash) {
    let correctBlock = null;
    this.chain.forEach(block => {
        if (block.hash === blockHash)
            correctBlock = block;
    });
    return correctBlock;
};

Blockchain.prototype.getTransaction = function (transactionId) {
    let correctTransaction = null;
    let correctBlock = null;

    this.chain.forEach(block => {
        block.transactions.forEach(transaction => {
            if (transaction.transactionId === transactionId) {
                correctTransaction = transaction;
                correctBlock = block;
            };
        });
    });

    return {
        transaction: correctTransaction,
        block: correctBlock
    };
};

Blockchain.prototype.getPendingTransactions = function () {
    return this.pendingTransactions;
};

Blockchain.prototype.getAddressData = function (address) {
    const addressTransactions = [];
    this.chain.forEach(block => {
        block.transactions.forEach(transaction => {
            if (transaction.sender === address || transaction.recipient === address) {
                addressTransactions.push(transaction); //push all tranasction by sender or recipient into array.
            };
        });
    });

    var amountArr = [];
    
    let balance = 0;
    addressTransactions.forEach(transaction => {
        if (transaction.recipient === address) {
            balance += transaction.amount;
            amountArr.push(balance);
        }
        else if (transaction.sender === address) {
            balance -= transaction.amount;
            amountArr.push(balance);
        }
    
    });

    return {
        addressTransactions: addressTransactions,
        addressBalance: balance,
        amountArr: amountArr
    };
};


module.exports = Blockchain;