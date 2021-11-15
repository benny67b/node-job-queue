import mongoose from 'mongoose';
import config from 'config.json';

export let mongooseConnection: mongoose.Mongoose;

if (config.env === 'dev') {
  mongoose.set('debug', true);
}


export async function initStorage() {
  mongooseConnection = await mongoose.connect(`${config.mongodb.uri}/${config.mongodb.dbName}`);
}
