const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb');

let db;
let coll;

MongoClient.connect('mongodb://localhost:27017')
  .then((client) => {
    db = client.db('proj2023MongoDB');
    coll = db.collection('managers');
  })
  .catch((error) => {
    console.log(error.message);
  });

var findAll = function() {
  return new Promise((resolve, reject) => {
    var cursor = coll.find();
    cursor.toArray()
      .then((documents) => {
        resolve(documents);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

async function deleteManager(managerId) {
    const managersCollection = db.collection('managers');

    try {
        const result = await managersCollection.deleteOne({ _id: new ObjectId(managerId) });
        console.log('Manager deleted:', result.deletedCount);
    } catch (error) {
        console.error('Error deleting manager from MongoDB:', error);
        throw error;
    }
}


async function updateManager(managerId, newName, newSalary) {
  const managersCollection = db.collection('managers');

  try {
      const result = await managersCollection.updateOne(
          { _id: new ObjectId(managerId) }, // Use ObjectId
          { $set: { name: newName, salary: newSalary } },
          { upsert: true }
      );

      console.log('Manager updated:', result.modifiedCount);
      return result.modifiedCount; // Return the number of modified documents
  } catch (error) {
      console.error('Error updating manager in MongoDB:', error);
      throw error;
  }
}

async function addManager(_id, name, salary) {
  try {
      // Check if the manager ID already exists
      const existingManager = await findManagerById(_id);
      if (existingManager) {
          throw new Error('Manager ID already exists');
      }

      // Perform the insertion if the data doesn't exist
      const result = await coll.insertOne({ _id, name, salary });
      console.log('Manager added with ID:', result.insertedId);
      return result.insertedId; // Return the inserted ID if needed
  } catch (error) {
      console.error('Error adding manager to MongoDB:', error.message);
      throw error;
  }
}

async function findManagerById(_id) { // Change parameter name to _id
  try {
      const manager = await coll.findOne({ _id });
      if (!manager) {
          console.error(`Manager with ID ${_id} not found`);
          return null; // Return null when manager is not found
      }
      return manager;
  } catch (error) {
      console.error('Error fetching manager from MongoDB:', error.message);
      throw error;
  }
}


module.exports = { addManager, findAll, deleteManager, updateManager, findManagerById };
