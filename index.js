const express  = require('express');
const { ClickHouse } = require('clickhouse');
const app = express();
const port = 8000;
const todoRoutes = require("./Routes/todo")

app.use(express.json());


app.listen(port,()=>{
    console.log("server is running");
})

const clickhouse = new ClickHouse({
    url: 'http://localhost',
    port: 8123,
    debug: false,
  });

app.use('/todo',todoRoutes);
app.get('/',(req,res)=>{
    console.log("hello world");
})