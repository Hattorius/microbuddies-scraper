
import { config } from 'dotenv';
config();
import { Moralis } from 'moralis/node';
import * as mysql from 'mysql';
import { chunk } from './functions';

var connection = mysql.createConnection({
    host: process.env.mysql_host,
    user: process.env.mysql_username,
    password: process.env.mysql_password,
    database: process.env.mysql_database
});

connection.connect();

async function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

(async () => {
    await Moralis.start({
        serverUrl: process.env.SERVER_URL,
        appId: process.env.APP_ID
    });
    const options = { chain: "mumbai", address: "0xdcfddb06af6f1a8d4be001c43b0f3e29bfbd96db" };
    const metaData = await Moralis.Web3API.token.getNFTMetadata(options);
    console.log("Receiving " + metaData.name);

    async function doStuff() {
        var allNFTs = [];
        var allTraits = [];
        var skipped = 0;
        while (true) {
            await sleep(1000);
            const options = { chain: "mumbai", address: "0xdcfddb06af6f1a8d4be001c43b0f3e29bfbd96db", offset: ((allNFTs.length + skipped)) , order: "block_number.DESC"};
            const nftOwners = await Moralis.Web3API.token.getNFTOwners(options);
            const NFTs = nftOwners.result;
            for (var i = 0; i < NFTs.length; i++) {
                if (NFTs[i].metadata == null) {
                    skipped++;
                    continue;
                }

                const nft = NFTs[i];
                const nftMetadata = JSON.parse(nft.metadata);
                allNFTs.push([
                    nft.token_id,
                    nft.owner_of,
                    nft.block_number,
                    nft.block_number_minted,
                    nftMetadata.name.split(' ')[0],
                    nftMetadata.name.split(' ').at(-1),
                    nftMetadata.description.split('"')[1],
                    nftMetadata.attributes[1].value,
                    JSON.stringify(nftMetadata.dominants),
                    JSON.stringify(nftMetadata.recessives),
                    nftMetadata.attributes.at(-1).value
                ]);

                const buddyTraits = nftMetadata.dominants.concat(nftMetadata.recessives);
                for (var ii = 0; ii < buddyTraits.length; ii++) {
                    const buddyTrait = buddyTraits[ii];
                    var mutation = 0;
                    if (buddyTrait.mutation) mutation = 1;
                    allTraits.push([
                        nftMetadata.name.split(' ').at(-1),
                        buddyTrait.type,
                        mutation,
                        buddyTrait.rarity,
                        buddyTrait.value.split(' ')[0],
                        buddyTrait.value.split(' ')[1],
                        nftMetadata.name.split(' ').at(-1)+buddyTrait.value
                    ]);
                }
            }

            if (allNFTs.length+skipped >= nftOwners.total) {
                break;
            }
            console.log((allNFTs.length+skipped).toString() + "/" + nftOwners.total.toString());
        }
        console.log("Received all Blockchain data and parsed it - pushing to database");
        const chunkedAllNFTs = chunk(allNFTs, 500);
        for (var i = 0; i < chunkedAllNFTs.length; i++) {
            connection.query("INSERT IGNORE INTO microbuddies (token_id, owner, block_updated, block_minted, name, type, quote, gen, attributes, recessive, background_type) VALUES ?", [chunkedAllNFTs[i]]);
        }
        const chunkedAllTraits = chunk(allTraits, 500);
        for (var i = 0; i < chunkedAllTraits.length; i++) {
            connection.query("INSERT IGNORE INTO traits (buddy_type, type, mutation, rarity, value, name, uniQid) VALUES ?", [chunkedAllTraits[i]]);
        }
        console.log("Pushed to database!");
    }
    while (true) {
        try {
            await doStuff();
        } catch (err) {
            console.log(err);
        }
        console.log("Sleeping for 20 seconds");
        await sleep(20000);
    }
    connection.end();
})();