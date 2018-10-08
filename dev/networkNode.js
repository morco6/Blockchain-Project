/*
 * Title: Blockchain Project
 * Description: Api for the project
 * Author: Mor Cohen
 * Date: 21/9/18
 */

/*Dependencies*/
const express = require('express'); //server.
const bodyParser = require('body-parser'); //for POSTMAN.
const Blockchain = require('./blockchain'); //blockchain file.
const uuid = require('uuid/v1'); //generate unique user id.
const rp = require('request-promise');
var path = require('path');
const sha256 = require('sha256');

const port = process.argv[2];
const app = express();

const privateKey = uuid().split('-').join(''); //privateKey
const nodeAddress = sha256(privateKey); //create address for node(computer), publicKey



const bitcoin = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/*Main Blockchain*/
app.get('/blockchain', (req, res) => {
    res.send(bitcoin);
});

/*Implement a transaction*/
app.post('/transaction', (req, res) => {

    const newTransaction = req.body;
    const blockIndex = bitcoin.addTransactionToPendingTransactions(newTransaction);

    res.json({
        note: `Transaction will be added in block ${blockIndex}.`
    });
});

/*Init transaction for every endpoint*/
app.post('/transaction/broadcast', (req, res) => {

    const amount = parseFloat(req.body.amount);
    const newTransaction = bitcoin.createNewTransaction(amount, req.body.sender, req.body.recipient);
    if (req.body.sender !== "system-reward") {
        const privateKey_Is_Valid = sha256(req.body.privKey) === req.body.sender;
        if (!privateKey_Is_Valid) {
            res.json({
                note: false
            });
        }
    }
    
    const addressData = bitcoin.getAddressData(req.body.sender);
    /*if (addressData.addressBalance < amount) {
        res.json({
            note: false
        });*/
    if (req.body.amount.length === 0 || amount === 0 || amount < 0 || req.body.sender.length === 0 || req.body.recipient.length === 0) {
        res.json({
            note: false
        });
    
    }
    else if(amount > 0)
    {
        bitcoin.addTransactionToPendingTransactions(newTransaction);
        
        const requestPromises = [];

        bitcoin.networkNodes.forEach(networkNodeUrl => {
            const requestOptions = {
                uri: networkNodeUrl + '/transaction',
                method: 'POST',
                body: newTransaction,
                json: true
            };
            requestPromises.push(rp(requestOptions));
        });
        Promise.all(requestPromises)
            .then(data => {
                res.json({ note: 'Transaction created and broadcast successfully.' });
            });
    }
});

/*
 * Title: Miner section
 * Description: user mine the last block of transaction by POW, getting reward and init a new block
 */ 
app.get('/mine', (req, res) => {
    const lastBlock = bitcoin.getLastBlock();
    const previousBlockHash = lastBlock['hash'];
    const currentBlockData = {
        transactions: bitcoin.pendingTransactions,
        index: lastBlock['index'] + 1
    }

    const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce);
    const newBlock = bitcoin.createNewBlock(nonce, previousBlockHash, blockHash);

    const requestPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/receive-new-block',
            method: 'POST',
            body: { newBlock: newBlock },
            json: true
        };
        requestPromises.push(rp(requestOptions));
    });

    //reward the miner.
    Promise.all(requestPromises)
        .then(data => {
            const requestOptions = {
                uri: bitcoin.currentNodeUrl + '/transaction/broadcast',
                method: 'POST',
                body: {
                    amount: 12.5,
                    sender: "system-reward",
                    recipient: nodeAddress
                },
                json: true
            };
            return rp(requestOptions);
        })
        .then(data => {
            res.json({
                note: "New block mined and broadcast successfully",
                block: newBlock
            });
        });
});

app.post('/receive-new-block', (req, res) => {
    const newBlock = req.body.newBlock;
    const lastBlock = bitcoin.getLastBlock();
    const correctHash = lastBlock.hash === newBlock.previousBlockHash;
    const correctIndex = lastBlock['index'] + 1 === newBlock['index'];

    if (correctHash && correctIndex) {
        bitcoin.chain.push(newBlock);
        bitcoin.pendingTransactions = [];
        res.json({
            note: 'New block received and accepted.',
            newBlock: newBlock
        });
    }
    else {
        res.json({
            note: 'New block rejected',
            newBlock: newBlock
        });
    }
});


/*ADD NEW NODE TO THE NETWORK*/

