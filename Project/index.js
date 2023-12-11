const express = require('express');
const mysqldao = require('./Mysqldao');
const mongosao = require('./mongosao');
const app = express();
const bodyParser = require('body-parser');
const { ObjectId } = require('mongodb');
const { isValidObjectId } = require('mongoose'); // Import the isValidObjectId function

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs'); // Set EJS as the view engine

app.get('/products', (req, res) => {
    mysqldao.getUsers()
        .then((data) => {
            res.render('index', { Users: data });
        })
        .catch((error) => {
            res.send(error);
        });
});

app.get('/', (req, res) => {
    res.send("Homepage with links to: <a href='/stores'>Stores</a>, <a href='/managers'>Managers</a>, <a href='/products'>Products</a>");
});

app.get('/stores', (req, res) => {
    mysqldao.getStores()
        .then((data) => {
            res.render('stores', { stores: data });
        })
        .catch((error) => {
            res.send(error);
        });
    
});

// New route for rendering the "Add Store" page
app.get('/stores/add', (req, res) => {
    res.render('addStore');
});

// Route for handling the form submission to add a new store
// Route for handling the form submission to add a new store
app.post('/stores/add', async (req, res) => {
    const storeId = req.body.sid;
    const location = req.body.location;
    let managerId = req.body.mgrid;

    try {
        // Check if the store ID already exists
        const existingStoreWithId = await mysqldao.getStoreById(storeId);
        if (existingStoreWithId) {
            return res.status(400).send('Error: Store ID already exists');
        }

        // Check the length of the location
        if (location.length < 1) {
            return res.status(400).send('Error: Location should be a minimum of 1 character');
        }

        // Check the length of the manager ID
        const minManagerIdLength = 4;
        if (managerId.length !== minManagerIdLength) {
            return res.status(400).send(`Error: Manager ID should be ${minManagerIdLength} characters`);
        }

        // Check if the manager ID is assigned to another store
        const storeWithManagerId = await mysqldao.getStoreByManager(managerId);
        if (storeWithManagerId) {
            return res.status(400).send('Error: Manager ID is already assigned to another store');
        }

        // Check if the manager ID exists in MongoDB
        const existingManager = await mongosao.findManagerById(managerId);
        if (!existingManager) {
            return res.status(400).send('Error: Manager ID does not exist in MongoDB');
        }

        // Perform the insertion if all checks pass
        await mysqldao.addStore(storeId, location, managerId);
        res.redirect('/stores');
    } catch (error) {
        console.error('Error adding store:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Update route for rendering the "Update Store" page
app.get('/stores/update/:id', async (req, res) => {
    try {
        const store = await mysqldao.getStoreById(req.params.id);

        if (!store) {
            return res.status(404).send('Store not found');
        }

        res.render('updateStore', { store });
    } catch (error) {
        console.error('Error retrieving store for update:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Update route to handle the form submission for stores
app.post('/stores/update/:id', async (req, res) => {
    const storeId = req.params.id;
    const newmgrid = req.body.newmgrid;
    const newLocation = req.body.newLocation;

    try {
        const updateResult = await mysqldao.updateStore(storeId, newmgrid, newLocation);

        if (updateResult.error) {
            // Handle the error case, you can render an error page or redirect with an error message
            return res.status(400).send(updateResult.error);
        }

        // If there's no error, redirect to the stores page
        res.redirect('/stores');
    } catch (error) {
        console.error('Error updating store:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Delete route to handle the deletion of a store
app.post('/stores/delete/:id', async (req, res) => {
    const storeId = req.params.id;

    try {
        // Implement the logic to delete the store from the database
        await mysqldao.deleteStore(storeId);

        res.redirect('/stores'); // Redirect to the stores page after deletion
    } catch (error) {
        console.error('Error deleting store:', error);

        // Check if the error is related to a foreign key constraint
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            // Send a custom error message for foreign key constraint violation
            return res.status(500).send("Cannot delete the store because it is referenced in other records.");
        }

        // If it's not a foreign key constraint error, send a general error message
        res.status(500).send('Internal Server Error');
    }
});

// Example of defining the GET route for rendering the "Add Manager" page
app.get('/managers/add', (req, res) => {
    res.render('addForm'); // Make sure the view file exists and is correctly named
});

// Route for handling the form submission to add a new manager (MongoDB)
// Route for handling the form submission to add a new manager (MongoDB)
app.post('/managers/add', async (req, res) => {
    const managerId = req.body._id; 
    const name = req.body.name;
    const salary = parseInt(req.body.salary); // Parse salary as an integer

    try {
        // Check if the manager ID is unique
        const existingManager = await mongosao.findManagerById(managerId);
        if (existingManager) {
            return res.status(400).send('Error: Manager ID must be unique');
        }

        // Check the length of manager ID
        const minManagerIdLength = 4;
        if (!managerId || managerId.length !== minManagerIdLength) {
            return res.status(400).send(`Error: Manager ID must be ${minManagerIdLength} characters in length`);
        }

        // Check the length of name
        const minNameLength = 4;
        if (!name || name.length <= minNameLength) {
            return res.status(400).send(`Error: Name must be more than ${minNameLength} characters`);
        }

        // Check the salary range
        const minSalary = 30000;
        const maxSalary = 70000;
        if (isNaN(salary) || salary < minSalary || salary > maxSalary) {
            return res.status(400).send(`Error: Salary must be between ${minSalary} and ${maxSalary}`);
        }

        // Perform the insertion if all checks pass
        await mongosao.addManager(managerId, name, salary);
        res.redirect('/managers');
    } catch (error) {
        console.error('Error adding manager:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/managers', (req, res) => {
    mongosao.findAll()
        .then((documents) => {
            res.render('managers', { managers: documents });
        })
        .catch((error) => {
            console.error('Error retrieving managers:', error);
            res.status(500).send('Error retrieving managers');
        });
});

app.get('/managers/update/:id', async (req, res) => {
    try {
        const managerId = req.params.id;
        const manager = await mongosao.findManagerById(managerId);

        // Render the update form with manager data
        res.render('updateForm', { manager });
    } catch (error) {
        console.error('Error rendering update form:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Update route to handle the form submission for managers
app.post('/managers/update', async (req, res) => {
    const managerId = req.body.managerId;
    const newName = req.body.newName;
    const newSalary = parseInt(req.body.newSalary); // Parse new salary as an integer

    try {
        // Update the manager's information in MongoDB
        await mongosao.updateManager(managerId, newName, newSalary);
        res.redirect('/managers');
    } catch (error) {
        console.error('Error updating manager:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Delete route to handle the deletion of a manager
app.post('/managers/update/:id', async (req, res) => {
    const managerId = req.params.id; // Use the manager ID from the URL
    const newName = req.body.newName;
    const newSalary = parseInt(req.body.newSalary); // Parse new salary as an integer

    try {
        // Update the manager's information in MongoDB
        await mongosao.updateManager(managerId, newName, newSalary);
        res.redirect('/managers');
    } catch (error) {
        console.error('Error updating manager:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle the deletion of a product
app.get('/products/delete/:pid', async (req, res) => {
    const productId = req.params.pid;

    try {
        // Check if the product is in any store
        const productInStore = await mysqldao.isProductInStore(productId);

        if (productInStore) {
            // If the product is in a store, display an error message
            return res.status(400).send("<h1 style='font-weight: bold;'>Error Message <br><br><br><br> Cannot delete product " + productId + " because it is currently in stores.</h1><br> <a href='/'>Home</a>");
        }

        // If the product is not in any store, proceed with deletion
        await mysqldao.deleteProduct(productId);

        // Redirect to the products page after successful deletion
        res.redirect('/products');
    } catch (error) {
        console.error('Error deleting product:', error);

        // Handle other errors accordingly
        res.status(500).send('Internal Server Error');
    }
});

app.listen(3000, () => console.log('Example app is listening on port 3000.'));
