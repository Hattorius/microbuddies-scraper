
import { config } from 'dotenv';
config();
import { Moralis } from 'moralis/node';
import * as mysql from 'mysql';

var connection = mysql.createConnection({
    host: process.env.mysql_host,
    user: process.env.mysql_username,
    password: process.env.mysql_password,
    database: process.env.mysql_database
});

connection.connect();

(async () => {
    await Moralis.start({
        serverUrl: process.env.SERVER_URL,
        appId: process.env.APP_ID
    });
    const options = { chain: "mumbai", address: "0xdcfddb06af6f1a8d4be001c43b0f3e29bfbd96db" };
    const metaData = await Moralis.Web3API.token.getNFTMetadata(options);
    console.log("Receiving " + metaData.name);

    var gettingNFTs = true;
    var allNFTs = [];
    while (gettingNFTs) {
        const options = { chain: "mumbai", address: "0xdcfddb06af6f1a8d4be001c43b0f3e29bfbd96db", offset: allNFTs.length };
        const nftOwners = await Moralis.Web3API.token.getNFTOwners(options);
        allNFTs = allNFTs.concat(nftOwners.result);
        if (allNFTs.length >= nftOwners.total) {
            gettingNFTs = false;
        }
    }
    console.log("Got all " + allNFTs.length.toString() + " Microbuddies metadata");

    var err = [];
    for (var i = 0; i < allNFTs.length; i++) {
        const nftMetadata = JSON.parse(allNFTs[i].metadata);
        var nft = {};
        try {
            nft = {
                token_id: allNFTs[i].token_id,
                owner: allNFTs[i].owner_of,
                block_updated: allNFTs[i].block_number,
                block_minted: allNFTs[i].block_number_minted,
                name: nftMetadata.name,
                type: nftMetadata.name.split(' ').at(-1),
                quote: nftMetadata.description.split('"')[1],
                gen: nftMetadata.attributes[1].value,
                attributes: JSON.stringify(nftMetadata.dominants),
                recessive: JSON.stringify(nftMetadata.recessives),
                background_type: nftMetadata.attributes.at(-1).value
            };
        } catch (grr) {
            err.push(allNFTs[i].token_id);
            continue;
        }
        connection.query("INSERT INTO microbuddies SET ?", nft, (err, res, f) => {  });

        const traits = nftMetadata.recessives.concat(nftMetadata.dominants);
        for (var ii = 0; ii < traits.length; ii++) {
            const recessive = traits[ii];
            var mutation = 0;
            if (recessive.mutation) mutation = 1;
            const traitValue = recessive.value.split(' ');
            const trait = {
                buddy_type: nftMetadata.name.split(' ').at(-1),
                type: recessive.type,
                mutation: mutation,
                rarity: recessive.rarity,
                value: traitValue[0],
                name: traitValue[1],
                uniQid: nftMetadata.name.split(' ').at(-1)+recessive.value
            };
            connection.query("INSERT INTO traits SET ?", trait, (err, res, f) => {  });
        }
    }
    console.log(err);
})();
