const mongoose = require('mongoose');
const initData = require('./data.js');
const Listing = require("../models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust"
async function main(){
    await mongoose.connect(MONGO_URL);
}
main()
.then(() => console.log("Connection successful"))
.catch(err => console.error(err));


const initDB = async() => {
    await Listing.deleteMany({});
    initData.data = initData.data.map((obj) => ({...obj, owner: "6866321dbafadf858c6ad935"}));
    await Listing.insertMany(initData.data);
    console.log("Data was initialized");
}

initDB();