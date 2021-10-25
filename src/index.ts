
import { config } from 'dotenv';
config();
//import { polygon } from './blockchain_connection';
import { Moralis } from 'moralis/node';

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
        console.log(allNFTs[0]);
        return;
        if (allNFTs.length >= nftOwners.total) {
            gettingNFTs = false;
        }
    }
    console.log("Got all " + allNFTs.length.toString() + " Microbuddies metadata");
})();
