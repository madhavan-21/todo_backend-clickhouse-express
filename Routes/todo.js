const express = require('express');
const router = express.Router();
const { ClickHouse } = require('clickhouse');
const clickhouse = new ClickHouse({
    url: 'http://localhost',
    port: 8123,
    debug: false,
  });


router.get('/todos', (req, res) => {
    const rows = [];

    clickhouse.query('SELECT * FROM sampletable').stream()
        .on('data', (row) => {
            rows.push(row);
        })
        .on('error', (err) => {
            console.error(err);
            res.status(500).send('Error fetching user details');
        })  
        .on('end', () => {
            res.json(rows); // Send all rows as a single response
        });
});

//post data into db
router.post('/todospost', async (req, res) => {
    const { user_id, message ,timestamp ,metric } = req.body;
    console.log(timestamp)

    if(!user_id){
       res.status(404).send('user id not found')
    }else{

    await clickhouse.query(`INSERT INTO sampletable (user_id, message , timestamp , metric ) VALUES (${user_id}, '${message}',${timestamp},${metric})`)
      .toPromise()
      .then(() => {
        console.log(timestamp)
        res.status(201).send('user info created successfully');
        console.log("created")
      })
      .catch((err) => {
        console.log("err")
        console.error(err);
        res.status(500).send('Error creating user info');
      });
    }
  });

//delete data in db
router.delete('/todosdelete/:user_id', (req, res) => {
  const user_id = req.params.user_id;

  // Check if the user_id exists in the sampletable
  clickhouse.query(`SELECT 1 FROM sampletable WHERE user_id = '${user_id}' LIMIT 1`)
      .toPromise()
      .then((result) => {
          if (result.length > 0) {
              // User ID exists, proceed with deletion
              clickhouse.query(`DELETE FROM sampletable WHERE user_id = '${user_id}'`)
                  .toPromise()
                  .then(() => {
                      res.status(200).send('Todo deleted successfully');
                  })
                  .catch((err) => {
                      console.error(err);
                      res.status(500).send('Error deleting todo');
                  });
          } else {
              // User ID does not exist, send 404 Not Found response
              res.status(404).send('User ID does not exist');
          }
      })
      .catch((err) => {
          console.error(err);
          res.status(500).send('Error checking user ID');
      });
});

//update data from db
router.put('/todosupdate/:user_id', async (req, res) => {
  const user_id = req.params.user_id;
  const {  message, metric } = req.body;

  try {
      // Check if the todo exists
     // Update the todo
    let updateQuery = `ALTER TABLE sampletable UPDATE `;
    if (message) {
      updateQuery += `message = '${message}'`;
    }
    if (message && metric) {
      updateQuery += ', ';
    }
    if (metric) {
      updateQuery += `metric = ${metric}`;
    }
    updateQuery += ` WHERE user_id = ${user_id}`;

    await clickhouse.query(updateQuery).toPromise();
    res.status(200).json({ message: 'User info updated successfully' });
  } catch (error) {
      console.error('user info updating todo:', error);
      res.status(500).json({ error: 'user info updating todo error' });
  }
});
// getting avg of metric
router.get('/avg', async (req, res) => {
    try {
        // Execute ClickHouse query to calculate average metric
        const result = await clickhouse.query('SELECT avg(metric) AS avg_metric FROM sampletable').toPromise();
             console.log(result)
        // Extract the average metric value from the result
        const avgMetric = result[0].avg_metric;

        // Double the average metric value
        const doubledAvgMetric = avgMetric * 2;

        // Log the result to the console for debugging
        console.log(`Original average: ${avgMetric}, Doubled average: ${doubledAvgMetric}`);

        // Send both the normal and doubled average values back to the client as JSON response
        res.status(200).json({
            avg: avgMetric,
            doubled_avg: doubledAvgMetric
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Error getting or doubling average"
        });
    }
});

 // getting indiviual user message

 router.get('/messages/:user_id', async (req, res) => {
    try {
        const user_id = req.params.user_id;

        // Check if the user exists in the sampletable
        const userExistsResult = await clickhouse.query(`SELECT 1 FROM sampletable WHERE user_id = '${user_id}' LIMIT 1`).toPromise();
        const userExists = userExistsResult.length > 0;

        if (!userExists) {
            // User does not exist, send a 404 Not Found response
            return res.status(404).json({
                error: "User not found"
            });
        }

        // Execute ClickHouse query to fetch messages for the specified user_id
        const result = await clickhouse.query(`SELECT message FROM sampletable WHERE user_id = '${user_id}'`).toPromise();
           const singlearray = result.map(obj=>obj.message)

        console.log(singlearray)
      

        // Send the messages back to the client as a JSON array
        res.status(200).json(singlearray);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Error getting user messages"
        });
    }
});


module.exports = router;