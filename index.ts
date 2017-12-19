const express = require('express');
const bodyParser = require('body-parser');
const Client = require('bitcoin-core');

const app = express();

const port = process.env.PORT || 8080;
const BASE_HREF = '/api';

let isConnected: boolean = false;
let client = null;

// {
//     "host": "192.168.1.9",
//     "port": 1972,
//     "username": "bitcoinrpc",
//     "password": "rpc##PA%%wo1D"
// }

function connect(host: string, port: number, username: string, password: string): Promise<string> {

    let clientConn = new Client({
        network: 'mainnet',
        host,
        port,
        username,
        password,
        ssl: {
            enabled: false,
            strict: false
        }
    });

    return new Promise((resolve, reject) => {
        clientConn.getBlockchainInfo()
            .then(() => {
                client = clientConn;
                isConnected = true;
                resolve('Welcome to the blockchain. Vires in numeris');
            })
            .catch(err => {
                reject(err);
            });
    });
}

// configure app to use bodyParser()
// this will let us get the data from
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// error handling middleware
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Error: ' + err.message);
});

app.use('/health', (req, res) => {
    res.json({alive: true});
});

// check if we're connected (middleware)
app.use((req, res, next) => {
    if (isConnected || req.path.toLowerCase() === BASE_HREF + '/connect') {
        next();
    }
    else {
        res.status(401).send('Please connect first');
    }
});

// ROUTES FOR OUR API
// =============================================================================
const router = express.Router();

router.post('/connect', (req, res) => {
    let {host, port, username, password} = req.body;
    connect(host, port, username, password)
        .then(message => {
            res.json({connected: true, message});
        })
        .catch(error => {
            res.status(401).json({connected: false, error});
        });
});

router.get('/get-blockchain-info', (req, res) => {
    client.getBlockchainInfo().then(info => {
        res.json(info);
    });
});

router.get('/get-block/:blockhash', (req, res) => {
    client.getBlock(req.params.blockhash, true)
        .then(data => {
            res.json(data);
        })
        .catch(error => {
            res.status(400).json({error});
        })
});

router.get('/get-received-by-address/:address', (req, res) => {
    client.getReceivedByAddress(req.params.address, true)
        .then(data => {
            res.json(data);
        })
        .catch(error => {
            res.status(400).json({error});
        })
});


router.get('/get-block-count', (req, res) => {
    client.getBlockCount()
        .then(data => {
            res.json(data);
        })
        .catch(error => {
            res.status(400).json({error});
        })
});

router.get('/get-raw-transaction/:txid', (req, res) => {
    client.getRawTransaction(req.params.txid, true)
        .then(data => {
            res.json(data);
        })
        .catch(error => {
            res.status(400).json({error});
        })
});

// more routes for our API will happen here

// all of our routes will be prefixed with /api
app.use(BASE_HREF, router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);
