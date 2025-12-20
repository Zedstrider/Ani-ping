const express=require('express') //include external modules
const app=express()

const PORT = 5501

app.listen(PORT,()=>{console.log(`Server is running on port ${PORT}`)})

app.get('/',(req,res)=>{
    res.send(`<p>Ani-Ping is online!</p>`)
})