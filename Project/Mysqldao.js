var pmysql = require('promise-mysql')

var pool

pmysql.createPool(
    {
        connectionLimit : 3,
        host : 'localhost',
        user : 'root',
        password : 'root',
        database : 'proj2023'
    })
    .then(p => 
       {
            pool = p
        })
    .catch(e => 
        {
            console.log("pool error:" + e)
        })

var getUsers = function()
{
    return new Promise((resolve, reject)=>
    {
        pool.query('SELECT ps.productdesc, p.pid, l.sid, l.location, p.Price, ps.supplier FROM product_store p JOIN store l ON p.sid = l.sid JOIN product ps ON p.pid = ps.pid;')
            .then((data) => {
                resolve(data)
                console.log(data)
            })
            .catch(error => {
                reject(error)
                console.log(error)
            })

    })
    
}

var getStores = function()
{
    return new Promise((resolve, reject)=>
    {
        pool.query('SELECT * FROM store')
            .then((data) => {
                resolve(data)
                console.log(data)
            })
            .catch(error => {
                reject(error)
                console.log(error)
            })

    })   
}

// New function to add a store
var addStore = function (sid, location, mgrid) 
{
    return new Promise((resolve, reject) => {
        console.log('Adding store:', sid, location, mgrid); // Log the input values
        pool.query('INSERT INTO store (sid, location, mgrid) VALUES (?, ?, ?)', [sid, location, mgrid])
            .then((result) => {
                // Assuming you want to return the ID of the newly added store
                resolve({ storeId: result.insertId });
                console.log('Store added successfully:', result);
            })
            .catch((error) => {
                reject(error);
                console.error('Error adding store:', error);
            });
    });
}

async function updateStore(storeId, newmgrid, newLocation) {
    try {
        // Check if the new data already exists in the database
        const existingStore = await getStoreByManagerAndLocation(newmgrid, newLocation);

        if (existingStore && existingStore.sid !== storeId) {
            // Send a custom error message for data already exists
            return { error: 'Error: Data already exists' };
        }

        // Perform the update if the data doesn't exist
        const query = 'UPDATE store SET mgrid = ?, location = ? WHERE sid = ?';
        const values = [newmgrid, newLocation, storeId];
        const result = await pool.query(query, values);

        return result;
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') 
        {
            // Handle duplicate entry error
            return { 
                error: `<ul>
                           <li>Manager ID: ${newmgrid} is already managing another store.</li>
                       </ul>`
            };
        }

        console.error('Error updating store:', error);
        throw error;
    }
}

async function getStoreById(storeId) {
    const query = 'SELECT * FROM store WHERE sid = ?';
    const result = await pool.query(query, [storeId]);
    return result.length > 0 ? result[0] : null;
}

// Method to check if a store with the given manager ID and location exists
async function getStoreByManagerAndLocation(managerId, location) {
    const query = 'SELECT * FROM store WHERE mgrid = ? AND location = ?';
    const values = [managerId, location];

    try {
        const result = await pool.query(query, values);
        return result.length > 0 ? result[0] : null;
    } catch (error) {
        throw error;
    }
}

async function deleteStore(storeId) {
    try {
        const result = await pool.query('DELETE FROM store WHERE sid = ?', [storeId]);
        return result;
    } catch (error) {
        console.error('Error deleting store:', error);
        throw error;
    }
}

// Method to check if a product is in any store
async function isProductInStore(productId) {
    const query = 'SELECT COUNT(*) as count FROM product_store WHERE pid = ?';
    const values = [productId];

    try {
        const result = await pool.query(query, values);
        return result[0].count > 0;
    } catch (error) {
        console.error('Error checking if product is in store:', error);
        throw new Error('Failed to check if product is in store');
    }
}

async function getStoreByManager(managerId) {
    try {
        const query = 'SELECT * FROM store WHERE mgrid = ?';
        const result = await pool.query(query, [managerId]);
        return result[0];
    } catch (error) {
        console.error('Error in getStoreByManager:', error);
        throw error;
    }
}



module.exports = { getUsers, getStores, addStore, updateStore, getStoreById, getStoreByManagerAndLocation, deleteStore, isProductInStore, getStoreByManager};
    