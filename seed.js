const mongoose = require('mongoose')
const dotenv = require('dotenv')

dotenv.config()

const Size = require('./models/Size')
const { NUMERIC_SIZES, ALPHABETIC_SIZES } = require('./sizes')

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    })
    console.log('Conectado a MongoDB')
    
    await Size.deleteMany({})
    await Size.insertMany([...NUMERIC_SIZES, ...ALPHABETIC_SIZES])
    console.log('Talles cargados correctamente')
    process.exit()
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

seed()