/*(1)Register a node and broadcast it the network*/
app.post('/register-and-broadcast-node', (req, res) => {

    const newNodeUrl = req.body.newNodeUrl; 
    
    if (bitcoin.networkNodes.indexOf(newNodeUrl) == -1)
        bitcoin.networkNodes.push(newNodeUrl);

    const regNodesPromises = [];

    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/register-node',
            method: 'POST',
            body: { newNodeUrl: newNodeUrl },
            json: true
        };
        regNodesPromises.push(rp(requestOptions));
    });

    Promise.all(regNodesPromises)
        .then(data => {
        const bulkRegisterOptions = {
            uri: newNodeUrl + '/register-nodes-bulk',
            method: 'POST',
            body: { allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl] },
            json: true
        };
        return rp(bulkRegisterOptions);
    })
    .then(data => {
        res.json({
            note: 'New node registered with network successfully.'
        });
    });   
});

/*(2)Register a node with the network*/
app.post('/register-node', (req, res) => {

    const newNodeUrl = req.body.newNodeUrl;
    const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1; //if 'newNodeUrl' not exist in 'networkNodes' then 'nodeNotAlreadyPresent' will be true.
    const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl; //if the statement is true then 'notCurrentNode' will be true.

    if (nodeNotAlreadyPresent && notCurrentNode)
        bitcoin.networkNodes.push(newNodeUrl);

    res.json({ note: 'New node registered successfully with node.' });
});

/*(3)Register multiple nodes at once*/
app.post('/register-nodes-bulk', (req, res) => {

    const allNetworkNodes = req.body.allNetworkNodes; //array of allNetworkNodes URL that are already inside the blockchain network.

    allNetworkNodes.forEach(networkNodeUrl => {

        const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) === -1;
        const notCurrentNode = bitcoin.currentNodeUrl !== networkNodeUrl;

        if (nodeNotAlreadyPresent && notCurrentNode)
            bitcoin.networkNodes.push(networkNodeUrl);
    });

    res.json({ note: 'Bulk registrasion successful.' });
});

app.get('/consensus', (req, res) => {
    const requestPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/blockchain',
            method: 'GET',
            json: true
        };

        requestPromises.push(rp(requestOptions));
    });

    Promise.all(requestPromises)
        .then(blockchains => {
            const currentChainLength = bitcoin.chain.length;
            let maxChainLength = currentChainLength;
            let newLongestChain = null;
            let newPendingTransactions = null;

            blockchains.forEach(blockchain => {
                if (blockchain.chain.length > maxChainLength) {
                    maxChainLength = blockchain.chain.length;
                    newLongestChain = blockchain.chain;
                    newPendingTransactions = blockchain.pendingTransactions;
                };
            });

            if (!newLongestChain || (newLongestChain && !bitcoin.chainIsValid(newLongestChain))) {
                res.json({
                    note: 'Current chain has not been replaced.',
                    chain: bitcoin.chain
                });
            }
            else {
                bitcoin.chain = newLongestChain;
                bitcoin.pendingTransactions = newPendingTransactions;
                res.json({
                    note: 'This chain has been replaced.',
                    chain: bitcoin.chain
                });
            }
        });
});

/*get block by blockHash*/
app.get('/block/:blockHash', (req, res) => {
    const blockHash = req.params.blockHash;
    const correctBlock = bitcoin.getBlock(blockHash);
    res.json({
        block: correctBlock
    });
});

/*get transaction by transactionId*/
app.get('/transaction/:transactionId', (req, res) => {
    const transactionId = req.params.transactionId;
    const trasactionData = bitcoin.getTransaction(transactionId);
    res.json({
        transaction: trasactionData.transaction,
        block: trasactionData.block
    });
});

/*get pendingTransactions*/
app.get('/pendingTransactions', (req, res) => {
    const transactionsData = bitcoin.getPendingTransactions();
    res.json({
        pendingTransactions: transactionsData
    });
});

/*get address by address*/
app.get('/address/:address', (req, res) => {
    const address = req.params.address;
    const addressData = bitcoin.getAddressData(address);
    res.json({
        addressData: addressData
    });
});

/*block explorer*/

app.use(express.static(path.join(__dirname, 'Front')));

app.get('/Front', (req, res) => {
    res.sendFile('./Front/index.html', { root: __dirname });
});

app.get('/get_private&public_Key', (req, res) => {
            res.json({
                privateKey: privateKey,
                publicKey: nodeAddress
            });
});

/*
app.listen(port, () => {
    console.log(`Listening to port ${port}...`);
    console.log(`PrivateKey: ${privateKey}`);
    console.log(`PublicKey: ${nodeAddress}`);
    console.log(process.env.PORT);
    console.log(process.argv);
});*/


srv = app.listen(process.env.PORT || port, () => {
    console.log(`Listening to port ${port}...`);
    console.log(`PrivateKey: ${privateKey}`);
    console.log(`PublicKey: ${nodeAddress}`);
    console.log(process.env.PORT);
    console.log(process.argv);
});